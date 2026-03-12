const Joi = require("joi");

exports.bookingSchema = Joi.object({
  customer_id: Joi.string().required(),
  package_id: Joi.string().optional(),
  manager_id: Joi.string().optional(),
  staff_ids: Joi.array().items(Joi.string()).optional(),
  inquiry_id: Joi.string().optional(),
  event_type: Joi.string().required(),
  event_date: Joi.date().required(),
  guest_count: Joi.number().required(),
  venue: Joi.string().required(),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  additional_services: Joi.array().items(Joi.string()).optional(),
  total_price: Joi.number().required(),
  payment_status: Joi.string().optional(),
  status: Joi.string().optional()
});