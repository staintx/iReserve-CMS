const Joi = require("joi");

const PH_MOBILE_REGEX = /^09\d{9}$/;
const PH_ZIP_REGEX = /^\d{4}$/;

exports.quoteSchema = Joi.object({
  customer_id: Joi.string().optional(),
  service_type: Joi.string().trim().max(50).required(),
  event_type: Joi.string().trim().max(50).optional(),
  event_theme: Joi.string().trim().max(100).optional(),
  event_date: Joi.date().empty("").optional(),
  start_time: Joi.string().trim().max(20).optional(),
  guest_count: Joi.number().integer().min(1).max(2000).empty("").optional().messages({
    "number.integer": "Guest count must be a whole number of guests.",
    "number.max": "Guest count cannot exceed 2,000 for standard quote requests."
  }),
  duration_hours: Joi.number().integer().min(1).max(24).empty("").optional(),
  venue_type: Joi.string().trim().max(60).empty("").optional(),
  venue_size: Joi.string().trim().max(50).empty("").optional(),
  indoor_outdoor: Joi.string().trim().max(20).empty("").optional(),
  province: Joi.string().trim().max(50).optional(),
  municipality: Joi.string().trim().max(50).optional(),
  barangay: Joi.string().trim().max(50).optional(),
  street: Joi.string().trim().max(150).optional().messages({
    "string.max": "Street address cannot exceed 150 characters."
  }),
  landmark: Joi.string().trim().max(100).optional().messages({
    "string.max": "Landmark cannot exceed 100 characters."
  }),
  zip_code: Joi.string().trim().pattern(PH_ZIP_REGEX).optional().messages({
    "string.pattern.base": "ZIP code must be a 4-digit number."
  }),
  budget_range: Joi.string().trim().max(50).empty("").optional(),
  furniture_setup: Joi.array().items(Joi.string().trim().max(100)).optional(),
  dining_inventory: Joi.array().items(Joi.string().trim().max(100)).optional(),
  add_ons: Joi.array().items(Joi.string().trim().max(100)).optional(),
  lighting_options: Joi.array().items(Joi.string().trim().max(100)).optional(),
  decor_options: Joi.array().items(Joi.string().trim().max(100)).optional(),
  theme_colors: Joi.string().trim().max(100).empty("").optional(),
  delivery_date: Joi.date().empty("").optional(),
  delivery_time: Joi.string().trim().max(20).empty("").optional(),
  delivery_method: Joi.string().trim().max(30).optional(),
  pickup_date: Joi.date().empty("").optional(),
  pickup_time: Joi.string().trim().max(20).empty("").optional(),
  delivery_instructions: Joi.string().trim().max(250).empty("").optional(),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  menu_other: Joi.string().trim().max(200).empty("").optional(),
  dietary_restrictions: Joi.string().trim().max(300).empty("").optional(),
  allergies: Joi.string().trim().max(300).empty("").optional(),
  full_name: Joi.string().trim().min(2).max(100).optional().messages({
    "string.min": "Full name must be at least 2 characters.",
    "string.max": "Full name cannot exceed 100 characters."
  }),
  email: Joi.string().trim().email().max(100).optional().messages({
    "string.email": "Enter a valid email address.",
    "string.max": "Email cannot exceed 100 characters."
  }),
  phone: Joi.string().trim().pattern(PH_MOBILE_REGEX).optional().messages({
    "string.pattern.base": "Phone must be an 11-digit Philippine mobile number starting with 09."
  }),
  contact_method: Joi.string().trim().max(30).optional(),
  best_time_to_call: Joi.string().trim().max(50).empty("").optional(),
  inspiration_links: Joi.string().trim().max(500).empty("").optional(),
  attachments: Joi.array().items(Joi.string()).max(10).optional(),
  notes: Joi.string().trim().max(1000).empty("").optional().messages({
    "string.max": "Notes cannot exceed 1,000 characters."
  }),
  agree_terms: Joi.boolean().optional(),
  agree_privacy: Joi.boolean().optional(),
  status: Joi.string().optional()
}).unknown(true);

exports.quoteUpdateSchema = exports.quoteSchema.fork(
  ["service_type"],
  (schema) => schema.optional()
);
