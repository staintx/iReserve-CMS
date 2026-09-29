/**
 * Utility functions for frontend privacy masking of PII (Email & Phone).
 */

/**
 * Mask an email address for privacy display while keeping it recognizable to the owner.
 * Example: "jinsaemon@gmail.com" -> "ji••••••on@gmail.com"
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return email || "";
  }
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  if (local.length <= 4) {
    return `${local[0]}•••${local.slice(-1)}@${domain}`;
  }
  const prefix = local.slice(0, 2);
  const suffix = local.slice(-2);
  return `${prefix}••••••${suffix}@${domain}`;
};

/**
 * Mask a phone number for privacy display.
 * Example: "09854654545" -> "0985 ••• ••45"
 * Example: "+639123456789" -> "+63 912 ••• ••89"
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== "string") return "";
  const cleaned = phone.trim();
  if (cleaned.length < 7) return cleaned;

  if (cleaned.startsWith("+63") && cleaned.length >= 12) {
    return `${cleaned.slice(0, 7)} ••• ••${cleaned.slice(-2)}`;
  }

  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)} ••• ••${cleaned.slice(-2)}`;
  }

  return `${cleaned.slice(0, 2)} •••• ${cleaned.slice(-2)}`;
};
