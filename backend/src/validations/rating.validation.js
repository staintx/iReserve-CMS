const Joi = require("joi");

exports.ratingSchema = Joi.object({
  customer_id: Joi.string().required(),
  booking_id: Joi.string().required(),
  stars: Joi.number().min(1).max(5).required(),
  review: Joi.string().required()
});