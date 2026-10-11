const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
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
  return new Date(Date.UTC(year, monthIndex - 1, day, 12, 0, 0));
};

const toDateKey = (date) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRangeList = (startDateStr, endDateStr) => {
  const dates = [];
  const start = parseDateKey(startDateStr);
  const end = parseDateKey(endDateStr);
  if (!start || !end) return dates;
  const curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

exports.getSummary = asyncHandler(async (req, res) => {
  const managerId = req.user._id;

  const bookings = await Booking.find({ event_manager_id: managerId })
    .populate("customer_id", "full_name first_name last_name email phone")
    .sort({ event_date: 1 })
    .lean();

  let assignedCount = 0;
  let completedCount = 0;

  const upcomingList = [];
  const calendarEvents = [];

  bookings.forEach((b) => {
    const isCompleted = ["Completed", "completed"].includes(b.status);
    const isCancelled = ["Cancelled", "cancelled", "refunded"].includes(b.status);

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
      completedCount += 1;
    } else if (!isCancelled) {
      assignedCount += 1;
      upcomingList.push(b);
    }
  });

  res.json({
    counts: {
      assigned: assignedCount,
      upcoming: assignedCount,
      completed: completedCount,
      pending: 0
    },
    quickActions: {
      pending: [],
      upcoming: upcomingList.slice(0, 10)
    },
    calendarEvents
  });
});

exports.getAvailability = asyncHandler(async (req, res) => {
  const month = String(req.query.month || "").trim();
  const range = month ? parseMonth(month) : null;

  const dateFilter = { user_id: req.user._id };
  if (range) {
    dateFilter.date = { $gte: range.start, $lte: range.end };
  } else if (req.query.upcoming === "true") {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    dateFilter.date = { $gte: today };
  }

  const [availability, assignments] = await Promise.all([
    StaffAvailability.find(dateFilter).sort({ date: 1 }).select("date reason"),
    Booking.find({
      event_manager_id: req.user._id,
      ...(range ? { event_date: { $gte: range.start, $lte: range.end } } : {}),
      status: { $nin: ["Cancelled", "cancelled", "refunded"] }
    }).select("event_date status")
  ]);

  res.json({
    month: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    unavailable: availability.map((item) => toDateKey(item.date)),
    records: availability.map((item) => ({
      _id: item._id,
      date: toDateKey(item.date),
      reason: item.reason || ""
    })),
    assignments: assignments.map((booking) => ({
      date: booking.event_date,
      status: booking.status
    }))
  });
});

exports.setAvailability = asyncHandler(async (req, res) => {
  const { date, startDate, endDate, dates, reason, month } = req.body;
  const reasonText = typeof reason === "string" ? reason.trim() : "";

  if ((date || (startDate && endDate)) && !reasonText) {
    return res.status(400).json({ message: "Reason / Notes is required for recording unavailability." });
  }

  // 1. Single Day mode
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = parseDateKey(date);
    if (!parsed) return res.status(400).json({ message: "Invalid date format" });

    const dayStart = new Date(parsed);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(parsed);
    dayEnd.setUTCHours(23, 59, 59, 999);

    await StaffAvailability.deleteMany({
      user_id: req.user._id,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    const created = await StaffAvailability.create({
      user_id: req.user._id,
      date: parsed,
      reason: reasonText
    });

    return res.status(201).json({
      message: "Availability saved successfully",
      record: {
        _id: created._id,
        date: toDateKey(created.date),
        reason: created.reason
      }
    });
  }

  // 2. Date Range mode
  if (startDate && endDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ message: "Start Date and End Date must be in YYYY-MM-DD format" });
    }
    if (startDate >= endDate) {
      return res.status(400).json({ message: "Start Date and End Date must be different, and End Date cannot be earlier than Start Date." });
    }

    const rangeDates = getDateRangeList(startDate, endDate);
    if (rangeDates.length === 0) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const startBoundary = new Date(rangeDates[0]);
    startBoundary.setUTCHours(0, 0, 0, 0);
    const endBoundary = new Date(rangeDates[rangeDates.length - 1]);
    endBoundary.setUTCHours(23, 59, 59, 999);

    await StaffAvailability.deleteMany({
      user_id: req.user._id,
      date: { $gte: startBoundary, $lte: endBoundary }
    });

    await StaffAvailability.insertMany(
      rangeDates.map((d) => ({
        user_id: req.user._id,
        date: d,
        reason: reasonText
      }))
    );

    return res.status(201).json({
      message: `Saved ${rangeDates.length} unavailable dates successfully`,
      dates: rangeDates.map(toDateKey)
    });
  }

  // 3. Array of dates or Month-based replacement (legacy support)
  if (Array.isArray(dates)) {
    const parsedDates = dates.map(parseDateKey).filter(Boolean);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const range = parseMonth(month);
      if (range) {
        await StaffAvailability.deleteMany({
          user_id: req.user._id,
          date: { $gte: range.start, $lte: range.end }
        });
      }
    }

    if (parsedDates.length > 0) {
      for (const d of parsedDates) {
        const dayStart = new Date(d);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setUTCHours(23, 59, 59, 999);
        await StaffAvailability.deleteMany({
          user_id: req.user._id,
          date: { $gte: dayStart, $lte: dayEnd }
        });
      }

      await StaffAvailability.insertMany(
        parsedDates.map((d) => ({
          user_id: req.user._id,
          date: d,
          reason: reasonText
        }))
      );
    }

    return res.json({
      message: "Availability updated successfully",
      unavailable: parsedDates.map(toDateKey)
    });
  }

  return res.status(400).json({ message: "Please provide a valid date or date range" });
});

