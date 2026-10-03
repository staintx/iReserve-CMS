const Joi = require("joi");
const {
  nameRule,
  phoneRule,
  addressRule,
  safeTextRule,
  PH_ZIP_REGEX
} = require("./rules.common");

exports.quoteSchema = Joi.object({
  customer_id: Joi.string().optional(),
  service_type: safeTextRule("Service type", { max: 50, required: true, allowEmpty: false }),
  event_type: safeTextRule("Event type", { max: 50, required: false, allowEmpty: true }),
  event_theme: safeTextRule("Event theme", { max: 100, required: false, allowEmpty: true }),
  event_date: Joi.date().empty("").optional(),
  start_time: Joi.string().trim().max(20).optional(),
  guest_count: Joi.number().integer().min(1).max(2000).empty("").optional().messages({
    "number.integer": "Guest count must be a whole number of guests.",
    "number.max": "Guest count cannot exceed 2,000 for standard quote requests."
  }),
  duration_hours: Joi.number().integer().min(1).max(24).empty("").optional(),
  venue_type: safeTextRule("Venue type", { max: 60, required: false, allowEmpty: true }),
  venue_size: safeTextRule("Venue size", { max: 50, required: false, allowEmpty: true }),
  indoor_outdoor: Joi.string().trim().max(20).empty("").optional(),
  province: safeTextRule("Province", { max: 50, required: false, allowEmpty: true }),
  municipality: safeTextRule("Municipality", { max: 50, required: false, allowEmpty: true }),
  barangay: safeTextRule("Barangay", { max: 50, required: false, allowEmpty: true }),
  street: addressRule("Street address", { max: 150, required: false, allowEmpty: true }),
  landmark: addressRule("Landmark", { max: 100, required: false, allowEmpty: true }),
  zip_code: Joi.string().trim().pattern(PH_ZIP_REGEX).optional().messages({
    "string.pattern.base": "ZIP code must be a 4-digit number."
  }),
  budget_range: Joi.string().trim().max(50).empty("").optional(),
  furniture_setup: Joi.array().items(safeTextRule("Furniture item", { max: 100, required: false, allowEmpty: true })).optional(),
  dining_inventory: Joi.array().items(safeTextRule("Dining item", { max: 100, required: false, allowEmpty: true })).optional(),
  add_ons: Joi.array().items(safeTextRule("Addon item", { max: 100, required: false, allowEmpty: true })).optional(),
  lighting_options: Joi.array().items(safeTextRule("Lighting option", { max: 100, required: false, allowEmpty: true })).optional(),
  decor_options: Joi.array().items(safeTextRule("Decor option", { max: 100, required: false, allowEmpty: true })).optional(),
  theme_colors: safeTextRule("Theme colors", { max: 100, required: false, allowEmpty: true }),
  delivery_date: Joi.date().empty("").optional(),
  delivery_time: Joi.string().trim().max(20).empty("").optional(),
  delivery_method: Joi.string().trim().max(30).optional(),
  pickup_date: Joi.date().empty("").optional(),
  pickup_time: Joi.string().trim().max(20).empty("").optional(),
  delivery_instructions: safeTextRule("Delivery instructions", { max: 250, required: false, allowEmpty: true }),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  menu_other: safeTextRule("Menu other", { max: 200, required: false, allowEmpty: true }),
  dietary_restrictions: safeTextRule("Dietary restrictions", { max: 300, required: false, allowEmpty: true }),
  allergies: safeTextRule("Allergies", { max: 300, required: false, allowEmpty: true }),
  full_name: nameRule("Full name", { min: 2, max: 100, required: false, allowEmpty: true }),
  email: Joi.string().trim().email().max(100).optional().messages({
    "string.email": "Enter a valid email address.",
    "string.max": "Email cannot exceed 100 characters."
  }),
  phone: phoneRule("Phone", { required: false, allowEmpty: true }),
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
