export const NAME_REGEX = /^(?=.*[a-zA-ZÀ-ÿÑñ])[a-zA-ZÀ-ÿÑñ\s.'-]+$/;
export const PHONE_REGEX = /^(?:09|\+639)\d{9}$/;
export const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export const hasEmoji = (val) => Boolean(val && EMOJI_REGEX.test(String(val)));

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
    return `${label} can only contain letters, spaces, hyphens, and apostrophes.`;
  }
  return "";
}

export function validatePhone(value, label = "Phone number", { required = true } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return required ? `Enter a ${label.toLowerCase()}.` : "";
  }
  if (hasEmoji(trimmed)) {
    return `${label} cannot contain emojis.`;
  }
  if (!PHONE_REGEX.test(trimmed)) {
    return `${label} must be an 11-digit Philippine mobile number starting with 09.`;
  }
  return "";
}
