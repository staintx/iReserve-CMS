const Joi = require("joi");
const { passwordRule } = require("./password.rule");

exports.registerSchema = Joi.object({
  full_name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: passwordRule,
  "cf-turnstile-response": Joi.string().optional().allow("")
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
