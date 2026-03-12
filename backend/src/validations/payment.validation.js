const Joi = require("joi");

exports.paymentSchema = Joi.object({
  booking_id: Joi.string().required(),
  customer_id: Joi.string().required(),
  amount: Joi.number().required(),
  payment_type: Joi.string().required(),
  method: Joi.string().required(),
  proof_url: Joi.string().optional(),
  status: Joi.string().optional()
});