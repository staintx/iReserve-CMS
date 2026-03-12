const Joi = require("joi");

exports.inquirySchema = Joi.object({
  customer_id: Joi.string().required(),
  event_type: Joi.string().required(),
  event_date: Joi.date().required(),
  guest_count: Joi.number().required(),
  service_type: Joi.string().required(),
  venue: Joi.string().required(),
  budget_min: Joi.number().optional(),
  budget_max: Joi.number().optional(),
  menu_preferences: Joi.string().optional(),
  dietary_needs: Joi.string().optional(),
  furniture_setup: Joi.string().optional(),
  decor_lighting: Joi.string().optional(),
  additional_notes: Joi.string().optional(),
  status: Joi.string().optional()
});