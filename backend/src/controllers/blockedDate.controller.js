const BlockedDate = require("../models/BlockedDate");
const asyncHandler = require("../utils/asyncHandler");

exports.getAll = asyncHandler(async (req, res) => {
  const dates = await BlockedDate.find().populate("created_by", "full_name email");
  res.json(dates);
});

exports.create = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;
  
  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "Invalid date format" });
  }
  
  // Normalize date to start of day to avoid time component issues
  parsedDate.setHours(0, 0, 0, 0);

  const existing = await BlockedDate.findOne({ date: parsedDate });
  if (existing) {
    return res.status(400).json({ message: "This date is already blocked" });
  }

  const blockedDate = await BlockedDate.create({
    date: parsedDate,
    reason,
    created_by: req.user._id,
  });

  res.status(201).json(blockedDate);
});

exports.remove = asyncHandler(async (req, res) => {
  const blockedDate = await BlockedDate.findById(req.params.id);
  if (!blockedDate) {
    return res.status(404).json({ message: "Blocked date not found" });
  }

  await blockedDate.deleteOne();
  res.json({ message: "Date unblocked successfully" });
});
