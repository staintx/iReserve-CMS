const Joi = require("joi");

exports.inventorySchema = Joi.object({
  item_name: Joi.string().required(),
  identifier: Joi.string().optional(),
  quantity: Joi.number().required(),
  category: Joi.string().allow("", null).optional(),
  available: Joi.boolean().optional(),
  reason: Joi.string().allow("").optional()
});