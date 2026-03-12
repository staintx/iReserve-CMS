const Joi = require("joi");

exports.inventorySchema = Joi.object({
  item_name: Joi.string().required(),
  quantity: Joi.number().required(),
  category: Joi.string().required(),
  available: Joi.boolean().optional()
});