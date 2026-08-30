const User = require("../models/User");
const Booking = require("../models/Booking");
const StaffAvailability = require("../models/StaffAvailability");
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
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

exports.getSummary = asyncHandler(async (req, res) => {
  const managerId = req.user._id;

  const bookings = await Booking.find({ event_manager_id: managerId })
    .populate("customer_id", "full_name first_name last_name email phone")
    .sort({ event_date: 1 })
    .lean();

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let pendingCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;

  const pendingList = [];
  const upcomingList = [];
  const calendarEvents = [];

  bookings.forEach((b) => {
    const isCompleted = ["Completed", "completed"].includes(b.status);
    const isCancelled = ["Cancelled", "cancelled", "refunded"].includes(b.status);
    const hasStaff = Array.isArray(b.staff_assignments) && b.staff_assignments.length > 0;

    const customerName = b.customer_id?.full_name 
      || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() 
      || "Customer";

    if (!isCancelled) {
      calendarEvents.push({
        id: b._id,
        customer: customerName,
        event_type: b.event_type,
        date: b.event_date,
        status: b.status,
        venue: b.venue_type || b.municipality || "Venue"
      });
    }

    if (isCompleted) {
      if (b.event_date && new Date(b.event_date) >= startOfThisMonth && new Date(b.event_date) <= endOfThisMonth) {
        completedCount += 1;
      }
    } else if (!isCancelled) {
      if (!hasStaff) {
        pendingCount += 1;
        if (pendingList.length < 5) pendingList.push(b);
      } else {
        upcomingCount += 1;
        if (upcomingList.length < 5) upcomingList.push(b);
      }
    }
  });

  res.json({
    counts: {
      pending: pendingCount,
      upcoming: upcomingCount,
      completed: completedCount
    },
    quickActions: {
      pending: pendingList,
      upcoming: upcomingList
    },
    calendarEvents
  });
});

exports.getAvailability = asyncHandler(async (req, res) => {
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
      event_manager_id: req.user._id,
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

exports.setAvailability = asyncHandler(async (req, res) => {
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

exports.getBookings = asyncHandler(async (req, res) => {
  const managerId = req.user._id;
  const statusTab = String(req.query.status || "").toLowerCase();

  const query = { event_manager_id: managerId };

  if (statusTab === "completed") {
    query.status = { $in: ["Completed", "completed"] };
  } else if (statusTab === "upcoming") {
    query.status = { $nin: ["Completed", "completed", "Cancelled", "cancelled", "refunded"] };
    query["staff_assignments.0"] = { $exists: true };
  } else if (statusTab === "pending") {
    query.status = { $nin: ["Completed", "completed", "Cancelled", "cancelled", "refunded"] };
    query["staff_assignments.0"] = { $exists: false };
  }

  const bookings = await Booking.find(query)
    .populate("customer_id", "full_name first_name last_name email phone")
    .populate("package_id", "name price")
    .populate("staff_assignments.user_id", "full_name email phone position")
    .populate("inventory_items.inventory_id", "name item_name category")
    .sort({ event_date: statusTab === "completed" ? -1 : 1 })
    .lean();

  res.json(bookings);
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  })
    .populate("customer_id", "full_name first_name last_name email phone address")
    .populate("package_id")
    .populate("staff_assignments.user_id", "full_name email phone position role")
    .populate("inventory_items.inventory_id")
    .populate("equipment_returns.inventory_id")
    .populate("equipment_returns.verified_by", "full_name role")
    .populate("equipment_manager_verified.confirmed_by", "full_name role");

  if (!booking) {
    return res.status(404).json({ message: "Booking not found or not assigned to you" });
  }

  res.json(booking);
});

exports.assignStaff = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found or not assigned to you" });
  }

  const { staff_assignments } = req.body;
  if (!Array.isArray(staff_assignments)) {
    return res.status(400).json({ message: "staff_assignments must be an array" });
  }

  booking.staff_assignments = staff_assignments;

  // If status is Deposit Pending or Confirmed, update to Ready for Event only for upcoming events
  const isPastEvent = booking.event_date && new Date(booking.event_date) < new Date();
  if (!isPastEvent && ["pending deposit", "Deposit Pending", "Confirmed", "confirmed"].includes(booking.status)) {
    booking.status = "Ready for Event";
  }

  await booking.save();

  const populated = await Booking.findById(booking._id)
    .populate("customer_id", "full_name email phone")
    .populate("staff_assignments.user_id", "full_name email phone position");

  res.json({ message: "Staff assigned successfully", booking: populated });
});

exports.addNote = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const { note } = req.body;
  if (!note || !note.trim()) {
    return res.status(400).json({ message: "Note is required" });
  }

  if (!Array.isArray(booking.event_manager_notes)) {
    booking.event_manager_notes = [];
  }

  booking.event_manager_notes.push({
    note: note.trim(),
    created_at: new Date()
  });

  await booking.save();
  res.json(booking.event_manager_notes);
});

