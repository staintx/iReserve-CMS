const Joi = require("joi");
const { passwordRule } = require("./password.rule");

exports.registerSchema = Joi.object({
  // The signup form now sends first/last name. full_name stays accepted, not
  // required, for any caller still posting the old single-field shape — the
  // controller and the User model both already derive one from the other.
  first_name: Joi.string().trim().optional(),
  last_name: Joi.string().trim().allow("").optional(),
  full_name: Joi.string().trim().optional(),
  email: Joi.string().email().required(),
  password: passwordRule,
  "cf-turnstile-response": Joi.string().optional().allow("")
}).or("first_name", "full_name").messages({
  "object.missing": "Enter your first name.",
});

exports.loginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
  "cf-turnstile-response": Joi.string().optional().allow("")
});

exports.verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().trim().length(6).required(),
  "cf-turnstile-response": Joi.string().optional().allow("")
});

exports.resendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  "cf-turnstile-response": Joi.string().optional().allow("")
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  "cf-turnstile-response": Joi.string().optional().allow("")
});

exports.resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordRule,
  "cf-turnstile-response": Joi.string().optional().allow("")
});