exports.removeAvailability = asyncHandler(async (req, res) => {
  const id = req.params?.id || req.body?.id;
  const date = req.query?.date || req.body?.date;

  if (id) {
    const deleted = await StaffAvailability.findOneAndDelete({
      _id: id,
      user_id: req.user._id
    });
    if (!deleted) {
      return res.status(404).json({ message: "Availability record not found" });
    }
    return res.json({ message: "Availability record removed successfully" });
  }

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = parseDateKey(date);
    if (parsed) {
      const dayStart = new Date(parsed);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(parsed);
      dayEnd.setUTCHours(23, 59, 59, 999);

      await StaffAvailability.deleteMany({
        user_id: req.user._id,
        date: { $gte: dayStart, $lte: dayEnd }
      });
      return res.json({ message: "Availability date removed successfully" });
    }
  }

  return res.status(400).json({ message: "Please provide a record ID or date to remove" });
});

exports.getBookings = asyncHandler(async (req, res) => {
  const managerId = req.user._id;
  const statusTab = String(req.query.status || "").toLowerCase();

  const query = { event_manager_id: managerId };

  if (statusTab === "completed") {
    query.status = { $in: ["Completed", "completed"] };
  } else if (statusTab === "upcoming" || statusTab === "active" || !statusTab) {
    query.status = { $nin: ["Completed", "completed", "Cancelled", "cancelled", "refunded"] };
  }

  const bookings = await Booking.find(query)
    .populate("customer_id", "full_name first_name last_name email phone")
    .populate("package_id", "name price")
    .populate("staff_assignments.user_id", "full_name email phone position")
    .populate("inventory_items.inventory_id", "name item_name category")
    .sort({ event_date: statusTab === "completed" ? -1 : 1 })
    .lean();

  if (bookings.length > 0) {
    const bookingIds = bookings.map((b) => b._id);
    const inquiryIds = bookings.map((b) => b.inquiry_id).filter(Boolean);
    const payments = await Payment.find({
      $or: [
        { booking_id: { $in: bookingIds } },
        ...(inquiryIds.length > 0 ? [{ inquiry_id: { $in: inquiryIds } }] : [])
      ]
    }).lean();

    const paymentMap = {};
    for (const p of payments) {
      if (["approved", "paid", "completed"].includes(String(p.status || "").toLowerCase().trim())) {
        const bKey = p.booking_id ? String(p.booking_id) : "";
        const inqKey = p.inquiry_id ? String(p.inquiry_id) : "";
        const amt = Number(p.amount) || 0;
        if (bKey) {
          paymentMap[bKey] = (paymentMap[bKey] || 0) + amt;
        } else if (inqKey) {
          paymentMap[inqKey] = (paymentMap[inqKey] || 0) + amt;
        }
      }
    }

    for (const b of bookings) {
      const paid = paymentMap[String(b._id)] ?? (b.inquiry_id ? paymentMap[String(b.inquiry_id)] : 0) ?? 0;
      const totalCost = Number(b.total_price || 0);
      b.total_paid = paid;
      b.remaining_balance = Math.max(0, totalCost - paid);
    }
  }

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

  const payments = await Payment.find({
    $or: [
      { booking_id: booking._id },
      ...(booking.inquiry_id ? [{ inquiry_id: booking.inquiry_id }] : [])
    ]
  })
    .sort({ createdAt: -1 })
    .lean();

  const approvedPayments = payments.filter((p) =>
    ["approved", "paid", "completed"].includes(String(p.status || "").toLowerCase().trim())
  );
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCost = Number(booking.total_price || 0);
  const remainingBalance = Math.max(0, totalCost - totalPaid);

  const bookingObj = booking.toObject ? booking.toObject() : booking;
  bookingObj.payments = payments;
  bookingObj.approved_payments = approvedPayments;
  bookingObj.total_paid = totalPaid;
  bookingObj.remaining_balance = remainingBalance;

  res.json(bookingObj);
});

