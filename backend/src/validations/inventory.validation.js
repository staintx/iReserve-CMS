const Joi = require("joi");

exports.inventorySchema = Joi.object({
  item_name: Joi.string().required(),
  identifier: Joi.string().optional(),
  quantity: Joi.number().required(),
  category: Joi.string().valid("Event Setup & Furniture", "Dining & Service Inventory").required(),
  available: Joi.boolean().optional(),
  reason: Joi.string().allow("").optional()
});