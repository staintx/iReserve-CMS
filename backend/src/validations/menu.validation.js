const Joi = require("joi");

exports.menuSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().required(),
  available: Joi.boolean().optional()
});