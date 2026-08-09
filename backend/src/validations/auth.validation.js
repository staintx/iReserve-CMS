const Joi = require("joi");
const { passwordRule } = require("./password.rule");

exports.registerSchema = Joi.object({
  full_name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: passwordRule
});

exports.loginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required()
});

exports.verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().trim().length(6).required()
});

exports.resendOtpSchema = Joi.object({
  email: Joi.string().email().required()
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

exports.resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordRule
});
