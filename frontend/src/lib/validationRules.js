// -----------------------------------------------------------------------------
// Centralized Validation Rules & Helpers
// -----------------------------------------------------------------------------
// Single source of truth for character sets and field validation on frontend,
// kept in strict symmetry with backend/src/validations/rules.common.js.
// -----------------------------------------------------------------------------

export const NAME_REGEX = /^(?=.*[a-zA-ZÀ-ÿÑñ])[a-zA-ZÀ-ÿÑñ\s.'-]+$/;
export const PHONE_REGEX = /^(?:09|\+639)\d{9}$/;
export const PH_ZIP_REGEX = /^\d{4}$/;
export const USERNAME_REGEX = /^(?=.*[a-zA-Z0-9])[a-zA-Z0-9_.-]{3,30}$/;
export const ADDRESS_REGEX = /^(?=.*[a-zA-Z0-9À-ÿÑñ])[a-zA-Z0-9À-ÿÑñ\s.,#'\/\(\)-]+$/;
export const CATALOG_NAME_REGEX = /^(?=.*[a-zA-Z0-9À-ÿÑñ])[a-zA-Z0-9À-ÿÑñ\s&'\/(),.-]+$/;
export const EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;
export const HTML_TAGS_REGEX = /[<>]/;

export const hasEmoji = (val) => Boolean(val && EMOJI_REGEX.test(String(val)));
export const hasHtmlTags = (val) => Boolean(val && HTML_TAGS_REGEX.test(String(val)));

/**
 * Validates personal names (First name, Last name, Full name, Celebrant name).
 * Rejects emojis, numbers, and unsupported symbols.
 */
export function validateName(value, label = "Name", { min = 2, max = 50, required = true } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return required ? `Enter your ${label.toLowerCase()}.` : "";
  }
  if (hasEmoji(trimmed)) {
    return `${label} cannot contain emojis.`;
  }
  if (trimmed.length < min) {
    return `${label} must be at least ${min} characters.`;
  }
  if (trimmed.length > max) {
    return `${label} cannot exceed ${max} characters.`;
  }
  if (!NAME_REGEX.test(trimmed)) {
    return `${label} can only contain letters, spaces, hyphens, and apostrophes (no emojis, numbers, or symbols).`;
  }
  return "";
}

/**
 * Validates Philippine mobile numbers (09XXXXXXXXX).
 */
export function validatePhone(value, label = "Mobile number", { required = true } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return required ? `Enter a ${label.toLowerCase()} we can reach you on.` : "";
  }
  if (hasEmoji(trimmed)) {
    return `${label} cannot contain emojis.`;
  }
  if (!PHONE_REGEX.test(trimmed)) {
    return `${label} must be an 11-digit Philippine number starting with 09 (e.g. 09171234567).`;
  }
  return "";
}

/**
 * Validates usernames (3 to 30 alphanumeric characters, underscores, hyphens, periods).
 */
export function validateUsername(value, { required = true } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return required ? "Enter a username." : "";
  }
  if (hasEmoji(trimmed)) {
    return "Username cannot contain emojis.";
  }
  if (trimmed.length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (trimmed.length > 30) {
    return "Username cannot exceed 30 characters.";
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username can only contain letters, numbers, underscores, hyphens, and periods (no spaces or emojis).";
  }
  return "";
}

/**
 * Validates street address and landmark fields.
 */
export function validateAddress(value, label = "Address", { max = 150, required = true } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return required ? `Enter the ${label.toLowerCase()}.` : "";
  }
  if (hasEmoji(trimmed)) {
    return `${label} cannot contain emojis.`;
  }
  if (hasHtmlTags(trimmed)) {
    return `${label} cannot contain angle brackets (< or >).`;
  }
  if (trimmed.length > max) {
    return `${label} cannot exceed ${max} characters.`;
  }
  if (!ADDRESS_REGEX.test(trimmed)) {
    return `${label} contains invalid characters.`;
  }
  return "";
}

/**
 * Validates freeform notes, allergies, dietary needs, remarks, themes.
 * Rejects emojis and script/HTML tags (<, >).
 */
export function validateSafeText(value, label = "This field", { max = 500, required = false } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return required ? `Enter ${label.toLowerCase()}.` : "";
  }
  if (hasEmoji(trimmed)) {
    return `${label} cannot contain emojis.`;
  }
  if (hasHtmlTags(trimmed)) {
    return `${label} cannot contain angle brackets (< or >).`;
  }
  if (trimmed.length > max) {
    return `${label} cannot exceed ${max} characters.`;
  }
  return "";
}

/**
 * Validates catalog names (menu item name, inventory item name, package name).
 */
export function validateCatalogName(value, label = "Item name", { min = 2, max = 100, required = true } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return required ? `Enter ${label.toLowerCase()}.` : "";
  }
  if (hasEmoji(trimmed)) {
    return `${label} cannot contain emojis.`;
  }
  if (trimmed.length < min) {
    return `${label} must be at least ${min} characters.`;
  }
  if (trimmed.length > max) {
    return `${label} cannot exceed ${max} characters.`;
  }
  if (!CATALOG_NAME_REGEX.test(trimmed)) {
    return `${label} can only contain letters, numbers, spaces, and safe punctuation (- & ' , / ( ) .).`;
  }
  return "";
}

/**
 * Reasonable maximum financial transaction limit for catering business (₱10,000,000).
 */
export const MAX_FINANCIAL_AMOUNT = 10000000;
export const MIN_FINANCIAL_AMOUNT = 0;
export const MIN_PAYMENT_AMOUNT = 0.01;

/**
 * Validates monetary inputs (payments, deposits, balances, quotations, charges).
 * Enforces valid numbers, bounds (₱0 to ₱10,000,000), and maximum 2 decimal places.
 */
export function validateFinancialAmount(
  value,
  label = "Amount",
  { min = 0, max = MAX_FINANCIAL_AMOUNT, required = true, allowZero = false } = {}
) {
  const str = String(value === undefined || value === null ? "" : value).trim();
  if (!str) {
    return required ? `Enter ${label.toLowerCase()}.` : "";
  }
  if (/[eE]/.test(str)) {
    return `${label} cannot use scientific notation.`;
  }
  const num = Number(str);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return `${label} must be a valid number.`;
  }
  const lowerBound = allowZero ? 0 : 0.01;
  if (num < lowerBound) {
    return allowZero ? `${label} cannot be negative.` : `${label} must be greater than ₱0.`;
  }
  if (num > max) {
    return `${label} cannot exceed ₱${max.toLocaleString("en-PH")}.`;
  }
  if (str.includes(".") && str.split(".")[1].length > 2) {
    return `${label} cannot have more than 2 decimal places.`;
  }
  return "";
}
