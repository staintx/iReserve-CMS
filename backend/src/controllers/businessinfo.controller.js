const BusinessInfo = require("../models/BusinessInfo");
const asyncHandler = require("../utils/asyncHandler");
const logAction = require("../utils/logAction");

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

exports.update = asyncHandler(async (req, res) => {
  const current = (await BusinessInfo.findOne()) || {};

  const data = {
    business_name: req.body.business_name,
    contact_number: req.body.contact_number,
    email: req.body.email,
    address: req.body.address,
    pickup_address: req.body.pickup_address,
    hours: req.body.hours,
    facebook: req.body.facebook,
    instagram: req.body.instagram,
    terms_url: req.body.terms_url,
    privacy_url: req.body.privacy_url,
    deposit_percentage: req.body.deposit_percentage,
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
    "deposit_percentage",
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
