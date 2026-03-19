const Booking = require("../models/Booking");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const getAssignedBookingsQuery = (userId) => ({ manager_id: userId });

const hasAssignments = (booking) => Array.isArray(booking.staff_assignments) && booking.staff_assignments.length > 0;

exports.getSummary = asyncHandler(async (req, res) => {
  const query = getAssignedBookingsQuery(req.user._id);
  const bookings = await Booking.find(query).select("status staff_assignments event_date customer_id").populate("customer_id");

  const pending = bookings.filter((b) => b.status === "active" && !hasAssignments(b));
  const upcoming = bookings.filter((b) => b.status === "active" && hasAssignments(b));
  const completed = bookings.filter((b) => b.status === "completed");

  const calendarEvents = upcoming
    .filter((b) => b.event_date)
    .map((b) => ({
      id: b._id,
      date: b.event_date,
      customer: b.customer_id?.full_name || "Customer"
    }));

  res.json({
    counts: {
      pending: pending.length,
      upcoming: upcoming.length,
      completed: completed.length
    },
    quickActions: {
      pending: pending.slice(0, 3),
      upcoming: upcoming.slice(0, 3)
    },
    calendarEvents
  });
});

exports.getBookings = asyncHandler(async (req, res) => {
  const query = getAssignedBookingsQuery(req.user._id);
  const bookings = await Booking.find(query).populate("customer_id package_id manager_id staff_ids inquiry_id");

  const status = String(req.query.status || "").toLowerCase();
  if (!status) return res.json(bookings);

  if (status === "pending") {
    return res.json(bookings.filter((b) => b.status === "active" && !hasAssignments(b)));
  }

  if (status === "upcoming") {
    return res.json(bookings.filter((b) => b.status === "active" && hasAssignments(b)));
  }

  if (status === "completed") {
    return res.json(bookings.filter((b) => b.status === "completed"));
  }

  return res.json(bookings);
});

exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("customer_id package_id manager_id staff_ids inquiry_id")
    .populate("staff_assignments.user_id staff_reports.staff_id equipment_returns.verified_by");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (req.user.role !== "admin" && String(booking.manager_id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  res.json(booking);
});

exports.assignStaff = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const staffAssignments = Array.isArray(req.body.staff_assignments)
    ? req.body.staff_assignments
    : [];

  booking.staff_assignments = staffAssignments;
  booking.staff_ids = staffAssignments
    .map((assignment) => assignment.user_id)
    .filter(Boolean);

  if (!booking.manager_id) {
    booking.manager_id = req.user._id;
  }

  await booking.save();
  res.json(await booking.populate("customer_id package_id manager_id staff_ids inquiry_id"));
});

exports.addManagerNote = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const note = String(req.body.note || "").trim();
  if (!note) return res.status(400).json({ message: "Note is required" });

  booking.manager_notes = booking.manager_notes || [];
  booking.manager_notes.push({ note });

  await booking.save();
  res.json(booking.manager_notes);
});

exports.updateEquipment = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const name = String(req.body.name || "").trim();
  const returned = Boolean(req.body.returned);

  if (!name) return res.status(400).json({ message: "Item name is required" });

  booking.equipment_returns = booking.equipment_returns || [];
  const existing = booking.equipment_returns.find((item) => item.name === name);

  if (existing) {
    existing.returned = returned;
    existing.verified_at = returned ? new Date() : null;
    existing.verified_by = returned ? req.user._id : null;
  } else {
    booking.equipment_returns.push({
      name,
      returned,
      verified_at: returned ? new Date() : null,
      verified_by: returned ? req.user._id : null
    });
  }

  await booking.save();
  res.json(booking.equipment_returns);
});

exports.markCompleted = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  booking.status = "completed";
  booking.completed_at = new Date();

  await booking.save();
  res.json(booking);
});

exports.getStaffList = asyncHandler(async (req, res) => {
  const staff = await User.find({ role: { $in: ["staff"] }, is_active: true }).select("full_name role email phone");

  const staffIds = staff.map((person) => person._id);
  const bookings = await Booking.find({
    status: "active",
    staff_ids: { $in: staffIds }
  }).select("staff_ids event_date");

  const counts = staffIds.reduce((acc, id) => {
    acc[String(id)] = 0;
    return acc;
  }, {});

  bookings.forEach((booking) => {
    booking.staff_ids.forEach((id) => {
      const key = String(id);
      if (counts[key] !== undefined) counts[key] += 1;
    });
  });

  res.json(
    staff.map((person) => ({
      ...person.toObject(),
      upcoming_count: counts[String(person._id)] || 0
    }))
  );
});

exports.getStaffCalendar = asyncHandler(async (req, res) => {
  const staffId = req.params.id;
  const month = String(req.query.month || "").trim();

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ message: "Month must be YYYY-MM" });
  }

  const [year, monthIndex] = month.split("-").map((value) => Number(value));
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0, 23, 59, 59, 999);

  const bookings = await Booking.find({
    staff_ids: staffId,
    event_date: { $gte: start, $lte: end }
  }).select("event_date status");

  res.json({
    month,
    assignments: bookings.map((booking) => ({
      date: booking.event_date,
      status: booking.status
    }))
  });
});
