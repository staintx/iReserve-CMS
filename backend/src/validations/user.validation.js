const Joi = require("joi");
const { passwordRule } = require("./password.rule");
const { nameRule, phoneRule, usernameRule, addressRule, safeTextRule } = require("./rules.common");

exports.updateUserSchema = Joi.object({
  first_name: nameRule("First name", { min: 2, max: 50, required: false, allowEmpty: true }),
  last_name: nameRule("Last name", { min: 2, max: 50, required: false, allowEmpty: true }),
  full_name: nameRule("Full name", { min: 2, max: 100, required: false, allowEmpty: true }),
  email: Joi.string().trim().email().optional(),
  phone: phoneRule("Phone number", { required: false, allowEmpty: true }),
  alt_phone: phoneRule("Alternate phone number", { required: false, allowEmpty: true }),
  address: addressRule("Address", { max: 200, required: false, allowEmpty: true }),
  username: usernameRule({ required: false, allowEmpty: true }),
  position: safeTextRule("Position", { max: 60, required: false, allowEmpty: true }),
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