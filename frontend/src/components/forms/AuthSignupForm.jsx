import { useState } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { Check, LockKeyhole, Mail, UserRound, X } from "lucide-react";
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthHeading,
  AuthInput,
  AuthLink,
  AuthPasswordInput,
  AuthPrompt,
  AuthSection,
} from "../auth/AuthUI";
import { focusFirstError } from "../auth/authFocus";
import PasswordRequirements from "../auth/PasswordRequirements";
import { describePasswordGap } from "../auth/passwordPolicy";
import { isEmail } from "@/lib/authErrors";

const FIELD_ORDER = ["signup-name", "signup-email", "signup-password", "signup-confirm"];

/**
 * Registration. Two groups — who you are, and how you sign in — paired into
 * columns from `sm` up so the whole form stays in one screenful, and stacking
 * back to a single column on phones.
 *
 * Password rules are shown live (see PasswordRequirements) and the confirmation
 * reports a mismatch as soon as both fields have content, never at submit time.
 */
export default function AuthSignupForm({ onSubmit, loading = false, formError = null }) {
  const [values, setValues] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const validate = (field, value, all = values) => {
    switch (field) {
      case "full_name":
        if (!value.trim()) return "Enter your full name.";
        if (value.trim().length < 2) return "Enter your full name.";
        return "";
      case "email":
        if (!value.trim()) return "Enter your email address.";
        if (!isEmail(value)) return "Enter a valid email address.";
        return "";
      case "password":
        if (!value) return "Choose a password.";
        return describePasswordGap(value);
      case "confirm":
        if (!value) return "Re-enter your password.";
        if (value !== all.password) return "Your passwords don't match yet.";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    const next = { ...values, [field]: value };
    setValues(next);

    setErrors((current) => {
      const updated = { ...current };
      // Only re-validate a field that is already showing an error, so
      // corrections clear immediately without new errors appearing mid-keystroke.
      if (current[field]) updated[field] = validate(field, value, next);
      // Keep the confirmation honest while the password above it changes.
      if (field === "password" && touched.confirm) {
        updated.confirm = validate("confirm", next.confirm, next);
      }
      return updated;
    });
  };

  const handleBlur = (field) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validate(field, values[field]) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {
      full_name: validate("full_name", values.full_name),
      email: validate("email", values.email),
      password: validate("password", values.password),
      confirm: validate("confirm", values.confirm),
    };
    setErrors(nextErrors);
    setTouched({ full_name: true, email: true, password: true, confirm: true });

    if (Object.values(nextErrors).some(Boolean)) {
      focusFirstError(
        {
          "signup-name": nextErrors.full_name,
          "signup-email": nextErrors.email,
          "signup-password": nextErrors.password,
          "signup-confirm": nextErrors.confirm,
        },
        FIELD_ORDER
      );
      return;
    }

    onSubmit({
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      password: values.password,
      "cf-turnstile-response": turnstileToken
    });
  };

  const fieldError = (field) => (touched[field] ? errors[field] : "");
  const showRequirements = passwordFocused || Boolean(values.password);
  const confirmFilled = Boolean(values.confirm);
  const confirmMatches = confirmFilled && values.confirm === values.password;

  return (
    <div className="space-y-5">
      <AuthHeading
        step="Step 1 of 2 · Create account"
        title="Create your account"
        subtitle="Request quotes, confirm reservations, and follow every event in one place."
      />

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <AuthSection label="Your details">
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <AuthField id="signup-name" label="Full name" error={fieldError("full_name")}>
              <AuthInput
                id="signup-name"
                icon={UserRound}
                autoComplete="name"
                placeholder="Juan Dela Cruz"
                value={values.full_name}
                disabled={loading}
                hasError={Boolean(fieldError("full_name"))}
                describedBy={fieldError("full_name") ? "signup-name-error" : undefined}
                onChange={handleChange("full_name")}
                onBlur={handleBlur("full_name")}
              />
            </AuthField>

            <AuthField id="signup-email" label="Email address" error={fieldError("email")}>
              <AuthInput
                id="signup-email"
                type="email"
                icon={Mail}
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                disabled={loading}
                hasError={Boolean(fieldError("email"))}
                describedBy={fieldError("email") ? "signup-email-error" : undefined}
                onChange={handleChange("email")}
                onBlur={handleBlur("email")}
              />
            </AuthField>
          </div>
        </AuthSection>

        <AuthSection label="Security">
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <AuthField id="signup-password" label="Password" error={fieldError("password")}>
              <AuthPasswordInput
                id="signup-password"
                icon={LockKeyhole}
                autoComplete="new-password"
                placeholder="Choose a password"
                value={values.password}
                disabled={loading}
                visible={showPassword}
                onToggleVisibility={() => setShowPassword((visible) => !visible)}
                hasError={Boolean(fieldError("password"))}
                describedBy="signup-password-requirements"
                onChange={handleChange("password")}
                onFocus={() => setPasswordFocused(true)}
                onBlur={(event) => {
                  setPasswordFocused(false);
                  handleBlur("password")(event);
                }}
              />
            </AuthField>

            <AuthField id="signup-confirm" label="Confirm password" error={fieldError("confirm")}>
              <AuthPasswordInput
                id="signup-confirm"
                icon={LockKeyhole}
                autoComplete="new-password"
                placeholder="Repeat password"
                value={values.confirm}
                disabled={loading}
                visible={showConfirm}
                onToggleVisibility={() => setShowConfirm((visible) => !visible)}
                hasError={Boolean(fieldError("confirm"))}
                describedBy={fieldError("confirm") ? "signup-confirm-error" : "signup-confirm-status"}
                onChange={handleChange("confirm")}
                onBlur={handleBlur("confirm")}
              />
              {confirmFilled && !fieldError("confirm") && (
                <p
                  id="signup-confirm-status"
                  aria-live="polite"
                  className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                    confirmMatches ? "text-emerald-600" : "text-[#64748B]"
                  }`}
                >
                  {confirmMatches ? (
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <X size={13} strokeWidth={3} aria-hidden="true" />
                  )}
                  {confirmMatches ? "Passwords match" : "Your passwords don't match yet"}
                </p>
              )}
            </AuthField>

            {showRequirements && (
              <PasswordRequirements
                id="signup-password-requirements"
                value={values.password}
                className="sm:col-span-2"
              />
            )}
          </div>
        </AuthSection>

        {formError && (
          <AuthAlert tone={formError.tone} action={formError.action}>
            {formError.message}
          </AuthAlert>
        )}

        {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
          <div className="flex justify-center my-4">
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>
        )}

        <div className="space-y-2.5">
          <AuthButton
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel="Creating account…"
          >
            Create account
          </AuthButton>
          <p className="text-center text-xs text-[#64748B]">
            Next, we&rsquo;ll email you a code to verify this address.
          </p>
        </div>
      </form>

      <AuthPrompt>
        Already have an account? <AuthLink to="/login">Sign in</AuthLink>
      </AuthPrompt>
    </div>
  );
}
