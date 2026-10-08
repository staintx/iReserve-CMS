const Joi = require("joi");
const {
  nameRule,
  phoneRule,
  addressRule,
  safeTextRule,
  PH_ZIP_REGEX,
  monetaryRule,
  MAX_FINANCIAL_AMOUNT
} = require("./rules.common");

const noPastDate = (value, helpers) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return helpers.error("date.base");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return helpers.error("date.min");
  return value;
};

exports.bookingSchema = Joi.object({
  customer_id: Joi.string().allow("").optional(),
  package_id: Joi.string().allow("").optional(),
  event_manager_id: Joi.string().allow("").optional(),
  staff_ids: Joi.array().items(Joi.string()).optional(),

  event_type: safeTextRule("Event type", { max: 50, required: true, allowEmpty: false }),
  booking_for: Joi.string().valid("myself", "someone_else").optional(),
  celebrant_name: nameRule("Celebrant name", { min: 2, max: 80, required: false, allowEmpty: true }),
  event_theme: safeTextRule("Event theme", { max: 100, required: false, allowEmpty: true }),
  event_date: Joi.date()
    .required()
    .custom(noPastDate, "no past dates")
    .messages({
      "date.base": "Event date must be a valid date.",
      "date.min": "Event date must be today or later."
    }),
  start_time: Joi.string().trim().max(20).allow("").optional(),
  guest_count: Joi.number().integer().min(1).max(2000).required().messages({
    "number.base": "Guest count must be a number.",
    "number.integer": "Guest count must be an integer.",
    "number.min": "Guest count must be at least 1.",
    "number.max": "Guest count cannot exceed 2,000."
  }),
  duration_hours: Joi.number().integer().min(1).max(24).allow(null, "").optional(),
  include_food: Joi.boolean().optional(),
  venue_type: safeTextRule("Venue type", { max: 60, required: false, allowEmpty: true }),
  indoor_outdoor: Joi.string().trim().max(20).allow("").optional(),
  province: safeTextRule("Province", { max: 50, required: false, allowEmpty: true }),
  municipality: safeTextRule("Municipality", { max: 50, required: false, allowEmpty: true }),
  barangay: safeTextRule("Barangay", { max: 50, required: false, allowEmpty: true }),
  street: addressRule("Street", { max: 150, required: false, allowEmpty: true }),
  landmark: addressRule("Landmark", { max: 100, required: false, allowEmpty: true }),
  zip_code: Joi.string().trim().pattern(PH_ZIP_REGEX).allow("").optional(),
  venue_contact_name: nameRule("Venue contact name", { min: 2, max: 80, required: false, allowEmpty: true }),
  venue_contact_phone: phoneRule("Venue contact phone", { required: false, allowEmpty: true }),
  selected_menu: Joi.array().items(Joi.string()).optional(),
  dietary_restrictions: safeTextRule("Dietary restrictions", { max: 300, required: false, allowEmpty: true }),
  allergies: safeTextRule("Allergies", { max: 300, required: false, allowEmpty: true }),
  special_requests: safeTextRule("Special requests", { max: 500, required: false, allowEmpty: true }),
  budget_min: Joi.alternatives().try(Joi.string(), Joi.number().min(0).max(MAX_FINANCIAL_AMOUNT)).allow("").optional(),
  budget_max: Joi.alternatives().try(Joi.string(), Joi.number().min(0).max(MAX_FINANCIAL_AMOUNT)).allow("").optional(),
  additional_services: Joi.array().items(safeTextRule("Additional service", { max: 100, required: false, allowEmpty: true })).optional(),
  additional_charges: Joi.array().items(
    Joi.object({
      name: Joi.string().allow("").optional(),
      amount: monetaryRule("Charge amount", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }),
      charge_type: Joi.string().allow("").optional(),
      inventory_id: Joi.string().allow("").optional(),
      equipment_return_id: Joi.string().allow("").optional()
    }).unknown(true)
  ).optional(),
  contact_first_name: nameRule("Contact first name", { min: 2, max: 50, required: false, allowEmpty: true }),
  contact_last_name: nameRule("Contact last name", { min: 2, max: 50, required: false, allowEmpty: true }),
  contact_email: Joi.string().trim().email().max(100).allow("").optional(),
  contact_phone: phoneRule("Contact phone", { required: false, allowEmpty: true }),
  contact_alt_phone: phoneRule("Alternate contact phone", { required: false, allowEmpty: true }),
  contact_method: Joi.string().trim().max(30).allow("").optional(),
  total_price: monetaryRule("Total price", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: true, allowZero: true }),
  deposit_amount: monetaryRule("Deposit amount", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }),
  payment_method: Joi.string().allow("").optional(),
  payment_status: Joi.string().valid("pending", "deposit_paid", "fully_paid", "refund_requested", "refunded").allow("").optional(),
  paymongo_checkout_session_id: Joi.string().allow("").optional(),
  paymongo_payment_intent_id: Joi.string().allow("").optional(),
  status: Joi.string().valid("pending deposit", "confirmed", "preparing", "ongoing", "completed", "cancelled").allow("").optional()
}).unknown(true);