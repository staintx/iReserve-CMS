const Package = require("../models/Package");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

const normalizeList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const canViewUnavailable = (user) => {
  if (!user) return false;
  return ["admin", "manager", "staff"].includes(user.role);
};

exports.create = async (req, res) => {
  let image_url = "";
  let gallery = [];
  
  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      const result = await uploadToCloudinary(req.files.image[0].buffer, "packages");
      image_url = result.secure_url;
    }
    
    if (req.files.gallery && req.files.gallery.length > 0) {
      const uploadPromises = req.files.gallery.map(file => uploadToCloudinary(file.buffer, "packages"));
      const results = await Promise.all(uploadPromises);
      gallery = results.map(r => r.secure_url);
    }
  }
  const payload = {
    ...req.body,
    inclusions: normalizeList(req.body.inclusions),
    add_ons: normalizeList(req.body.add_ons),
    image_url,
    gallery
  };
  res.status(201).json(await Package.create(payload));
};

exports.getAll = async (req, res) => {
  const query = canViewUnavailable(req.user) ? {} : { available: true };
  res.json(await Package.find(query));
};

exports.getById = async (req, res) => {
  const query = canViewUnavailable(req.user)
    ? { _id: req.params.id }
    : { _id: req.params.id, available: true };

  const pkg = await Package.findOne(query);
  if (!pkg) return res.status(404).json({ message: "Package not found" });
  res.json(pkg);
};

exports.update = async (req, res) => {
  let data = {
    ...req.body,
    inclusions: req.body.inclusions ? normalizeList(req.body.inclusions) : undefined,
    add_ons: req.body.add_ons ? normalizeList(req.body.add_ons) : undefined,
    gallery_to_remove: req.body.gallery_to_remove ? normalizeList(req.body.gallery_to_remove) : []
  };

  if (data.inclusions === undefined) delete data.inclusions;
  if (data.add_ons === undefined) delete data.add_ons;
  
  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      const result = await uploadToCloudinary(req.files.image[0].buffer, "packages");
      data.image_url = result.secure_url;
    }
    
    if (req.files.gallery && req.files.gallery.length > 0) {
      const uploadPromises = req.files.gallery.map(file => uploadToCloudinary(file.buffer, "packages"));
      const results = await Promise.all(uploadPromises);
      data.$push = { gallery: { $each: results.map(r => r.secure_url) } };
    }
  }

  // Handle gallery removals
  if (data.gallery_to_remove.length > 0) {
    data.$pull = { gallery: { $in: data.gallery_to_remove } };
  }
  delete data.gallery_to_remove;
  res.json(await Package.findByIdAndUpdate(req.params.id, data, { new: true }));
};

exports.remove = async (req, res) => { await Package.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };