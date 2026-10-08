const Joi = require("joi");

const NAME_REGEX = /^(?=.*[a-zA-ZÀ-ÿÑñ])[a-zA-ZÀ-ÿÑñ\s.'-]+$/;
const PHONE_REGEX = /^(?:09|\+639)\d{9}$/;
const PH_ZIP_REGEX = /^\d{4}$/;
const USERNAME_REGEX = /^(?=.*[a-zA-Z0-9])[a-zA-Z0-9_.-]{3,30}$/;
const ADDRESS_REGEX = /^(?=.*[a-zA-Z0-9À-ÿÑñ])[a-zA-Z0-9À-ÿÑñ\s.,#'\/\(\)-]+$/;
const CATALOG_NAME_REGEX = /^(?=.*[a-zA-Z0-9À-ÿÑñ])[a-zA-Z0-9À-ÿÑñ\s&'\/(),.-]+$/;
const EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;
const HTML_TAGS_REGEX = /[<>]/;

/**
 * Creates a Joi name rule for personal names (first, last, full, celebrant, contact).
 */
const nameRule = (label = "Name", { min = 2, max = 50, required = false, allowEmpty = true } = {}) => {
  let rule = Joi.string()
    .trim()
    .min(min)
    .max(max)
    .pattern(NAME_REGEX, "valid letters, spaces, hyphens, and apostrophes")
    .messages({
      "string.base": `${label} must be text.`,
      "string.empty": `${label} is required.`,
      "string.min": `${label} must be at least ${min} characters.`,
      "string.max": `${label} cannot exceed ${max} characters.`,
      "string.pattern.name": `${label} can only contain letters, spaces, hyphens, and apostrophes (no emojis, numbers, or special symbols).`,
      "any.required": `${label} is required.`
    });

  if (allowEmpty) {
    rule = rule.allow("");
  }
  return required ? rule.required() : rule.optional();
};

/**
 * Creates a Joi phone rule for Philippine mobile numbers (09XXXXXXXXX).
 */
const phoneRule = (label = "Phone number", { required = false, allowEmpty = true } = {}) => {
  let rule = Joi.string()
    .trim()
    .pattern(PHONE_REGEX, "Philippine mobile number")
    .messages({
      "string.base": `${label} must be text.`,
      "string.empty": `${label} is required.`,
      "string.pattern.name": `${label} must be an 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).`,
      "any.required": `${label} is required.`
    });

  if (allowEmpty) {
    rule = rule.allow("");
  }
  return required ? rule.required() : rule.optional();
};

/**
 * Creates a Joi username rule.
 */
const usernameRule = ({ required = false, allowEmpty = true } = {}) => {
  let rule = Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(USERNAME_REGEX, "letters, numbers, underscores, hyphens, and periods")
    .messages({
      "string.base": "Username must be text.",
      "string.empty": "Username is required.",
      "string.min": "Username must be at least 3 characters.",
      "string.max": "Username cannot exceed 30 characters.",
      "string.pattern.name": "Username can only contain letters, numbers, underscores, hyphens, and periods (no emojis or spaces).",
      "any.required": "Username is required."
    });

  if (allowEmpty) {
    rule = rule.allow("");
  }
  return required ? rule.required() : rule.optional();
};

/**
 * Creates a Joi address rule for street, landmark, address fields.
 */
const addressRule = (label = "Address", { max = 150, required = false, allowEmpty = true } = {}) => {
  let rule = Joi.string()
    .trim()
    .max(max)
    .pattern(ADDRESS_REGEX, "standard address characters")
    .messages({
      "string.base": `${label} must be text.`,
      "string.empty": `${label} is required.`,
      "string.max": `${label} cannot exceed ${max} characters.`,
      "string.pattern.name": `${label} contains invalid characters (emojis and HTML tags are not allowed).`,
      "any.required": `${label} is required.`
    });

  if (allowEmpty) {
    rule = rule.allow("");
  }
  return required ? rule.required() : rule.optional();
};

/**
 * Creates a safe text rule for notes, descriptions, allergies, dietary requests, themes.
 * Rejects emojis and HTML/script tags (<, >).
 */
const safeTextRule = (label = "This field", { max = 500, required = false, allowEmpty = true } = {}) => {
  let rule = Joi.string()
    .trim()
    .max(max)
    .custom((value, helpers) => {
      if (!value) return value;
      if (EMOJI_REGEX.test(value)) {
        return helpers.message(`${label} cannot contain emojis.`);
      }
      if (HTML_TAGS_REGEX.test(value)) {
        return helpers.message(`${label} cannot contain angle brackets (< or >).`);
      }
      return value;
    })
    .messages({
      "string.base": `${label} must be text.`,
      "string.empty": `${label} is required.`,
      "string.max": `${label} cannot exceed ${max} characters.`,
      "any.required": `${label} is required.`
    });

  if (allowEmpty) {
    rule = rule.allow("");
  }
  return required ? rule.required() : rule.optional();
};

/**
 * Catalog item name rule (menu items, inventory items, packages, addons).
 */
const catalogNameRule = (label = "Item name", { min = 2, max = 100, required = true, allowEmpty = false } = {}) => {
  let rule = Joi.string()
    .trim()
    .min(min)
    .max(max)
    .pattern(CATALOG_NAME_REGEX, "catalog item name")
    .messages({
      "string.base": `${label} must be text.`,
      "string.empty": `${label} cannot be empty.`,
      "string.min": `${label} must be at least ${min} characters.`,
      "string.max": `${label} cannot exceed ${max} characters.`,
      "string.pattern.name": `${label} can only contain letters, numbers, spaces, and safe punctuation (- & ' , / ( ) .). Emojis are not allowed.`,
      "any.required": `${label} is required.`
    });

  if (allowEmpty) {
    rule = rule.allow("");
  }
  return required ? rule.required() : rule.optional();
};

/**
 * Reasonable maximum financial transaction limit for catering business (₱10,000,000).
 */
const MAX_FINANCIAL_AMOUNT = 10000000;
const MIN_FINANCIAL_AMOUNT = 0;
const MIN_PAYMENT_AMOUNT = 0.01;

/**
 * Validates a monetary value (numeric, within bounds, maximum 2 decimal places).
 */
const isValidMonetaryAmount = (val, { min = 0, max = MAX_FINANCIAL_AMOUNT, allowZero = true, allowNegative = false } = {}) => {
  if (val === undefined || val === null || val === "") return false;
  const num = Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) return false;
  if (/[eE]/.test(String(val))) return false;
  if (!allowNegative && num < (allowZero ? 0 : 0.01)) return false;
  if (allowNegative && (num < -max || num > max)) return false;
  if (!allowNegative && (num < min || num > max)) return false;
  const str = String(val).trim();
  if (str.includes(".") && str.split(".")[1].length > 2) return false;
  return true;
};

/**
 * Creates a Joi monetary amount rule with strict 2-decimal enforcement and upper cap (₱10,000,000).
 */
const monetaryRule = (label = "Amount", { min = 0, max = MAX_FINANCIAL_AMOUNT, required = true, allowZero = true } = {}) => {
  return Joi.any().custom((val, helpers) => {
    if (val === undefined || val === null || val === "") {
      if (required) return helpers.message(`${label} is required.`);
      return undefined;
    }
    const str = String(val).trim();
    if (/[eE]/.test(str)) {
      return helpers.message(`${label} cannot use scientific notation.`);
    }
    const num = Number(val);
    if (!Number.isFinite(num) || Number.isNaN(num)) {
      return helpers.message(`${label} must be a valid number.`);
    }
    const lowerBound = allowZero ? 0 : 0.01;
    if (num < lowerBound) {
      return helpers.message(allowZero ? `${label} cannot be negative.` : `${label} must be greater than ₱0.`);
    }
    if (num > max) {
      return helpers.message(`${label} cannot exceed ₱${max.toLocaleString("en-PH")}.`);
    }
    if (str.includes(".") && str.split(".")[1].length > 2) {
      return helpers.message(`${label} cannot have more than 2 decimal places.`);
    }
    return Math.round(num * 100) / 100;
  });
};

module.exports = {
  NAME_REGEX,
  PHONE_REGEX,
  PH_ZIP_REGEX,
  USERNAME_REGEX,
  ADDRESS_REGEX,
  CATALOG_NAME_REGEX,
  EMOJI_REGEX,
  HTML_TAGS_REGEX,
  MAX_FINANCIAL_AMOUNT,
  MIN_FINANCIAL_AMOUNT,
  MIN_PAYMENT_AMOUNT,
  isValidMonetaryAmount,
  monetaryRule,
  nameRule,
  phoneRule,
  usernameRule,
  addressRule,
  safeTextRule,
  catalogNameRule
};
