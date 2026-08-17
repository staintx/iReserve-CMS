const User = require("../models/User");
const Booking = require("../models/Booking");
const StaffAvailability = require("../models/StaffAvailability");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asyncHandler");

const parseMonth = (month) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthIndex] = month.split("-").map((value) => Number(value));
  return {
    start: new Date(year, monthIndex - 1, 1),
    end: new Date(year, monthIndex, 0, 23, 59, 59, 999)
  };
};

const parseDateKey = (value) => {
  const [year, monthIndex, day] = String(value).split("-").map((v) => Number(v));
  if (!year || !monthIndex || !day) return null;
  return new Date(year, monthIndex - 1, day);
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

exports.createStaff = asyncHandler(async (req, res) => {
  const { full_name, email, password, role, phone, username, position } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const staff = await User.create({ full_name, email, password: hashed, role, phone, username, position });
  res.status(201).json(staff);
});

exports.getAllStaff = asyncHandler(async (req, res) => {
  const staff = await User.find({ role: { $in: ["staff", "manager"] } }).lean();
  const staffIds = staff.map((s) => s._id);

  const eventsByStaff = await Booking.aggregate([
    { $match: { "staff_assignments.user_id": { $in: staffIds } } },
    { $unwind: "$staff_assignments" },
    { $match: { "staff_assignments.user_id": { $in: staffIds } } },
    { $group: { _id: "$staff_assignments.user_id", count: { $sum: 1 } } }
  ]);
  const eventsMap = new Map(eventsByStaff.map((e) => [String(e._id), e.count]));

  res.json(staff.map((member) => ({
    ...member,
    events_handled: eventsMap.get(String(member._id)) || 0
  })));
});

exports.updateStaff = asyncHandler(async (req, res) => {
  const updates = {
    full_name: req.body.full_name,
    email: req.body.email,
    role: req.body.role,
    is_active: req.body.is_active,
    phone: req.body.phone,
    username: req.body.username,
    position: req.body.position
  };

  if (req.body.password) {
    updates.password = await bcrypt.hash(req.body.password, 10);
  }

  const staff = await User.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });
  res.json(staff);
});

exports.removeStaff = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    "staff_assignments.user_id": req.user._id,
    status: { $nin: ["Cancelled", "cancelled", "refunded"] }
  })
    .populate("customer_id", "full_name first_name last_name email phone")
    .populate("event_manager_id", "full_name email phone")
    .populate("staff_assignments.user_id", "full_name email phone position role")
    .select("event_type event_date start_time duration_hours venue_type municipality street barangay status staff_assignments customer_id event_manager_id reference")
    .sort({ event_date: 1 });

  const status = String(req.query.status || "").toLowerCase();
  if (!status) return res.json(bookings);

  if (status === "active") {
    return res.json(
      bookings.filter((b) =>
        ["pending deposit", "Deposit Pending", "confirmed", "Confirmed", "preparing", "ongoing", "Ready for Event"].includes(b.status)
      )
    );
  }

  if (status === "completed") {
    return res.json(bookings.filter((b) => ["Completed", "completed"].includes(b.status)));
  }

  return res.json(bookings);
});

exports.getMyBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    "staff_assignments.user_id": req.user._id
  })
    .populate("customer_id", "full_name first_name last_name email phone address")
    .populate("event_manager_id", "full_name email phone")
    .populate("staff_assignments.user_id", "full_name email phone position role")
    .populate("inventory_items.inventory_id")
    .populate("equipment_returns.inventory_id")
    .populate("package_id");

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  res.json(booking);
});

exports.submitReport = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    "staff_assignments.user_id": req.user._id
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  const { note, role } = req.body;
  if (!note || !note.trim()) {
    return res.status(400).json({ message: "Report note is required" });
  }

  if (!Array.isArray(booking.staff_reports)) {
    booking.staff_reports = [];
  }

  booking.staff_reports.push({
    staff_id: req.user._id,
    role: role || "Staff",
    note: note.trim(),
    created_at: new Date()
  });

  await booking.save();
  res.json({ message: "Report submitted successfully", staff_reports: booking.staff_reports });
});

