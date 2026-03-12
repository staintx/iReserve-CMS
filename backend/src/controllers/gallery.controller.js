const Gallery = require("../models/Gallery");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

exports.create = async (req, res) => {
  let image_url = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "gallery");
    image_url = result.secure_url;
  }
  res.status(201).json(await Gallery.create({ ...req.body, image_url }));
};

exports.getAll = async (req, res) => res.json(await Gallery.find());
exports.getById = async (req, res) => res.json(await Gallery.findById(req.params.id));

exports.update = async (req, res) => {
  let data = req.body;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "gallery");
    data.image_url = result.secure_url;
  }
  res.json(await Gallery.findByIdAndUpdate(req.params.id, data, { new: true }));
};

exports.remove = async (req, res) => { await Gallery.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };