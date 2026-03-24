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
  package_id: Joi.string().optional(),
  manager_id: Joi.string().optional(),
  staff_ids: Joi.array().items(Joi.string()).optional(),
  inquiry_id: Joi.string().optional(),
  event_type: Joi.string().required(),
  event_theme: Joi.string().optional(),
  event_date: Joi.date()
    .required()
    .custom(noPastDate, "no past dates")
    .messages({
      "date.base": "Event date must be a valid date.",
      "date.min": "Event date must be today or later."
    }),
  start_time: Joi.string().optional(),
  guest_count: Joi.number().required(),
  duration_hours: Joi.number().optional(),
  include_food: Joi.boolean().optional(),
  venue_type: Joi.string().optional(),
  indoor_outdoor: Joi.string().optional(),
  province: Joi.string().optional(),
  municipality: Joi.string().optional(),
  barangay: Joi.string().optional(),
  street: Joi.string().optional(),
  landmark: Joi.string().optional(),
  zip_code: Joi.string().optional(),
  venue_contact_name: Joi.string().optional(),
  venue_contact_phone: Joi.string().optional(),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  dietary_restrictions: Joi.string().optional(),
  allergies: Joi.string().optional(),
  special_requests: Joi.string().optional(),
  additional_services: Joi.array().items(Joi.string()).optional(),
  contact_first_name: Joi.string().optional(),
  contact_last_name: Joi.string().optional(),
  contact_email: Joi.string().email().optional(),
  contact_phone: Joi.string().optional(),
  contact_alt_phone: Joi.string().optional(),
  contact_method: Joi.string().optional(),
  total_price: Joi.number().required(),
  payment_method: Joi.string().optional(),
  payment_status: Joi.string().optional(),
  status: Joi.string().optional()
});