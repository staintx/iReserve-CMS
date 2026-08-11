const Gallery = require("../models/Gallery");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const cloudinary = require("../config/cloudinary");

exports.create = async (req, res) => {
  let image_url = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "gallery");
    image_url = result.secure_url;
  }
  const newItem = await Gallery.create({ ...req.body, image_url });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "gallery", action: "create", gallery_id: newItem._id });
  }

  res.status(201).json(newItem);
};

exports.createBulk = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files provided." });
  }

  const uploadPromises = req.files.map(async (file) => {
    const result = await uploadToCloudinary(file.buffer, "gallery");
    const baseName = String(file.originalname || "").replace(/\.[^.]+$/, "").trim();
    const title = baseName || "Gallery";
    return { title, image_url: result.secure_url };
  });

  try {
    const galleryData = await Promise.all(uploadPromises);
    const newDocs = await Gallery.insertMany(galleryData);

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "gallery", action: "bulk_create" });
    }

    res.status(201).json(newDocs);
  } catch (err) {
    res.status(500).json({ message: "Bulk upload failed", error: err.message });
  }
};

exports.getAll = async (req, res) => res.json(await Gallery.find());
exports.getById = async (req, res) => res.json(await Gallery.findById(req.params.id));

exports.update = async (req, res) => {
  let data = req.body;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "gallery");
    data.image_url = result.secure_url;
  }
  const updated = await Gallery.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "gallery", action: "update", gallery_id: updated?._id });
  }

  res.json(updated);
};

exports.remove = async (req, res) => {
  const item = await Gallery.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });

  if (item.image_url) {
    try {
      const parts = item.image_url.split("/");
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      const publicId = filename.split(".")[0];
      if (folder && publicId) {
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      }
    } catch (err) {
      console.error("Cloudinary delete error:", err);
    }
  }

  await Gallery.findByIdAndDelete(req.params.id);

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "gallery", action: "delete", gallery_id: req.params.id });
  }

  res.json({ message: "Deleted" });
};