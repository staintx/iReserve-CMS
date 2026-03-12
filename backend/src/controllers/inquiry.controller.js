const Inquiry = require("../models/Inquiry");
const asyncHandler = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await Inquiry.create(req.body));
});

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await Inquiry.find().populate("customer_id"));
});

exports.getById = asyncHandler(async (req, res) => {
  res.json(await Inquiry.findById(req.params.id).populate("customer_id"));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

exports.remove = asyncHandler(async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});