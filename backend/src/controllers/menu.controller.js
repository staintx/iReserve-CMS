const MenuItem = require("../models/MenuItem");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

exports.create = async (req, res) => {
  let image_url = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "menu");
    image_url = result.secure_url;
  }
  res.status(201).json(await MenuItem.create({ ...req.body, image_url }));
};

exports.getAll = async (req, res) => res.json(await MenuItem.find());
exports.getById = async (req, res) => res.json(await MenuItem.findById(req.params.id));

exports.update = async (req, res) => {
  let data = req.body;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "menu");
    data.image_url = result.secure_url;
  }
  res.json(await MenuItem.findByIdAndUpdate(req.params.id, data, { new: true }));
};

exports.remove = async (req, res) => { await MenuItem.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };