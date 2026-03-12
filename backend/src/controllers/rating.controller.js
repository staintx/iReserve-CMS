const Rating = require("../models/Rating");

exports.create = async (req, res) => res.status(201).json(await Rating.create(req.body));
exports.getAll = async (req, res) => res.json(await Rating.find().populate("customer_id booking_id"));
exports.getById = async (req, res) => res.json(await Rating.findById(req.params.id).populate("customer_id booking_id"));
exports.remove = async (req, res) => { await Rating.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };