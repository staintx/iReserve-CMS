// -----------------------------------------------------------------------------
// Auth error resolution
// -----------------------------------------------------------------------------
// Turns an axios failure into something a person can act on. The backend
// (auth.controller.js) already returns specific messages — we keep those and
// only substitute our own copy when the response carries nothing useful, or
// when the failure never reached the server at all.
// -----------------------------------------------------------------------------

/** Message the API sent back, if any. Validation errors arrive as an array. */
export function serverMessage(error) {
  const data = error?.response?.data;
  if (!data) return "";
  if (Array.isArray(data.errors) && data.errors.length) return String(data.errors[0]);
  return data.message ? String(data.message) : "";
}

/**
 * @returns {{ kind: string, message: string, tone: "error" | "warning" }}
 *   kind — "network" | "timeout" | "server" | "rate_limited" | "unverified"
 *          | "disabled" | "credentials" | "conflict" | "invalid_token" | "request"
 */
export function resolveAuthError(error, fallback = "Something went wrong. Please try again.") {
  const message = serverMessage(error);

  if (error?.code === "ECONNABORTED") {
    return {
      kind: "timeout",
      tone: "error",
      message: "That request took too long. Please check your connection and try again.",
    };
  }

  if (!error?.response) {
    return {
      kind: "network",
      tone: "error",
      message: "We couldn't reach the server. Check your internet connection and try again.",
    };
  }

  const { status } = error.response;

  if (status >= 500) {
    return {
      kind: "server",
      tone: "error",
      message: "Something went wrong on our end. Please try again in a moment.",
    };
  }

  if (status === 429) {
    return {
      kind: "rate_limited",
      tone: "warning",
      message: message || "Too many attempts. Please wait a moment before trying again.",
    };
  }

  if (status === 403) {
    if (/verify/i.test(message)) {
      return {
        kind: "unverified",
        tone: "warning",
        message: "Your email address hasn't been verified yet.",
      };
    }
    if (/disabled|inactive|deactivat/i.test(message)) {
      return {
        kind: "disabled",
        tone: "error",
        message: "This account has been deactivated. Please contact us if you think that's a mistake.",
      };
    }
  }

  if (status === 409) {
    return { kind: "conflict", tone: "error", message: message || fallback };
  }

  if (status === 401 || (status === 400 && /invalid (email|username)? ?or password/i.test(message))) {
    return {
      kind: "credentials",
      tone: "error",
      message: "That email or password doesn't match our records. Please try again.",
    };
  }

  if (status === 400 && /invalid or expired|missing token/i.test(message)) {
    return { kind: "invalid_token", tone: "error", message: message || fallback };
  }

  return { kind: "request", tone: "error", message: message || fallback };
}

/** Basic shape check — deliberately permissive, the server is the authority. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (value = "") => EMAIL_PATTERN.test(value.trim());
