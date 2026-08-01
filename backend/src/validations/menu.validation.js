const Joi = require("joi");

exports.menuSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().required(),
  price: Joi.number().optional(),
  available: Joi.boolean().optional()
});

exports.menuUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  category: Joi.string().optional(),
  price: Joi.number().optional(),
  available: Joi.boolean().optional()
});