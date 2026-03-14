const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req, res) => res.status(201).json(await Payment.create(req.body)));
exports.getAll = asyncHandler(async (req, res) => res.json(await Payment.find().populate("booking_id customer_id")));
exports.getMine = asyncHandler(async (req, res) => res.json(await Payment.find({ customer_id: req.user._id }).populate("booking_id customer_id")));
exports.getById = asyncHandler(async (req, res) => res.json(await Payment.findById(req.params.id).populate("booking_id customer_id")));
exports.update = asyncHandler(async (req, res) => res.json(await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true })));
exports.remove = asyncHandler(async (req, res) => { await Payment.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); });