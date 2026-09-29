const Joi = require("joi");
const { passwordRule } = require("./password.rule");

exports.updateUserSchema = Joi.object({
  first_name: Joi.string().trim().allow("").optional(),
  last_name: Joi.string().trim().allow("").optional(),
  full_name: Joi.string().trim().allow("").optional(),
  email: Joi.string().trim().email().optional(),
  phone: Joi.string().allow("").optional(),
  alt_phone: Joi.string().allow("").optional(),
  address: Joi.string().allow("").optional(),
  username: Joi.string().allow("").optional(),
  position: Joi.string().allow("").optional(),
  otp: Joi.string().trim().length(6).required().messages({
    "string.empty": "Verification code is required to save changes.",
    "string.length": "Verification code must be exactly 6 digits.",
    "any.required": "Verification code is required to save changes."
  })
});

// The current password is only compared against the stored hash, so it is never
// held to the complexity rules — users with an older password can still sign in
// and change it. Only the replacement must satisfy the policy.
exports.changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: passwordRule
});