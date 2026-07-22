const Package = require("../models/Package");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const logAction = require("../utils/logAction");

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
  const pkg = await Package.create(payload);

  await logAction({
    user_id: req.user._id,
    action: "package_created",
    entity_type: "package",
    entity_id: pkg._id,
    details: `Created package "${pkg.name}"`,
    ip_address: req.ip
  });

  res.status(201).json(pkg);
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
  const current = await Package.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Package not found" });

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

  const updated = await Package.findByIdAndUpdate(req.params.id, data, { new: true });

  // Build changes object for the log
  const trackFields = ["name", "description", "fullDescription", "size", "price_min", "price_max", "available", "event_type", "package_type", "max_guests", "booking_requirements", "cancellation_policy"];
  const changes = {};
  for (const field of trackFields) {
    if (req.body[field] !== undefined && String(current[field]) !== String(req.body[field])) {
      changes[field] = { from: current[field], to: req.body[field] };
    }
  }

  const changedFieldNames = Object.keys(changes);
  const detailParts = changedFieldNames.length > 0
    ? changedFieldNames.join(", ")
    : Object.keys(req.body).join(", ");

  await logAction({
    user_id: req.user._id,
    action: "package_updated",
    entity_type: "package",
    entity_id: updated._id,
    details: `Updated package "${updated.name}" — Fields: ${detailParts}`,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    ip_address: req.ip
  });

  res.json(updated);
};

exports.remove = async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  const pkgName = pkg ? pkg.name : req.params.id;
  await Package.findByIdAndDelete(req.params.id);

  await logAction({
    user_id: req.user._id,
    action: "package_deleted",
    entity_type: "package",
    entity_id: req.params.id,
    details: `Deleted package "${pkgName}"`,
    ip_address: req.ip
  });

  res.json({ message: "Deleted" });
};