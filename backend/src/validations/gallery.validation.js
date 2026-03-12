const Joi = require("joi");

exports.gallerySchema = Joi.object({
  title: Joi.string().required(),
  category: Joi.string().required(),
  description: Joi.string().optional()
});