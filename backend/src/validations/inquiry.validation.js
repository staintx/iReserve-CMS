const Joi = require("joi");
const {
  nameRule,
  phoneRule,
  addressRule,
  safeTextRule,
  PH_ZIP_REGEX
} = require("./rules.common");

const noPastDate = (value, helpers) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return helpers.error("date.base");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return helpers.error("date.min");
  return value;
};

exports.inquirySchema = Joi.object({
  package_id: Joi.string().allow("").optional(),
  customer_id: Joi.string().allow("").optional(),
  event_type: safeTextRule("Event type", { max: 50, required: true, allowEmpty: false }),
  booking_for: Joi.string().valid("myself", "someone_else").optional(),
  celebrant_name: nameRule("Celebrant name", { min: 2, max: 80, required: false, allowEmpty: true }),
  event_theme: safeTextRule("Event theme", { max: 100, required: false, allowEmpty: true }),
  event_palette: Joi.array().items(Joi.string().trim().max(30)).max(6).optional().messages({
    "array.max": "You can select up to 6 colors."
  }),
  event_date: Joi.date()
    .required()
    .custom(noPastDate, "no past dates")
    .messages({
      "date.base": "Event date must be a valid date.",
      "date.min": "Event date must be today or later."
    }),
  start_time: Joi.string().trim().max(20).allow("").optional(),
  guest_count: Joi.number().integer().min(1).max(2000).required().messages({
    "number.base": "Guest count must be a number.",
    "number.integer": "Guest count must be a whole number of guests.",
    "number.min": "Guest count must be at least 1.",
    "number.max": "Guest count cannot exceed 2,000 for standard inquiry submission."
  }),
  duration_hours: Joi.number().integer().min(1).max(24).allow(null, "").optional().messages({
    "number.min": "Duration must be at least 1 hour.",
    "number.max": "Duration cannot exceed 24 hours."
  }),
  service_type: Joi.string().valid("Food Only", "Event Setup Only", "Food and Event Setup").allow("").optional(),
  delivery_method: Joi.string().valid("delivery", "pickup", "setup").allow("").optional(),
  include_food: Joi.boolean().optional(),
  venue_type: safeTextRule("Venue type", { max: 60, required: false, allowEmpty: true }),
  province: safeTextRule("Province", { max: 50, required: false, allowEmpty: true }),
  municipality: safeTextRule("Municipality", { max: 50, required: false, allowEmpty: true }),
  barangay: safeTextRule("Barangay", { max: 50, required: false, allowEmpty: true }),
  street: addressRule("Street address", { max: 150, required: false, allowEmpty: true }),
  landmark: addressRule("Landmark", { max: 100, required: false, allowEmpty: true }),
  zip_code: Joi.string().trim().pattern(PH_ZIP_REGEX).allow("").optional().messages({
    "string.pattern.base": "ZIP code must be a 4-digit number (e.g. 4200)."
  }),
  selected_menu: Joi.array().optional(),
  dietary_requirements: safeTextRule("Dietary requirements", { max: 300, required: false, allowEmpty: true }),
  dietary_restrictions: safeTextRule("Dietary restrictions", { max: 300, required: false, allowEmpty: true }),
  allergies: safeTextRule("Allergies", { max: 300, required: false, allowEmpty: true }),
  special_requests: safeTextRule("Special requests", { max: 500, required: false, allowEmpty: true }),
  custom_setup_notes: safeTextRule("Custom setup notes", { max: 1000, required: false, allowEmpty: true }),
  custom_setup_scope: Joi.array().items(safeTextRule("Custom setup scope", { max: 100, required: false, allowEmpty: true })).max(15).optional(),
  inspiration_images: Joi.array().items(Joi.string()).max(5).optional().messages({
    "array.max": "You can upload a maximum of 5 inspiration photos."
  }),
  budget_range: Joi.string().trim().max(50).allow("").optional(),
  estimated_budget: Joi.alternatives().try(Joi.string().trim().max(50), Joi.number().min(0).max(10000000)).allow("").optional(),
  contact_first_name: nameRule("Contact first name", { min: 2, max: 50, required: true, allowEmpty: false }),
  contact_last_name: nameRule("Contact last name", { min: 2, max: 50, required: true, allowEmpty: false }),
  contact_email: Joi.string().trim().email().max(100).required().messages({
    "string.empty": "Contact email is required.",
    "string.email": "Contact email must be a valid email address.",
    "string.max": "Contact email cannot exceed 100 characters."
  }),
  contact_phone: phoneRule("Contact phone", { required: true, allowEmpty: false }),
  contact_alt_phone: phoneRule("Alternate phone", { required: false, allowEmpty: true }),
  payment_method: Joi.string().valid("cash", "online", "paymongo", "unselected").allow("").optional(),
  cf_turnstile_token: Joi.string().allow("").optional(),
}).unknown(true);

// Update schema relaxes required fields so partial edits can succeed, but maintains all bounds
exports.inquiryUpdateSchema = exports.inquirySchema.fork(
  [
    "contact_first_name",
    "contact_last_name",
    "contact_email",
    "contact_phone",
    "event_type",
    "event_date",
    "guest_count"
  ],
  (schema) => schema.optional()
);
