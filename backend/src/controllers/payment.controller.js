const Payment = require("../models/Payment");

exports.create = async (req, res) => res.status(201).json(await Payment.create(req.body));
exports.getAll = async (req, res) => res.json(await Payment.find().populate("booking_id customer_id"));
exports.getById = async (req, res) => res.json(await Payment.findById(req.params.id).populate("booking_id customer_id"));
exports.update = async (req, res) => res.json(await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true }));
exports.remove = async (req, res) => { await Payment.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };