const mongoose = require("mongoose");
const Gallery = require("../models/Gallery");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const cloudinary = require("../config/cloudinary");
const logAction = require("../utils/logAction");

exports.create = async (req, res) => {
  let image_url = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "gallery");
    image_url = result.secure_url;
  }
  const newItem = await Gallery.create({ ...req.body, image_url });

  if (logAction) {
    await logAction({
      user_id: req.user?._id,
      action: "gallery_photo_created",
      entity_type: "gallery",
      entity_id: newItem._id,
      details: `Added photo "${newItem.title || "Untitled"}" to ${newItem.category || "General"} album`,
      ip_address: req.ip,
    }).catch((err) => console.error("logAction error:", err));
  }

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

    if (logAction) {
      await logAction({
        user_id: req.user?._id,
        action: "gallery_bulk_upload",
        entity_type: "gallery",
        entity_id: newDocs[0]?._id,
        details: `Bulk uploaded ${newDocs.length} photos to website gallery`,
        ip_address: req.ip,
      }).catch((err) => console.error("logAction error:", err));
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "gallery", action: "bulk_create" });
    }

    res.status(201).json(newDocs);
  } catch (err) {
    res.status(500).json({ message: "Bulk upload failed", error: err.message });
  }
};

exports.getAll = async (req, res) => res.json(await Gallery.find().sort({ createdAt: -1 }));

exports.getById = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid photo ID format" });
  }
  const item = await Gallery.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Gallery photo not found" });
  res.json(item);
};

exports.update = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid photo ID format" });
  }

  let data = req.body;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "gallery");
    data.image_url = result.secure_url;
  }
  const updated = await Gallery.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' });

  if (logAction && updated) {
    await logAction({
      user_id: req.user?._id,
      action: "gallery_photo_updated",
      entity_type: "gallery",
      entity_id: updated._id,
      details: `Updated photo "${updated.title || "Untitled"}" in ${updated.category || "General"} album`,
      ip_address: req.ip,
    }).catch((err) => console.error("logAction error:", err));
  }

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "gallery", action: "update", gallery_id: updated?._id });
  }

  res.json(updated);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid photo ID format" });
  }

  const item = await Gallery.findById(id);

  if (item) {
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

    await Gallery.findByIdAndDelete(id);

    if (logAction) {
      await logAction({
        user_id: req.user?._id,
        action: "gallery_photo_deleted",
        entity_type: "gallery",
        entity_id: id,
        details: `Deleted gallery photo "${item.title || "Untitled"}" (${item.category || "General"})`,
        ip_address: req.ip,
      }).catch((err) => console.error("logAction error:", err));
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "gallery", action: "delete", gallery_id: id });
    }
  }

  // Idempotent success: whether deleted just now or already removed
  res.json({ message: "Deleted" });
};