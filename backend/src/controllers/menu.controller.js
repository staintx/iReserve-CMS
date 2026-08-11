const MenuItem = require("../models/MenuItem");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

exports.create = async (req, res) => {
  let image_url = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "menu");
    image_url = result.secure_url;
  }
  const newItem = await MenuItem.create({ ...req.body, image_url });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "menu", action: "create", menu_id: newItem._id });
  }

  res.status(201).json(newItem);
};

exports.getAll = async (req, res) => res.json(await MenuItem.find());
exports.getById = async (req, res) => res.json(await MenuItem.findById(req.params.id));

exports.update = async (req, res) => {
  let data = req.body;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "menu");
    data.image_url = result.secure_url;
  }
  const updated = await MenuItem.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "menu", action: "update", menu_id: updated?._id });
  }

  res.json(updated);
};

exports.remove = async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "menu", action: "delete", menu_id: req.params.id });
  }

  res.json({ message: "Deleted" });
};