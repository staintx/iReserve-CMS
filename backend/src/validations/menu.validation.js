const Joi = require("joi");
const { catalogNameRule, safeTextRule, monetaryRule, MAX_FINANCIAL_AMOUNT } = require("./rules.common");

exports.menuSchema = Joi.object({
  name: catalogNameRule("Item name", { min: 2, max: 100, required: true }),
  description: safeTextRule("Description", { max: 1000, required: false, allowEmpty: true }),
  category: safeTextRule("Category", { max: 50, required: true, allowEmpty: false }),
  price: monetaryRule("Price", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }),
  available: Joi.boolean().optional()
}).unknown(true);

exports.menuUpdateSchema = Joi.object({
  name: catalogNameRule("Item name", { min: 2, max: 100, required: false }),
  description: safeTextRule("Description", { max: 1000, required: false, allowEmpty: true }),
  category: safeTextRule("Category", { max: 50, required: false, allowEmpty: true }),
  price: monetaryRule("Price", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }),
  available: Joi.boolean().optional()
}).unknown(true);