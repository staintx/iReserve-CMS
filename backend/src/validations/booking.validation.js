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

exports.bookingSchema = Joi.object({
  customer_id: Joi.string().allow("").optional(),
  package_id: Joi.string().allow("").optional(),
  event_manager_id: Joi.string().allow("").optional(),
  staff_ids: Joi.array().items(Joi.string()).optional(),

  event_type: Joi.string().trim().max(50).required(),
  booking_for: Joi.string().valid("myself", "someone_else").optional(),
  celebrant_name: Joi.string().trim().max(80).allow("").optional(),
  event_theme: Joi.string().trim().max(100).allow("").optional(),
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
    "number.integer": "Guest count must be an integer.",
    "number.min": "Guest count must be at least 1.",
    "number.max": "Guest count cannot exceed 2,000."
  }),
  duration_hours: Joi.number().integer().min(1).max(24).allow(null, "").optional(),
  include_food: Joi.boolean().optional(),
  venue_type: Joi.string().trim().max(60).allow("").optional(),
  indoor_outdoor: Joi.string().trim().max(20).allow("").optional(),
  province: Joi.string().trim().max(50).allow("").optional(),
  municipality: Joi.string().trim().max(50).allow("").optional(),
  barangay: Joi.string().trim().max(50).allow("").optional(),
  street: Joi.string().trim().max(150).allow("").optional(),
  landmark: Joi.string().trim().max(100).allow("").optional(),
  zip_code: Joi.string().trim().pattern(PH_ZIP_REGEX).allow("").optional(),
  venue_contact_name: Joi.string().trim().max(80).allow("").optional(),
  venue_contact_phone: Joi.string().trim().pattern(PH_MOBILE_REGEX).allow("").optional(),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  dietary_restrictions: Joi.string().trim().max(300).allow("").optional(),
  allergies: Joi.string().trim().max(300).allow("").optional(),
  special_requests: Joi.string().trim().max(500).allow("").optional(),
  budget_min: Joi.alternatives().try(Joi.string(), Joi.number().min(0)).allow("").optional(),
  budget_max: Joi.alternatives().try(Joi.string(), Joi.number().min(0)).allow("").optional(),
  additional_services: Joi.array().items(Joi.string().trim().max(100)).optional(),
  contact_first_name: Joi.string().trim().min(2).max(50).allow("").optional(),
  contact_last_name: Joi.string().trim().min(2).max(50).allow("").optional(),
  contact_email: Joi.string().trim().email().max(100).allow("").optional(),
  contact_phone: Joi.string().trim().pattern(PH_MOBILE_REGEX).allow("").optional(),
  contact_alt_phone: Joi.string().trim().pattern(PH_MOBILE_REGEX).allow("").optional(),
  contact_method: Joi.string().trim().max(30).allow("").optional(),
  total_price: Joi.number().min(0).max(10000000).required().messages({
    "number.min": "Total price cannot be negative.",
    "number.max": "Total price exceeds maximum allowable limit."
  }),
  payment_method: Joi.string().allow("").optional(),
  payment_status: Joi.string().valid("pending", "deposit_paid", "fully_paid", "refund_requested", "refunded").allow("").optional(),
  paymongo_checkout_session_id: Joi.string().allow("").optional(),
  paymongo_payment_intent_id: Joi.string().allow("").optional(),
  status: Joi.string().valid("pending deposit", "confirmed", "preparing", "ongoing", "completed", "cancelled").allow("").optional()
}).unknown(true);