exports.assignStaff = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Only Administrators are authorized to assign staff to events. Managers no longer manage staff assignments."
    });
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only. Staff assignments cannot be modified." });
  }

  const { staff_assignments } = req.body;
  if (!Array.isArray(staff_assignments)) {
    return res.status(400).json({ message: "staff_assignments must be an array" });
  }

  // Validate Staff Availability on event date
  const assignedUserIds = staff_assignments
    .map((a) => a.user_id?._id || a.user_id)
    .filter(Boolean);

  if (assignedUserIds.length > 0 && booking.event_date) {
    const eventDate = new Date(booking.event_date);
    const dayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const dayEnd = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);

    const unavailabilities = await StaffAvailability.find({
      user_id: { $in: assignedUserIds },
      date: { $gte: dayStart, $lte: dayEnd }
    }).populate("user_id", "full_name");

    if (unavailabilities.length > 0 && !req.body.override_unavailability) {
      const names = unavailabilities.map((u) => u.user_id?.full_name || "A selected staff member").join(", ");
      return res.status(409).json({
        message: `Cannot assign: ${names} is marked as unavailable/off-duty on this event date.`
      });
    }
  }

  booking.staff_assignments = staff_assignments;

  // Only advance to Ready for Event if the booking is already confirmed and deposit has been paid
  const isPastEvent = booking.event_date && new Date(booking.event_date) < new Date();
  const hasPaidDeposit = ["deposit_paid", "fully_paid"].includes(booking.payment_status);
  if (!isPastEvent && hasPaidDeposit && ["Confirmed", "confirmed"].includes(booking.status)) {
    booking.status = "Ready for Event";
  }

  await booking.save();

  const populated = await Booking.findById(booking._id)
    .populate("customer_id", "full_name email phone")
    .populate("staff_assignments.user_id", "full_name email phone position");

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "booking", action: "assign_staff", booking_id: booking._id });
  }

  // Notify each assigned registered staff member
  try {
    const { createNotification } = require("../utils/notify");
    const eventDateFormatted = booking.event_date
      ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Upcoming Event";

    const notifyPromises = staff_assignments
      .filter((a) => a.user_id)
      .map((a) => {
        const staffUserId = a.user_id?._id || a.user_id;
        return createNotification(
          {
            userId: staffUserId,
            title: "New Event Crew Assignment",
            body: `You have been assigned as ${a.role || "Staff"} for ${booking.event_type || "Catering Event"} on ${eventDateFormatted}.`,
            type: "info",
            link: `/staff/events/${booking._id}`,
            meta: { booking_id: booking._id, role: a.role }
          },
          io
        ).catch((err) => console.error("Staff notification error:", err));
      });
    await Promise.allSettled(notifyPromises);
  } catch (notifErr) {
    console.error("Error creating staff assignment notifications:", notifErr);
  }

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

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only. Notes cannot be added." });
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

exports.submitReport = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is completed and read-only. Shift reports cannot be submitted or altered." });
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
    role: role || (req.user.role === "admin" ? "Administrator" : "Lead Manager"),
    note: note.trim(),
    created_at: new Date()
  });

  await booking.save();
  res.json({ message: "Report submitted successfully", staff_reports: booking.staff_reports });
});

