const SystemLog = require("../models/SystemLog");

exports.create = async (req, res) => res.status(201).json(await SystemLog.create(req.body));
exports.getAll = async (req, res) => res.json(await SystemLog.find().populate("user_id"));