exports.submitEquipmentReturns = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    "staff_assignments.user_id": req.user._id
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  const { returns, note } = req.body;

  if (!Array.isArray(booking.equipment_returns) || booking.equipment_returns.length === 0) {
    booking.equipment_returns = (booking.inventory_items || []).map((item) => ({
      inventory_id: item.inventory_id,
      name: item.name,
      quantity_booked: item.quantity || 1,
      quantity_returned: item.quantity || 1,
      verified_at: new Date(),
      verified_by: req.user._id
    }));
  }

  if (Array.isArray(returns)) {
    returns.forEach((ret) => {
      const item = booking.equipment_returns.find(
        (eq) => String(eq.inventory_id) === String(ret.inventory_id) || String(eq._id) === String(ret._id)
      );
      if (item) {
        item.quantity_returned = Math.max(0, Number(ret.quantity_returned || 0));
        item.verified_at = new Date();
        item.verified_by = req.user._id;
      }
    });
  }

  if (note && note.trim()) {
    if (!Array.isArray(booking.staff_reports)) booking.staff_reports = [];
    booking.staff_reports.push({
      staff_id: req.user._id,
      role: "Equipment Verification",
      note: note.trim(),
      created_at: new Date()
    });
  }

  await booking.save();

  const updated = await Booking.findById(booking._id).populate("equipment_returns.inventory_id");
  res.json({ message: "Equipment returns updated successfully", equipment_returns: updated.equipment_returns });
});

exports.completeEvent = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    "staff_assignments.user_id": req.user._id
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  if (req.body.note && req.body.note.trim()) {
    if (!Array.isArray(booking.staff_reports)) booking.staff_reports = [];
    booking.staff_reports.push({
      staff_id: req.user._id,
      role: req.body.role || "Staff",
      note: req.body.note.trim(),
      created_at: new Date()
    });
  }

  if (Array.isArray(req.body.returns)) {
    if (!Array.isArray(booking.equipment_returns) || booking.equipment_returns.length === 0) {
      booking.equipment_returns = (booking.inventory_items || []).map((item) => ({
        inventory_id: item.inventory_id,
        name: item.name,
        quantity_booked: item.quantity || 1,
        quantity_returned: item.quantity || 1,
        verified_at: new Date(),
        verified_by: req.user._id
      }));
    }

    req.body.returns.forEach((ret) => {
      const item = booking.equipment_returns.find(
        (eq) => String(eq.inventory_id) === String(ret.inventory_id) || String(eq._id) === String(ret._id)
      );
      if (item) {
        item.quantity_returned = Math.max(0, Number(ret.quantity_returned || 0));
        item.verified_at = new Date();
        item.verified_by = req.user._id;
      }
    });
  }

  booking.status = "Completed";
  booking.completed_at = new Date();
  await booking.save();

  res.json({ message: "Event completed successfully", booking });
});

exports.getMyAvailability = asyncHandler(async (req, res) => {
  const month = String(req.query.month || "").trim();
  const range = parseMonth(month);

  if (!range) {
    return res.status(400).json({ message: "Month must be YYYY-MM" });
  }

  const [availability, assignments] = await Promise.all([
    StaffAvailability.find({
      user_id: req.user._id,
      date: { $gte: range.start, $lte: range.end }
    }).select("date"),
    Booking.find({
      "staff_assignments.user_id": req.user._id,
      event_date: { $gte: range.start, $lte: range.end },
      status: { $nin: ["Cancelled", "cancelled", "refunded"] }
    }).select("event_date status")
  ]);

  res.json({
    month,
    unavailable: availability.map((item) => toDateKey(item.date)),
    assignments: assignments.map((booking) => ({
      date: booking.event_date,
      status: booking.status
    }))
  });
});

exports.setMyAvailability = asyncHandler(async (req, res) => {
  const month = String(req.body.month || "").trim();
  const range = parseMonth(month);

  if (!range) {
    return res.status(400).json({ message: "Month must be YYYY-MM" });
  }

  const rawDates = Array.isArray(req.body.dates) ? req.body.dates : [];
  const uniqueDates = Array.from(new Set(rawDates.map((value) => String(value))));
  const parsedDates = uniqueDates
    .map(parseDateKey)
    .filter((date) => date && date >= range.start && date <= range.end);

  await StaffAvailability.deleteMany({
    user_id: req.user._id,
    date: { $gte: range.start, $lte: range.end }
  });

  if (parsedDates.length > 0) {
    await StaffAvailability.insertMany(
      parsedDates.map((date) => ({
        user_id: req.user._id,
        date
      }))
    );
  }

  res.json({
    month,
    unavailable: parsedDates.map((date) => toDateKey(date))
  });
});