const isBookingStartedOrFinished = (booking) => {
  if (!booking) return false;
  const status = String(booking.status || "").toLowerCase();
  if (["completed", "ongoing"].includes(status)) {
    return true;
  }

  if (!booking.event_date) return true;

  const dateObj = new Date(booking.event_date);
  if (Number.isNaN(dateObj.getTime())) return true;

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  let hours = 0;
  let minutes = 0;
  if (booking.start_time) {
    const match = String(booking.start_time).trim().match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    }
  }

  const startDateTime = new Date(year, month, day, hours, minutes, 0, 0);
  const now = new Date();

  return now >= startDateTime;
};

const formatBookingEventSchedule = (eventDate, startTime) => {
  if (!eventDate) return "the scheduled event time";
  const d = new Date(eventDate);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return startTime ? `${dateStr} at ${startTime}` : dateStr;
};

exports.submitEquipmentReturns = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is completed and read-only. Equipment check cannot be modified." });
  }

  if (!isBookingStartedOrFinished(booking)) {
    return res.status(400).json({
      message: `Equipment check is locked until the event starts (${formatBookingEventSchedule(booking.event_date, booking.start_time)}).`
    });
  }

  const returns = req.body.returns || req.body.equipment_returns;
  const noteText = (req.body.note || req.body.notes || req.body.equipment_notes || "").trim();

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
    for (const ret of returns) {
      const item = booking.equipment_returns.find(
        (eq) => String(eq.inventory_id) === String(ret.inventory_id) || String(eq._id) === String(ret._id)
      );
      if (item) {
        const returnedVal = Number(ret.quantity_returned !== undefined ? ret.quantity_returned : ret.quantity_booked || 0);
        const damagedVal = Number(ret.quantity_damaged || 0);
        if (returnedVal + damagedVal > item.quantity_booked) {
          return res.status(400).json({
            message: `Invalid return amount for ${item.name || 'equipment'}. Returned (${returnedVal}) + Damaged (${damagedVal}) cannot exceed dispatched amount (${item.quantity_booked}).`
          });
        }
      }
    }

    const { reconcileEquipmentTurnover } = require("../utils/reconcileInventory");
    await reconcileEquipmentTurnover({
      booking,
      returns,
      actorId: req.user._id,
      notes: noteText,
      isManagerVerification: true,
    });
  }

  if (noteText) {
    booking.equipment_notes = noteText;
    if (!Array.isArray(booking.staff_reports)) booking.staff_reports = [];
    booking.staff_reports.push({
      staff_id: req.user._id,
      role: "Lead Manager - Equipment Check",
      note: noteText,
      created_at: new Date()
    });
  }

  await booking.save();

  const updated = await Booking.findById(booking._id).populate("equipment_returns.inventory_id");
  res.json({ message: "Equipment returns saved successfully", equipment_returns: updated.equipment_returns });
});

exports.updateEquipment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only. Equipment cannot be modified." });
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

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only. Equipment verification cannot be modified." });
  }

  const { confirmed, additional_notes } = req.body;
  const returns = req.body.returns || req.body.equipment_returns;
  const isConfirmed = Boolean(confirmed);

  if (isConfirmed && ((Array.isArray(booking.equipment_returns) && booking.equipment_returns.length > 0) || Array.isArray(returns))) {
    const { reconcileEquipmentTurnover } = require("../utils/reconcileInventory");
    await reconcileEquipmentTurnover({
      booking,
      returns,
      actorId: req.user._id,
      notes: typeof additional_notes === "string" ? additional_notes.trim() : "",
      isManagerVerification: true,
    });
  } else {
    booking.equipment_manager_verified = {
      confirmed: isConfirmed,
      confirmed_by: req.user._id,
      confirmed_at: isConfirmed ? new Date() : null,
      additional_notes: typeof additional_notes === "string" ? additional_notes.trim() : ""
    };
    await booking.save();
  }

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

  // Handle balance payment and validate settlement
  const Payment = require("../models/Payment");
  const approvedPayments = await Payment.find({ booking_id: booking._id, status: "approved" });
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, Number(booking.total_price || 0) - totalPaid);

  const io = req.app.get("io");

  if (remainingBalance > 0) {
    if (req.body.collected_cash_balance === true) {
      const { syncBookingStatus } = require("./payment.controller");
      let balPayment = await Payment.findOne({
        booking_id: booking._id,
        payment_type: "balance",
        status: "pending"
      });

      if (balPayment) {
        balPayment.status = "approved";
        balPayment.method = "cash";
        balPayment.gateway = "manual";
        balPayment.amount = remainingBalance;
        balPayment.paid_at = new Date();
        balPayment.metadata = { ...(balPayment.metadata || {}), collected_by: req.user._id, on_site: true };
        await balPayment.save();
      } else {
        balPayment = await Payment.create({
          booking_id: booking._id,
          customer_id: booking.customer_id,
          amount: remainingBalance,
          currency: "PHP",
          payment_type: "balance",
          method: "cash",
          gateway: "manual",
          status: "approved",
          paid_at: new Date(),
          metadata: { collected_by: req.user._id, on_site: true }
        });
      }

      await syncBookingStatus(booking._id);
    } else {
      return res.status(400).json({
        message: `Cannot mark booking as completed. The customer still has an outstanding balance of ₱${remainingBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. Full payment is required before an event can be marked completed.`
      });
    }
  }

  booking.status = "Completed";
  booking.completed_at = new Date();
  await booking.save();

  if (io) {
    io.emit("system:refresh", { type: "booking", action: "complete_event", booking_id: booking._id });
  }

  res.json({ message: "Booking marked as completed", booking });
});

