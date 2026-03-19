const Quote = require("../models/Quote");
const asyncHandler = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    customer_id: req.user?._id || req.body.customer_id
  };
  res.status(201).json(await Quote.create(payload));
});

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await Quote.find().populate("customer_id"));
});

exports.getMine = asyncHandler(async (req, res) => {
  res.json(await Quote.find({ customer_id: req.user._id }).populate("customer_id"));
});

exports.getById = asyncHandler(async (req, res) => {
  res.json(await Quote.findById(req.params.id).populate("customer_id"));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

exports.remove = asyncHandler(async (req, res) => {
  await Quote.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});
