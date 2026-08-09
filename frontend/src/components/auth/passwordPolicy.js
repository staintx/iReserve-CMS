// -----------------------------------------------------------------------------
// Password policy — single source of truth for the auth screens.
// -----------------------------------------------------------------------------
// The minimum length mirrors the backend Joi rule (auth.validation.js) so the
// inline checklist never promises something the API will reject.
// -----------------------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 6;

export const PASSWORD_RULES = [
  {
    id: "length",
    label: `${PASSWORD_MIN_LENGTH}+ characters`,
    hint: `make it at least ${PASSWORD_MIN_LENGTH} characters`,
    test: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "lowercase",
    label: "Lowercase letter",
    hint: "a lowercase letter",
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    label: "Uppercase letter",
    hint: "an uppercase letter",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "Number",
    hint: "a number",
    test: (value) => /\d/.test(value),
  },
  {
    id: "symbol",
    label: "Special character",
    hint: "a special character",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

/** Per-rule pass/fail plus a coarse strength band used by the meter. */
export function evaluatePassword(value = "") {
  const results = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(value),
  }));
  const met = results.filter((rule) => rule.met).length;
  const isValid = met === results.length;

  let strength = "empty";
  if (value) {
    if (isValid) strength = value.length >= 12 ? "strong" : "good";
    else if (met >= 3) strength = "fair";
    else strength = "weak";
  }

  return { results, met, total: results.length, isValid, strength };
}

/**
 * Turns the unmet rules into one readable sentence — "Add an uppercase letter
 * and a special character." — instead of "Password requirements not met."
 * When only one rule is left the copy nudges toward the finish line.
 */
export function describePasswordGap(value = "") {
  const { results, isValid } = evaluatePassword(value);
  if (isValid) return "";

  const missing = results.filter((rule) => !rule.met).map((rule) => rule.hint);
  if (missing.length === 1) return `Add ${missing[0]} to finish your password.`;

  const last = missing[missing.length - 1];
  return `Add ${missing.slice(0, -1).join(", ")} and ${last}.`;
}
