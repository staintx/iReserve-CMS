const Joi = require("joi");

exports.inventorySchema = Joi.object({
  item_name: Joi.string().required(),
  identifier: Joi.string().optional(),
  quantity: Joi.number().required(),
  low_stock_threshold: Joi.number().integer().min(1).optional().allow(null, ""),
  lowStockThreshold: Joi.number().integer().min(1).optional().allow(null, ""),
  category: Joi.string().allow("", null).optional(),
  available: Joi.boolean().optional(),
  damaged_quantity: Joi.number().min(0).optional(),
  missing_quantity: Joi.number().min(0).optional(),
  reason: Joi.string().allow("").optional()
});