exports.updateEquipment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const { inventory_items } = req.body;
  if (Array.isArray(inventory_items)) {
    booking.inventory_items = inventory_items;
    await booking.save();
  }

  res.json({ message: "Equipment updated", inventory_items: booking.inventory_items });
});

exports.verifyEquipment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found or not assigned to you" });
  }

  const { confirmed, additional_notes } = req.body;
  const isConfirmed = Boolean(confirmed);

  booking.equipment_manager_verified = {
    confirmed: isConfirmed,
    confirmed_by: req.user._id,
    confirmed_at: isConfirmed ? new Date() : null,
    additional_notes: typeof additional_notes === "string" ? additional_notes.trim() : ""
  };

  await booking.save();

  const populated = await Booking.findById(booking._id)
    .populate("equipment_manager_verified.confirmed_by", "full_name role");

  res.json({
    message: isConfirmed ? "Equipment confirmed and verified by manager" : "Equipment verification updated",
    equipment_manager_verified: populated.equipment_manager_verified
  });
});

exports.markCompleted = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  booking.status = "Completed";
  booking.completed_at = new Date();
  await booking.save();

  res.json({ message: "Booking marked as completed", booking });
});

exports.getStaff = asyncHandler(async (req, res) => {
  const staff = await User.find({ role: "staff", is_active: true }).lean();
  const staffIds = staff.map((s) => s._id);

  const now = new Date();
  const upcomingAssignments = await Booking.aggregate([
    {
      $match: {
        "staff_assignments.user_id": { $in: staffIds },
        event_date: { $gte: now },
        status: { $nin: ["Cancelled", "cancelled", "refunded", "Completed", "completed"] }
      }
    },
    { $unwind: "$staff_assignments" },
    { $match: { "staff_assignments.user_id": { $in: staffIds } } },
    { $group: { _id: "$staff_assignments.user_id", count: { $sum: 1 } } }
  ]);

  const upcomingMap = new Map(upcomingAssignments.map((item) => [String(item._id), item.count]));

  // If event_date query is provided, check availability on that date
  let unavailableSet = new Set();
  let bookedStaffSet = new Set();

  if (req.query.event_date) {
    const eventDate = new Date(req.query.event_date);
    const startOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const endOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);

    const [unavailabilities, bookedEvents] = await Promise.all([
      StaffAvailability.find({
        user_id: { $in: staffIds },
        date: { $gte: startOfDay, $lte: endOfDay }
      }).select("user_id"),
      Booking.find({
        "staff_assignments.user_id": { $in: staffIds },
        event_date: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["Cancelled", "cancelled", "refunded"] }
      }).select("staff_assignments")
    ]);

    unavailableSet = new Set(unavailabilities.map((u) => String(u.user_id)));
    bookedEvents.forEach((b) => {
      if (Array.isArray(b.staff_assignments)) {
        b.staff_assignments.forEach((sa) => {
          if (sa.user_id) bookedStaffSet.add(String(sa.user_id));
        });
      }
    });
  }

  const result = staff.map((member) => {
    const idStr = String(member._id);
    const isUnavailable = unavailableSet.has(idStr);
    const isBooked = bookedStaffSet.has(idStr);

    return {
      ...member,
      upcoming_count: upcomingMap.get(idStr) || 0,
      is_available: req.query.event_date ? (!isUnavailable && !isBooked) : true,
      availability_status: isUnavailable ? "Unavailable" : isBooked ? "Booked" : "Available"
    };
  });

  res.json(result);
});

exports.getStaffCalendar = asyncHandler(async (req, res) => {
  const staffId = req.params.id;
  const month = String(req.query.month || "").trim();
  const range = parseMonth(month);

  if (!range) {
    return res.status(400).json({ message: "Month must be YYYY-MM" });
  }

  const [availability, assignments] = await Promise.all([
    StaffAvailability.find({
      user_id: staffId,
      date: { $gte: range.start, $lte: range.end }
    }).select("date"),
    Booking.find({
      "staff_assignments.user_id": staffId,
      event_date: { $gte: range.start, $lte: range.end },
      status: { $nin: ["Cancelled", "cancelled", "refunded"] }
    })
      .populate("customer_id", "full_name first_name last_name")
      .select("event_date event_type reference status customer_id")
  ]);

  res.json({
    month,
    unavailable: availability.map((item) => toDateKey(item.date)),
    assignments: assignments.map((booking) => {
      const custName = booking.customer_id?.full_name 
        || `${booking.customer_id?.first_name || ""} ${booking.customer_id?.last_name || ""}`.trim() 
        || "Customer";
      return {
        date: booking.event_date,
        event_type: booking.event_type,
        reference: booking.reference || String(booking._id).slice(-6).toUpperCase(),
        customer_name: custName,
        status: booking.status
      };
    })
  });
});
