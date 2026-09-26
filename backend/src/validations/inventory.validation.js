const Joi = require("joi");

exports.inventorySchema = Joi.object({
  item_name: Joi.string().required(),
  identifier: Joi.string().optional(),
  quantity: Joi.number().required(),
  low_stock_threshold: Joi.number().integer().min(1).optional().allow(null, ""),
  lowStockThreshold: Joi.number().integer().min(1).optional().allow(null, ""),
  category: Joi.string().allow("", null).optional(),
  available: Joi.boolean().optional(),
  reason: Joi.string().allow("").optional()
});