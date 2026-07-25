const Joi = require("joi");

exports.packageSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  fullDescription: Joi.string().optional(),
  size: Joi.string().required(),
  price_min: Joi.number().required(),
  price_max: Joi.number().required(),
  available: Joi.boolean().optional(),
  booking_requirements: Joi.string().optional(),
  cancellation_policy: Joi.string().optional(),
  inclusions: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
  add_ons: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
  event_type: Joi.string().optional().allow(''),
  package_type: Joi.string().optional().allow(''),
  max_guests: Joi.number().optional().allow(null)
}).unknown(true);

exports.packageUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  fullDescription: Joi.string().optional(),
  size: Joi.string().optional(),
  price_min: Joi.number().optional(),
  price_max: Joi.number().optional(),
  available: Joi.boolean().optional(),
  booking_requirements: Joi.string().optional(),
  cancellation_policy: Joi.string().optional(),
  inclusions: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
  add_ons: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
  event_type: Joi.string().optional().allow(''),
  package_type: Joi.string().optional().allow(''),
  max_guests: Joi.number().optional().allow(null),
  gallery_to_remove: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional()
}).unknown(true);