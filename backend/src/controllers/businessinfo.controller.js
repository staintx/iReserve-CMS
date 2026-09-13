const path = require("path");
const BusinessInfo = require("../models/BusinessInfo");
const asyncHandler = require("../utils/asyncHandler");
const logAction = require("../utils/logAction");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

const readBusinessInfo = async () => {
  const info = await BusinessInfo.findOne();
  return info || {};
};

exports.getPublic = asyncHandler(async (req, res) => {
  const info = await readBusinessInfo();
  res.json(info);
});

exports.get = asyncHandler(async (req, res) => {
  const info = await readBusinessInfo();
  res.json(info);
});

exports.uploadPolicyFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file was uploaded." });
  }

  const ext = path.extname(req.file.originalname || "").toLowerCase();
  const allowedExts = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp", ".txt"];
  if (!allowedExts.includes(ext)) {
    return res.status(400).json({
      message: `Invalid file type (${ext}). Allowed formats: PDF, DOC, DOCX, JPG, PNG, WEBP.`
    });
  }

  let fileUrl = "";
  try {
    const result = await uploadToCloudinary(req.file.buffer, "policies", { resource_type: "auto" });
    fileUrl = result.secure_url;
  } catch (cloudErr) {
    console.error("Cloudinary upload failed, falling back to data URL:", cloudErr.message);
    fileUrl = `data:${req.file.mimetype || "application/octet-stream"};base64,${req.file.buffer.toString("base64")}`;
  }

  res.json({
    url: fileUrl,
    name: req.file.originalname,
    type: ext.replace(".", "").toUpperCase(),
    size: req.file.size
  });
});

exports.update = asyncHandler(async (req, res) => {
  const current = (await BusinessInfo.findOne()) || {};

  // Auto-sync facebook and instagram from social_links if present
  let facebook = req.body.facebook;
  let instagram = req.body.instagram;
  if (Array.isArray(req.body.social_links)) {
    const fb = req.body.social_links.find(
      (l) => l.platform === "facebook" || (l.url && l.url.includes("facebook.com"))
    );
    if (fb) facebook = fb.url;

    const ig = req.body.social_links.find(
      (l) => l.platform === "instagram" || (l.url && l.url.includes("instagram.com"))
    );
    if (ig) instagram = ig.url;
  }

  // Auto-sync terms_url and privacy_url from files if present
  const terms_url = req.body.terms_file?.url || req.body.terms_url || "";
  const privacy_url = req.body.privacy_file?.url || req.body.privacy_url || "";

  const data = {
    business_name: req.body.business_name !== undefined ? req.body.business_name : current.business_name,
    contact_number: req.body.contact_number,
    email: req.body.email,
    address: req.body.address,
    pickup_address: req.body.pickup_address,
    hours: req.body.hours,
    facebook,
    instagram,
    social_links: req.body.social_links,
    terms_url,
    privacy_url,
    terms_file: req.body.terms_file,
    privacy_file: req.body.privacy_file,
    years_of_experience: req.body.years_of_experience,
    custom_event_setup_price: req.body.custom_event_setup_price,
    custom_food_and_event_price: req.body.custom_food_and_event_price,
    max_bookings_per_day: req.body.max_bookings_per_day,
  };

  const updated = await BusinessInfo.findOneAndUpdate(
    {},
    data,
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  const trackFields = [
    "business_name",
    "contact_number",
    "email",
    "address",
    "pickup_address",
    "hours",
    "facebook",
    "instagram",
    "terms_url",
    "privacy_url",
    "years_of_experience",
    "custom_event_setup_price",
    "custom_food_and_event_price",
    "max_bookings_per_day"
  ];

  const changes = {};
  for (const field of trackFields) {
    if (req.body[field] !== undefined) {
      const oldVal = current[field] !== undefined && current[field] !== null ? String(current[field]) : "";
      const newVal = req.body[field] !== undefined && req.body[field] !== null ? String(req.body[field]) : "";
      if (oldVal !== newVal) {
        changes[field] = {
          from: current[field] !== undefined && current[field] !== null ? current[field] : "—",
          to: req.body[field] !== undefined && req.body[field] !== null ? req.body[field] : "—"
        };
      }
    }
  }

  const changedFieldNames = Object.keys(changes);
  const detailParts =
    changedFieldNames.length > 0
      ? changedFieldNames.join(", ")
      : Object.keys(req.body).join(", ");

  await logAction({
    user_id: req.user?._id || req.user?.id,
    action: "business_info_updated",
    entity_type: "business_info",
    entity_id: updated._id,
    details: `Updated business information — Fields: ${detailParts}`,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "businessInfo", action: "update" });
    io.emit("system:refresh", { type: "systemLog", action: "create" });
  }

  res.json(updated);
});
