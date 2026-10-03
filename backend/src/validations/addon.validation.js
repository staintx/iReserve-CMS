const Joi = require("joi");
const { catalogNameRule, safeTextRule } = require("./rules.common");

exports.addonSchema = Joi.object({
  name: catalogNameRule("Addon name", { min: 2, max: 100, required: true }),
  description: safeTextRule("Description", { max: 1000, required: false, allowEmpty: true }),
  price: Joi.number().min(0).optional(),
  pricing_type: Joi.string().valid("fixed", "quantity").optional(),
  available: Joi.boolean().optional(),
}).unknown(true);

exports.addonUpdateSchema = Joi.object({
  name: catalogNameRule("Addon name", { min: 2, max: 100, required: false }),
  description: safeTextRule("Description", { max: 1000, required: false, allowEmpty: true }),
  price: Joi.number().min(0).optional(),
  pricing_type: Joi.string().valid("fixed", "quantity").optional(),
  available: Joi.boolean().optional(),
}).unknown(true);
