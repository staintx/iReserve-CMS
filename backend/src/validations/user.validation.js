const Joi = require("joi");

exports.updateUserSchema = Joi.object({
  full_name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  address: Joi.string().allow("").optional()
});