exports.getStaff = asyncHandler(async (req, res) => {
  const roleFilter = String(req.query.role || (req.user?.role === "admin" ? "all" : "staff")).toLowerCase().trim();
  const query = {};

  if (roleFilter === "manager") {
    query.role = "manager";
  } else if (roleFilter === "staff") {
    query.role = "staff";
  } else {
    query.role = { $in: ["staff", "manager"] };
  }

  if (req.query.include_inactive !== "true") {
    query.is_active = true;
  }

  const staff = await User.find(query).select("-password").lean();
  const staffIds = staff.map((s) => s._id);

  const now = new Date();
  const upcomingBookings = await Booking.find({
    $or: [
      { "staff_assignments.user_id": { $in: staffIds } },
      { event_manager_id: { $in: staffIds } }
    ],
    event_date: { $gte: now },
    status: { $nin: ["Cancelled", "cancelled", "refunded", "Completed", "completed"] }
  }).select("staff_assignments event_manager_id");

  const upcomingMap = new Map();
  upcomingBookings.forEach((b) => {
    const seen = new Set();
    if (b.event_manager_id) {
      const mId = String(b.event_manager_id);
      seen.add(mId);
      upcomingMap.set(mId, (upcomingMap.get(mId) || 0) + 1);
    }
    if (Array.isArray(b.staff_assignments)) {
      b.staff_assignments.forEach((sa) => {
        if (sa.user_id) {
          const sId = String(sa.user_id);
          if (!seen.has(sId)) {
            seen.add(sId);
            upcomingMap.set(sId, (upcomingMap.get(sId) || 0) + 1);
          }
        }
      });
    }
  });

  // If event_date query is provided, check availability on that date
  let unavailableSet = new Set();
  let unavailableReasonMap = new Map();
  let bookedMap = new Map();

  if (req.query.event_date) {
    const eventDate = new Date(req.query.event_date);
    const startOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const endOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);

    const [unavailabilities, bookedEvents] = await Promise.all([
      StaffAvailability.find({
        user_id: { $in: staffIds },
        date: { $gte: startOfDay, $lte: endOfDay }
      }).select("user_id reason"),
      Booking.find({
        $or: [
          { "staff_assignments.user_id": { $in: staffIds } },
          { event_manager_id: { $in: staffIds } }
        ],
        event_date: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["Cancelled", "cancelled", "refunded"] }
      })
        .populate("customer_id", "full_name first_name last_name")
        .select("staff_assignments event_manager_id event_date start_time duration_hours event_type reference status customer_id")
    ]);

    unavailabilities.forEach((u) => {
      unavailableSet.add(String(u.user_id));
      if (u.reason) unavailableReasonMap.set(String(u.user_id), u.reason);
    });
    bookedEvents.forEach((b) => {
      const custName = b.customer_id?.full_name 
        || `${b.customer_id?.first_name || ""} ${b.customer_id?.last_name || ""}`.trim() 
        || "Customer";
      const eventSummary = {
        booking_id: b._id,
        reference: b.reference || String(b._id).slice(-6).toUpperCase(),
        event_type: b.event_type,
        start_time: b.start_time || "",
        duration_hours: b.duration_hours,
        customer_name: custName,
        status: b.status
      };

      if (b.event_manager_id) {
        const mId = String(b.event_manager_id);
        if (!bookedMap.has(mId)) bookedMap.set(mId, []);
        bookedMap.get(mId).push({ ...eventSummary, assigned_as: "Event Manager" });
      }
      if (Array.isArray(b.staff_assignments)) {
        b.staff_assignments.forEach((sa) => {
          if (sa.user_id) {
            const sId = String(sa.user_id);
            if (!bookedMap.has(sId)) bookedMap.set(sId, []);
            bookedMap.get(sId).push({ ...eventSummary, assigned_as: sa.role || "Staff" });
          }
        });
      }
    });
  }

  const result = staff.map((member) => {
    const idStr = String(member._id);
    const isUnavailable = unavailableSet.has(idStr);
    const isBooked = bookedMap.has(idStr);
    const isConflict = isUnavailable && isBooked;
    const reasonText = unavailableReasonMap.get(idStr);

    let availabilityStatus = "Available";
    if (!member.is_active) {
      availabilityStatus = "Inactive";
    } else if (isConflict) {
      availabilityStatus = reasonText ? `Conflict (${reasonText})` : "Conflict";
    } else if (isUnavailable) {
      availabilityStatus = reasonText ? `Unavailable (${reasonText})` : "Unavailable";
    } else if (isBooked) {
      availabilityStatus = "Scheduled";
    }

    return {
      ...member,
      upcoming_count: upcomingMap.get(idStr) || 0,
      is_available: req.query.event_date ? (!isUnavailable && !isBooked && member.is_active) : member.is_active,
      availability_status: availabilityStatus,
      unavailability_reason: reasonText || "",
      scheduled_events: bookedMap.get(idStr) || []
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

  const [member, availability, assignments] = await Promise.all([
    User.findById(staffId).select("full_name email phone role position is_active username").lean(),
    StaffAvailability.find({
      user_id: staffId,
      date: { $gte: range.start, $lte: range.end }
    }).select("date"),
    Booking.find({
      $or: [
        { "staff_assignments.user_id": staffId },
        { event_manager_id: staffId }
      ],
      event_date: { $gte: range.start, $lte: range.end },
      status: { $nin: ["Cancelled", "cancelled", "refunded"] }
    })
      .populate("customer_id", "full_name first_name last_name")
      .select("event_date start_time duration_hours event_type reference status customer_id event_manager_id staff_assignments")
  ]);

  if (!member) {
    return res.status(404).json({ message: "Staff member or manager not found" });
  }

  const unavailableDates = availability.map((item) => toDateKey(item.date));
  const unavailableSet = new Set(unavailableDates);

  const parsedAssignments = assignments.map((booking) => {
    const custName = booking.customer_id?.full_name 
      || `${booking.customer_id?.first_name || ""} ${booking.customer_id?.last_name || ""}`.trim() 
      || "Customer";
    const isManager = String(booking.event_manager_id) === String(staffId);
    const staffEntry = (booking.staff_assignments || []).find((sa) => String(sa.user_id) === String(staffId));
    const assignedAs = isManager ? "Event Manager" : (staffEntry?.role || member.position || "Staff");
    const dateKey = toDateKey(new Date(booking.event_date));
    const isConflict = unavailableSet.has(dateKey);

    return {
      _id: booking._id,
      date: booking.event_date,
      date_key: dateKey,
      start_time: booking.start_time || "",
      duration_hours: booking.duration_hours,
      event_type: booking.event_type,
      reference: booking.reference || String(booking._id).slice(-6).toUpperCase(),
      customer_name: custName,
      status: booking.status,
      assigned_as: assignedAs,
      is_conflict: isConflict
    };
  });

  const conflictDates = Array.from(
    new Set(parsedAssignments.filter((a) => a.is_conflict).map((a) => a.date_key))
  );

  res.json({
    member,
    month,
    unavailable: unavailableDates,
    conflicts: conflictDates,
    assignments: parsedAssignments
  });
});

