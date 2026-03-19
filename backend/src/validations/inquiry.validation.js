const Joi = require("joi");

const menuItemSchema = Joi.object({
  name: Joi.string().required(),
  image_url: Joi.string().allow("").optional(),
  note: Joi.string().allow("").optional(),
  price: Joi.number().empty("").optional()
});

const serviceItemSchema = Joi.object({
  name: Joi.string().required(),
  quantity: Joi.number().empty("").optional(),
  price: Joi.number().empty("").optional()
});

exports.inquirySchema = Joi.object({
  customer_id: Joi.string().optional(),
  package_id: Joi.string().optional(),
  event_type: Joi.string().required(),
  event_theme: Joi.string().optional(),
  event_date: Joi.date().required(),
  start_time: Joi.string().optional(),
  guest_count: Joi.number().required(),
  duration_hours: Joi.number().empty("").optional(),
  include_food: Joi.boolean().optional(),
  service_type: Joi.string().optional(),
  venue_type: Joi.string().optional(),
  indoor_outdoor: Joi.string().optional(),
  province: Joi.string().optional(),
  municipality: Joi.string().optional(),
  barangay: Joi.string().optional(),
  street: Joi.string().optional(),
  landmark: Joi.string().optional(),
  zip_code: Joi.string().optional(),
  venue_contact_name: Joi.string().optional(),
  venue_contact_phone: Joi.string().pattern(/^09(?:[\s-]?\d){8,9}$/).optional(),
  budget_min: Joi.number().empty("").optional(),
  budget_max: Joi.number().empty("").optional(),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  menu_items: Joi.array().items(menuItemSchema).optional(),
  dietary_restrictions: Joi.string().optional(),
  allergies: Joi.string().optional(),
  special_requests: Joi.string().optional(),
  additional_services: Joi.array().items(Joi.string()).optional(),
  service_items: Joi.array().items(serviceItemSchema).optional(),
  contact_first_name: Joi.string().optional(),
  contact_last_name: Joi.string().optional(),
  contact_email: Joi.string().email().optional(),
  contact_phone: Joi.string().pattern(/^09(?:[\s-]?\d){8,9}$/).optional(),
  contact_alt_phone: Joi.string().pattern(/^09(?:[\s-]?\d){8,9}$/).optional(),
  contact_method: Joi.string().optional(),
  payment_method: Joi.string().optional(),
  package_amount: Joi.number().empty("").optional(),
  quote_amount: Joi.number().optional(),
  quote_notes: Joi.string().optional(),
  status: Joi.string().optional()
});

exports.inquiryUpdateSchema = Joi.object({
  customer_id: Joi.string().optional(),
  package_id: Joi.string().optional(),
  event_type: Joi.string().optional(),
  event_theme: Joi.string().optional(),
  event_date: Joi.date().empty("").optional(),
  start_time: Joi.string().optional(),
  guest_count: Joi.number().empty("").optional(),
  duration_hours: Joi.number().empty("").optional(),
  include_food: Joi.boolean().optional(),
  service_type: Joi.string().optional(),
  venue_type: Joi.string().optional(),
  indoor_outdoor: Joi.string().optional(),
  province: Joi.string().optional(),
  municipality: Joi.string().optional(),
  barangay: Joi.string().optional(),
  street: Joi.string().optional(),
  landmark: Joi.string().optional(),
  zip_code: Joi.string().optional(),
  venue_contact_name: Joi.string().optional(),
  venue_contact_phone: Joi.string().pattern(/^09(?:[\s-]?\d){8,9}$/).optional(),
  budget_min: Joi.number().empty("").optional(),
  budget_max: Joi.number().empty("").optional(),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  menu_items: Joi.array().items(menuItemSchema).optional(),
  dietary_restrictions: Joi.string().optional(),
  allergies: Joi.string().optional(),
  special_requests: Joi.string().optional(),
  additional_services: Joi.array().items(Joi.string()).optional(),
  service_items: Joi.array().items(serviceItemSchema).optional(),
  contact_first_name: Joi.string().optional(),
  contact_last_name: Joi.string().optional(),
  contact_email: Joi.string().email().optional(),
  contact_phone: Joi.string().pattern(/^09(?:[\s-]?\d){8,9}$/).optional(),
  contact_alt_phone: Joi.string().pattern(/^09(?:[\s-]?\d){8,9}$/).optional(),
  contact_method: Joi.string().optional(),
  payment_method: Joi.string().optional(),
  package_amount: Joi.number().empty("").optional(),
  quote_amount: Joi.number().optional(),
  quote_notes: Joi.string().optional(),
  status: Joi.string().optional()
});

exports.inquiryStatusSchema = Joi.object({
  status: Joi.string().valid("cancelled").required()
});