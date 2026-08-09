const Joi = require("joi");

// Single source of truth for password complexity, shared by registration,
// password reset and the authenticated password change. Kept in step with the
// checklist the UI shows (frontend/src/components/auth/passwordPolicy.js).
//
// The 6-character minimum is the project's original rule and is unchanged; only
// the character-class requirements were added. Existing passwords are never
// re-validated — these rules apply solely when a new password is being set.
const PASSWORD_MIN_LENGTH = 6;

const passwordRule = Joi.string()
  .min(PASSWORD_MIN_LENGTH)
  .pattern(/[a-z]/, "lowercase letter")
  .pattern(/[A-Z]/, "uppercase letter")
  .pattern(/\d/, "number")
  .pattern(/[^A-Za-z0-9]/, "special character")
  .required()
  .messages({
    "string.empty": "Password is required.",
    "string.min": `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    "string.pattern.name": "Password must include at least one {#name}.",
    "any.required": "Password is required."
  });

module.exports = { PASSWORD_MIN_LENGTH, passwordRule };
