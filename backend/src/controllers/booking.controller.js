const Booking = require("../models/Booking");

exports.create = async (req, res) => res.status(201).json(await Booking.create(req.body));
exports.getAll = async (req, res) => res.json(await Booking.find().populate("customer_id package_id manager_id staff_ids inquiry_id"));
exports.getById = async (req, res) => res.json(await Booking.findById(req.params.id).populate("customer_id package_id manager_id staff_ids inquiry_id"));
exports.update = async (req, res) => res.json(await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }));
exports.remove = async (req, res) => { await Booking.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };