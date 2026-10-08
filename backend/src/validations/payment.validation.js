const Joi = require("joi");
const { monetaryRule, MAX_FINANCIAL_AMOUNT } = require("./rules.common");

exports.paymentSchema = Joi.object({
  booking_id: Joi.string().allow("").optional(),
  inquiry_id: Joi.string().allow("").optional(),
  customer_id: Joi.string().allow("").optional(),
  amount: monetaryRule("Amount", { min: 0.01, max: MAX_FINANCIAL_AMOUNT, required: true, allowZero: false }),
  payment_type: Joi.string().required(),
  method: Joi.string().required(),
  proof_url: Joi.string().allow("").optional(),
  status: Joi.string().optional()
}).unknown(true);

exports.paymentUpdateSchema = Joi.object({
  amount: monetaryRule("Amount", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }),
  payment_type: Joi.string().optional(),
  method: Joi.string().optional(),
  proof_url: Joi.string().allow("").optional(),
  status: Joi.string().optional()
}).unknown(true);