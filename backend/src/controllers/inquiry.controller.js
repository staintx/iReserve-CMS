const Inquiry = require("../models/Inquiry");
const asyncHandler = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    customer_id: req.user?._id || req.body.customer_id,
    status: req.body.status || "pending"
  };

  res.status(201).json(await Inquiry.create(payload));
});

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await Inquiry.find().populate("customer_id package_id"));
});

exports.getMine = asyncHandler(async (req, res) => {
  res.json(await Inquiry.find({ customer_id: req.user._id }).populate("customer_id package_id"));
});

exports.getById = asyncHandler(async (req, res) => {
  res.json(await Inquiry.findById(req.params.id).populate("customer_id package_id"));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

exports.updateMineStatus = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findOne({ _id: req.params.id, customer_id: req.user._id });
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  const blockedStatuses = ["approved", "booked", "completed"];
  if (blockedStatuses.includes(inquiry.status)) {
    return res.status(400).json({ message: "Inquiry can no longer be cancelled" });
  }

  inquiry.status = req.body.status;
  await inquiry.save();
  res.json(inquiry);
});

exports.remove = asyncHandler(async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});