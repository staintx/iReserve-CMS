const Inventory = require("../models/Inventory");

exports.create = async (req, res) => res.status(201).json(await Inventory.create(req.body));
exports.getAll = async (req, res) => res.json(await Inventory.find());
exports.getById = async (req, res) => res.json(await Inventory.findById(req.params.id));
exports.update = async (req, res) => res.json(await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true }));
exports.remove = async (req, res) => { await Inventory.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };