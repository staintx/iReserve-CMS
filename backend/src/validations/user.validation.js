const Joi = require("joi");

exports.updateUserSchema = Joi.object({
  full_name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow("").optional(),
  address: Joi.string().allow("").optional(),
  username: Joi.string().allow("").optional()
});

exports.changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required()
});