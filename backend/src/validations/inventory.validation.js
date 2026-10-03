const Joi = require("joi");
const { catalogNameRule, safeTextRule } = require("./rules.common");

exports.inventorySchema = Joi.object({
  item_name: catalogNameRule("Item name", { min: 2, max: 100, required: true, allowEmpty: false }),
  identifier: Joi.string().optional(),
  quantity: Joi.number().min(0).required(),
  low_stock_threshold: Joi.number().integer().min(1).optional().allow(null, ""),
  lowStockThreshold: Joi.number().integer().min(1).optional().allow(null, ""),
  category: safeTextRule("Category", { max: 50, required: false, allowEmpty: true }),
  available: Joi.boolean().optional(),
  damaged_quantity: Joi.number().min(0).optional(),
  missing_quantity: Joi.number().min(0).optional(),
  reason: safeTextRule("Reason", { max: 200, required: false, allowEmpty: true }),
}).unknown(true);

exports.inventoryUpdateSchema = Joi.object({
  item_name: catalogNameRule("Item name", { min: 2, max: 100, required: false, allowEmpty: false }),
  identifier: Joi.string().optional(),
  quantity: Joi.number().min(0).optional(),
  low_stock_threshold: Joi.number().integer().min(1).optional().allow(null, ""),
  lowStockThreshold: Joi.number().integer().min(1).optional().allow(null, ""),
  category: safeTextRule("Category", { max: 50, required: false, allowEmpty: true }),
  available: Joi.boolean().optional(),
  damaged_quantity: Joi.number().min(0).optional(),
  missing_quantity: Joi.number().min(0).optional(),
  reason: safeTextRule("Reason", { max: 200, required: false, allowEmpty: true }),
}).unknown(true);