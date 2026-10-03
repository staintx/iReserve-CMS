const Joi = require("joi");
const { nameRule, phoneRule, usernameRule, safeTextRule } = require("./rules.common");
const { passwordRule } = require("./password.rule");

exports.staffSchema = Joi.object({
  full_name: nameRule("Full name", { min: 2, max: 100, required: true, allowEmpty: false }),
  email: Joi.string().trim().email().required(),
  password: passwordRule,
  role: Joi.string().valid("staff", "manager").required(),
  phone: phoneRule("Phone number", { required: false, allowEmpty: true }),
  username: usernameRule({ required: false, allowEmpty: true }),
  position: safeTextRule("Position", { max: 60, required: false, allowEmpty: true }),
  is_active: Joi.boolean().optional(),
});

exports.staffUpdateSchema = Joi.object({
  full_name: nameRule("Full name", { min: 2, max: 100, required: false, allowEmpty: false }),
  email: Joi.string().trim().email().optional(),
  password: passwordRule.optional(),
  role: Joi.string().valid("staff", "manager").optional(),
  phone: phoneRule("Phone number", { required: false, allowEmpty: true }),
  username: usernameRule({ required: false, allowEmpty: true }),
  position: safeTextRule("Position", { max: 60, required: false, allowEmpty: true }),
  is_active: Joi.boolean().optional(),
});