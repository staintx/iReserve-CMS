const Joi = require("joi");

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
  event_type: Joi.string().required(),
  booking_for: Joi.string().valid("myself", "someone_else").optional(),
  celebrant_name: Joi.string().allow("").optional(),
  event_theme: Joi.string().allow("").optional(),
  event_palette: Joi.array().items(Joi.string()).optional(),
  event_date: Joi.date()
    .required()
    .custom(noPastDate, "no past dates")
    .messages({
      "date.base": "Event date must be a valid date.",
      "date.min": "Event date must be today or later."
    }),
  start_time: Joi.string().allow("").optional(),
  guest_count: Joi.number().min(1).required(),
  duration_hours: Joi.number().allow(null, "").optional(),
  service_type: Joi.string().valid("Food Only", "Event Setup Only", "Food and Event Setup").allow("").optional(),
  delivery_method: Joi.string().valid("delivery", "pickup", "setup").allow("").optional(),
  include_food: Joi.boolean().optional(),
  venue_type: Joi.string().allow("").optional(),
  province: Joi.string().allow("").optional(),
  municipality: Joi.string().allow("").optional(),
  barangay: Joi.string().allow("").optional(),
  street: Joi.string().allow("").optional(),
  landmark: Joi.string().allow("").optional(),
  zip_code: Joi.string().allow("").optional(),
  selected_menu: Joi.array().optional(),
  dietary_requirements: Joi.string().allow("").optional(),
  dietary_restrictions: Joi.string().allow("").optional(),
  allergies: Joi.string().allow("").optional(),
  special_requests: Joi.string().allow("").optional(),
  custom_setup_notes: Joi.string().allow("").optional(),
  custom_setup_scope: Joi.array().optional(),
  inspiration_images: Joi.array().items(Joi.string()).optional(),
  budget_range: Joi.string().allow("").optional(),
  estimated_budget: Joi.alternatives().try(Joi.string(), Joi.number()).allow("").optional(),
  contact_first_name: Joi.string().allow("").optional(),
  contact_last_name: Joi.string().allow("").optional(),
  contact_email: Joi.string().email().allow("").optional(),
  contact_phone: Joi.string().allow("").optional(),
  contact_alt_phone: Joi.string().allow("").optional(),
  cf_turnstile_token: Joi.string().allow("").optional(),
}).unknown(true);
