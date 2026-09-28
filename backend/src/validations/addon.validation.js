const Joi = require("joi");

exports.addonSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().allow("").optional(),
  price: Joi.number().min(0).optional(),
  pricing_type: Joi.string().valid("fixed", "quantity").optional(),
  available: Joi.boolean().optional(),
});

exports.addonUpdateSchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().allow("").optional(),
  price: Joi.number().min(0).optional(),
  pricing_type: Joi.string().valid("fixed", "quantity").optional(),
  available: Joi.boolean().optional(),
});
