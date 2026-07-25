const Joi = require("joi");

const noPastDate = (value, helpers) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return helpers.error("date.base");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return helpers.error("date.min");
  return value;
};

exports.bookingSchema = Joi.object({
  customer_id: Joi.string().required(),
  package_id: Joi.string().allow("").optional(),
  event_manager_id: Joi.string().allow("").optional(),
  staff_ids: Joi.array().items(Joi.string()).optional(),

  event_type: Joi.string().required(),
  event_theme: Joi.string().allow("").optional(),
  event_date: Joi.date()
    .required()
    .custom(noPastDate, "no past dates")
    .messages({
      "date.base": "Event date must be a valid date.",
      "date.min": "Event date must be today or later."
    }),
  start_time: Joi.string().allow("").optional(),
  guest_count: Joi.number().required(),
  duration_hours: Joi.number().allow(null, "").optional(),
  include_food: Joi.boolean().optional(),
  venue_type: Joi.string().allow("").optional(),
  indoor_outdoor: Joi.string().allow("").optional(),
  province: Joi.string().allow("").optional(),
  municipality: Joi.string().allow("").optional(),
  barangay: Joi.string().allow("").optional(),
  street: Joi.string().allow("").optional(),
  landmark: Joi.string().allow("").optional(),
  zip_code: Joi.string().allow("").optional(),
  venue_contact_name: Joi.string().allow("").optional(),
  venue_contact_phone: Joi.string().allow("").optional(),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  dietary_restrictions: Joi.string().allow("").optional(),
  allergies: Joi.string().allow("").optional(),
  special_requests: Joi.string().allow("").optional(),
  budget_min: Joi.alternatives().try(Joi.string(), Joi.number()).allow("").optional(),
  budget_max: Joi.alternatives().try(Joi.string(), Joi.number()).allow("").optional(),
  additional_services: Joi.array().items(Joi.string()).optional(),
  contact_first_name: Joi.string().allow("").optional(),
  contact_last_name: Joi.string().allow("").optional(),
  contact_email: Joi.string().email().allow("").optional(),
  contact_phone: Joi.string().allow("").optional(),
  contact_alt_phone: Joi.string().allow("").optional(),
  contact_method: Joi.string().allow("").optional(),
  total_price: Joi.number().required(),
  payment_method: Joi.string().allow("").optional(),
  payment_status: Joi.string().valid("pending", "deposit_paid", "fully_paid", "refund_requested", "refunded").allow("").optional(),
  paymongo_checkout_session_id: Joi.string().allow("").optional(),
  paymongo_payment_intent_id: Joi.string().allow("").optional(),
  status: Joi.string().valid("pending deposit", "confirmed", "preparing", "ongoing", "completed", "cancelled").allow("").optional()
}).unknown(true);