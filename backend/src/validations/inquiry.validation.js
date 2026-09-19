const Joi = require("joi");

const PH_MOBILE_REGEX = /^09\d{9}$/;
const PH_ZIP_REGEX = /^\d{4}$/;

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
  event_type: Joi.string().trim().max(50).required().messages({
    "string.empty": "Event type is required.",
    "string.max": "Event type cannot exceed 50 characters."
  }),
  booking_for: Joi.string().valid("myself", "someone_else").optional(),
  celebrant_name: Joi.string().trim().max(80).allow("").optional().messages({
    "string.max": "Celebrant name cannot exceed 80 characters."
  }),
  event_theme: Joi.string().trim().max(100).allow("").optional().messages({
    "string.max": "Event theme cannot exceed 100 characters."
  }),
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
  venue_type: Joi.string().trim().max(60).allow("").optional(),
  province: Joi.string().trim().max(50).allow("").optional(),
  municipality: Joi.string().trim().max(50).allow("").optional(),
  barangay: Joi.string().trim().max(50).allow("").optional(),
  street: Joi.string().trim().max(150).allow("").optional().messages({
    "string.max": "Street address cannot exceed 150 characters."
  }),
  landmark: Joi.string().trim().max(100).allow("").optional().messages({
    "string.max": "Landmark cannot exceed 100 characters."
  }),
  zip_code: Joi.string().trim().pattern(PH_ZIP_REGEX).allow("").optional().messages({
    "string.pattern.base": "ZIP code must be a 4-digit number (e.g. 4200)."
  }),
  selected_menu: Joi.array().optional(),
  dietary_requirements: Joi.string().trim().max(300).allow("").optional().messages({
    "string.max": "Dietary requirements cannot exceed 300 characters."
  }),
  dietary_restrictions: Joi.string().trim().max(300).allow("").optional().messages({
    "string.max": "Dietary restrictions cannot exceed 300 characters."
  }),
  allergies: Joi.string().trim().max(300).allow("").optional().messages({
    "string.max": "Allergies note cannot exceed 300 characters."
  }),
  special_requests: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Special requests cannot exceed 500 characters."
  }),
  custom_setup_notes: Joi.string().trim().max(1000).allow("").optional().messages({
    "string.max": "Custom setup notes cannot exceed 1,000 characters."
  }),
  custom_setup_scope: Joi.array().items(Joi.string().trim().max(100)).max(15).optional(),
  inspiration_images: Joi.array().items(Joi.string()).max(5).optional().messages({
    "array.max": "You can upload a maximum of 5 inspiration photos."
  }),
  budget_range: Joi.string().trim().max(50).allow("").optional(),
  estimated_budget: Joi.alternatives().try(Joi.string().trim().max(50), Joi.number().min(0).max(10000000)).allow("").optional(),
  contact_first_name: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Contact first name is required.",
    "string.min": "Contact first name must be at least 2 characters.",
    "string.max": "Contact first name cannot exceed 50 characters."
  }),
  contact_last_name: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Contact last name is required.",
    "string.min": "Contact last name must be at least 2 characters.",
    "string.max": "Contact last name cannot exceed 50 characters."
  }),
  contact_email: Joi.string().trim().email().max(100).required().messages({
    "string.empty": "Contact email is required.",
    "string.email": "Contact email must be a valid email address.",
    "string.max": "Contact email cannot exceed 100 characters."
  }),
  contact_phone: Joi.string().trim().pattern(PH_MOBILE_REGEX).required().messages({
    "string.empty": "Contact phone number is required.",
    "string.pattern.base": "Contact phone must be an 11-digit Philippine mobile number starting with 09 (e.g. 09123456789)."
  }),
  contact_alt_phone: Joi.string().trim().pattern(PH_MOBILE_REGEX).allow("").optional().messages({
    "string.pattern.base": "Alternate phone must be an 11-digit Philippine mobile number starting with 09."
  }),
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
