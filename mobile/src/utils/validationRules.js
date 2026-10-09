// -----------------------------------------------------------------------------
// Centralized Validation Rules & Helpers for Mobile App
// -----------------------------------------------------------------------------
// Kept in strict symmetry with frontend/src/lib/validationRules.js,
// frontend/src/pages/customer/booking/lib/bookingRules.js, and
// backend/src/validations/rules.common.js.
// -----------------------------------------------------------------------------

export const NAME_REGEX = /^(?=.*[a-zA-ZÀ-ÿÑñ])[a-zA-ZÀ-ÿÑñ\s.'-]+$/;
export const PHONE_REGEX = /^(?:09|\+639)\d{9}$/;
export const PHONE_DIGITS_REGEX = /^(?:63|0)?9\d{9}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PH_ZIP_REGEX = /^\d{4}$/;
export const USERNAME_REGEX = /^(?=.*[a-zA-Z0-9])[a-zA-Z0-9_.-]{3,30}$/;
export const ADDRESS_REGEX = /^(?=.*[a-zA-Z0-9À-ÿÑñ])[a-zA-Z0-9À-ÿÑñ\s.,#'\/\(\)-]+$/;
export const CATALOG_NAME_REGEX = /^(?=.*[a-zA-Z0-9À-ÿÑñ])[a-zA-Z0-9À-ÿÑñ\s&'\/(),.-]+$/;
export const HTML_TAGS_REGEX = /[<>]/;

let emojiRegex;
try {
  emojiRegex = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;
} catch {
  emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
}
export const EMOJI_REGEX = emojiRegex;

export const hasEmoji = (val) => Boolean(val && EMOJI_REGEX.test(String(val)));
export const hasHtmlTags = (val) => Boolean(val && HTML_TAGS_REGEX.test(String(val)));
export const isValidEmail = (value) => EMAIL_REGEX.test(String(value || "").trim());
export const isValidPhone = (value) =>
  PHONE_DIGITS_REGEX.test(String(value || "").replace(/\D/g, ""));

export const PHONE_HELP =
  "Use an 11-digit Philippine mobile number starting with 09. Example: 0917 123 4567";

/**
 * Validates personal names (First name, Last name, Celebrant name).
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
 * Field-level contact messages matching the website's bookingRules.js.
 */
export function contactFieldError(field, value) {
  const trimmed = String(value || "").trim();

  switch (field) {
    case "contact_first_name":
      return validateName(trimmed, "First name", { min: 2, max: 50, required: true });
    case "contact_last_name":
      return validateName(trimmed, "Last name", { min: 2, max: 50, required: true });
    case "contact_email":
      if (!trimmed) return "Enter an email address. Your quotation is sent here.";
      if (trimmed.length > 100) return "Email address cannot exceed 100 characters.";
      return isValidEmail(trimmed)
        ? ""
        : "That email address is missing an @ or a domain. Example: maria@gmail.com";
    case "contact_phone":
      if (!trimmed) return "Enter a mobile number we can reach you on.";
      if (hasEmoji(trimmed)) return "Mobile number cannot contain emojis.";
      return isValidPhone(trimmed) ? "" : PHONE_HELP;
    case "contact_alt_phone":
      if (!trimmed) return "";
      if (hasEmoji(trimmed)) return "Alternate mobile number cannot contain emojis.";
      return isValidPhone(trimmed) ? "" : PHONE_HELP;
    default:
      return "";
  }
}
