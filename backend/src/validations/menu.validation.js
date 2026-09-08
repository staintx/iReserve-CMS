const Joi = require("joi");

exports.menuSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow("").optional(),
  category: Joi.string().required(),
  price: Joi.number().optional(),
  available: Joi.boolean().optional()
});

exports.menuUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().allow("").optional(),
  category: Joi.string().optional(),
  price: Joi.number().optional(),
  available: Joi.boolean().optional()
});