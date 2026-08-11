const BlockedDate = require("../models/BlockedDate");
const asyncHandler = require("../utils/asyncHandler");

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

  if (startDate && endDate) {
    let current = new Date(startDate);
    const end = new Date(endDate);
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (current > end) {
      return res.status(400).json({ message: "Start date cannot be after end date" });
    }

    while (current <= end) {
      datesToBlock.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  } else {
    const targetDate = date || startDate;
    const singleDate = new Date(targetDate);
    if (isNaN(singleDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    singleDate.setHours(0, 0, 0, 0);
    datesToBlock.push(singleDate);
  }

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
        reason: reason || "Admin Blocked",
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
    message: `${createdDates.length} date(s) blocked successfully`,
    blockedDates: createdDates,
    ...(createdDates.length === 1 ? createdDates[0]._doc : {})
  });
});

exports.remove = asyncHandler(async (req, res) => {
  const blockedDate = await BlockedDate.findById(req.params.id);
  if (!blockedDate) {
    return res.status(404).json({ message: "Blocked date not found" });
  }

  await blockedDate.deleteOne();

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "blocked_date", action: "delete" });

  res.json({ message: "Date unblocked successfully" });
});
