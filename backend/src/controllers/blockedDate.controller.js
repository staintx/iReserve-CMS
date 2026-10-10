const mongoose = require("mongoose");
const BlockedDate = require("../models/BlockedDate");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");

// Helper to parse date string YYYY-MM-DD or date object into local start-of-day Date
const parseDateStartOfDay = (val) => {
  if (!val) return null;
  if (typeof val === "string") {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

exports.getAll = asyncHandler(async (req, res) => {
  const dates = await BlockedDate.find().populate("created_by", "full_name email");
  res.json(dates);
});

exports.create = asyncHandler(async (req, res) => {
  const { date, startDate, endDate, reason } = req.body;
  
  if (!date && !startDate) {
    return res.status(400).json({ message: "Date or Date range is required" });
  }

  const createdDates = [];
  const datesToBlock = [];

  const isRange = Boolean(startDate && endDate);
  const groupId = isRange ? new mongoose.Types.ObjectId().toString() : null;

  if (isRange) {
    const current = parseDateStartOfDay(startDate);
    const end = parseDateStartOfDay(endDate);

    if (!current || !end) {
      return res.status(400).json({ message: "Invalid date format for date range" });
    }

    if (current > end) {
      return res.status(400).json({ message: "Start date cannot be after end date" });
    }

    const runner = new Date(current);
    while (runner <= end) {
      datesToBlock.push(new Date(runner));
      runner.setDate(runner.getDate() + 1);
    }
  } else {
    const targetDate = date || startDate;
    const singleDate = parseDateStartOfDay(targetDate);
    if (!singleDate) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    datesToBlock.push(singleDate);
  }

  // Pre-validate all dates against existing confirmed bookings and scheduled events
  const conflictingDates = [];
  for (const d of datesToBlock) {
    const startOfDay = new Date(d);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);

    const activeBooking = await Booking.findOne({
      event_date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "Cancelled", "rejected", "refunded"] }
    }).lean();

    if (activeBooking) {
      conflictingDates.push(d);
      continue;
    }

    const ocularBooking = await Booking.findOne({
      "ocular_visit.scheduled_date": { $gte: startOfDay, $lte: endOfDay },
      "ocular_visit.status": { $in: ["scheduled"] }
    }).lean();

    if (ocularBooking) {
      conflictingDates.push(d);
    }
  }

  if (conflictingDates.length > 0) {
    if (!isRange) {
      return res.status(400).json({
        message: "This date cannot be blocked because it already has a scheduled booking or event."
      });
    } else {
      const formattedList = Array.from(
        new Set(
          conflictingDates.map((cd) =>
            new Date(cd).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric"
            })
          )
        )
      ).join(", ");

      return res.status(400).json({
        message: `Cannot block selected date range because ${formattedList} already has a scheduled booking or event.`
      });
    }
  }

  const rangeStart = isRange ? new Date(datesToBlock[0]) : null;
  const rangeEnd = isRange ? new Date(datesToBlock[datesToBlock.length - 1]) : null;

  for (const d of datesToBlock) {
    const startOfDay = new Date(d);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await BlockedDate.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!existing) {
      const newBlocked = await BlockedDate.create({
        date: startOfDay,
        reason: reason?.trim() || "Admin Blocked",
        group_id: groupId,
        range_start: rangeStart,
        range_end: rangeEnd,
        created_by: req.user._id,
      });
      createdDates.push(newBlocked);
    }
  }

  if (createdDates.length === 0) {
    return res.status(400).json({ message: "Selected date(s) are already blocked" });
  }

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "blocked_date", action: "create" });

  res.status(201).json({
    message: isRange
      ? "Date range blocked successfully!"
      : "Date blocked successfully!",
    blockedDates: createdDates,
    ...(createdDates.length === 1 ? createdDates[0]._doc : {})
  });
});

exports.remove = asyncHandler(async (req, res) => {
  const blockedDate = await BlockedDate.findById(req.params.id);
  if (!blockedDate) {
    return res.status(404).json({ message: "Blocked date not found" });
  }

  const unblockRange = req.query.range === "true" || req.query.unblockAllRange === "true";
  let deletedCount = 1;

  if (unblockRange && blockedDate.group_id) {
    const result = await BlockedDate.deleteMany({ group_id: blockedDate.group_id });
    deletedCount = result.deletedCount;
  } else if (unblockRange && !blockedDate.group_id) {
    // Fallback for legacy ranges created without group_id
    const startWindow = new Date(blockedDate.created_at.getTime() - 10000);
    const endWindow = new Date(blockedDate.created_at.getTime() + 10000);
    const result = await BlockedDate.deleteMany({
      created_by: blockedDate.created_by,
      reason: blockedDate.reason,
      created_at: { $gte: startWindow, $lte: endWindow }
    });
    deletedCount = result.deletedCount || 1;
  } else {
    await blockedDate.deleteOne();
  }

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "blocked_date", action: "delete" });

  res.json({
    message: deletedCount > 1 ? "Date range unblocked successfully!" : "Date unblocked successfully!",
    deletedCount
  });
});

