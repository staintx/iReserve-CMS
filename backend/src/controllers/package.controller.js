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

exports.create = async (req, res) => {
  let image_url = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "packages");
    image_url = result.secure_url;
  }
  const payload = {
    ...req.body,
    inclusions: normalizeList(req.body.inclusions),
    add_ons: normalizeList(req.body.add_ons),
    image_url
  };
  res.status(201).json(await Package.create(payload));
};

exports.getAll = async (req, res) => res.json(await Package.find());
exports.getById = async (req, res) => res.json(await Package.findById(req.params.id));

exports.update = async (req, res) => {
  let data = {
    ...req.body,
    inclusions: req.body.inclusions ? normalizeList(req.body.inclusions) : undefined,
    add_ons: req.body.add_ons ? normalizeList(req.body.add_ons) : undefined
  };

  if (data.inclusions === undefined) delete data.inclusions;
  if (data.add_ons === undefined) delete data.add_ons;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "packages");
    data.image_url = result.secure_url;
  }
  res.json(await Package.findByIdAndUpdate(req.params.id, data, { new: true }));
};

exports.remove = async (req, res) => { await Package.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };