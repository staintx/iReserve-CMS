import { useState, useRef, useEffect } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { AlertCircle, Check, LockKeyhole, Mail, UserRound, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import CustomerPolicyModal from "../policy/CustomerPolicyModal";

const FIELD_ORDER = [
  "signup-first-name",
  "signup-last-name",
  "signup-email",
  "signup-password",
  "signup-confirm",
  "signup-terms",
];

/**
 * Registration. Two groups — who you are, and how you sign in — paired into
 * columns from `sm` up so the whole form stays in one screenful, and stacking
 * back to a single column on phones.
 *
 * Password rules are shown live (see PasswordRequirements) and the confirmation
 * reports a mismatch as soon as both fields have content, never at submit time.
 */
export default function AuthSignupForm({ onSubmit, loading = false, formError = null }) {
  const [values, setValues] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm: "",
    accepted_terms: false,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [activePolicy, setActivePolicy] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (formError) {
      setTurnstileToken("");
      turnstileRef.current?.reset();
    }
  }, [formError]);

  const validate = (field, value, all = values) => {
    switch (field) {
      case "first_name":
        if (!value.trim()) return "Enter your first name.";
        return "";
      case "last_name":
        // Captured separately so the booking flow can prefill a real surname
        // instead of guessing one out of a single string.
        if (!value.trim()) return "Enter your last name.";
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
      case "accepted_terms":
        if (!value) return "You must agree to the Terms & Conditions and Privacy Policy.";
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

  const handleTermsChange = (event) => {
    const checked = event.target.checked;
    const next = { ...values, accepted_terms: checked };
    setValues(next);

    setErrors((current) => {
      const updated = { ...current };
      if (current.accepted_terms || touched.accepted_terms) {
        updated.accepted_terms = validate("accepted_terms", checked, next);
      }
      return updated;
    });
  };

  const handleTermsBlur = () => {
    setTouched((current) => ({ ...current, accepted_terms: true }));
    setErrors((current) => ({
      ...current,
      accepted_terms: validate("accepted_terms", values.accepted_terms),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {
      first_name: validate("first_name", values.first_name),
      last_name: validate("last_name", values.last_name),
      email: validate("email", values.email),
      password: validate("password", values.password),
      confirm: validate("confirm", values.confirm),
      accepted_terms: validate("accepted_terms", values.accepted_terms),
    };
    setErrors(nextErrors);
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      password: true,
      confirm: true,
      accepted_terms: true,
    });

    if (Object.values(nextErrors).some(Boolean)) {
      focusFirstError(
        {
          "signup-first-name": nextErrors.first_name,
          "signup-last-name": nextErrors.last_name,
          "signup-email": nextErrors.email,
          "signup-password": nextErrors.password,
          "signup-confirm": nextErrors.confirm,
          "signup-terms": nextErrors.accepted_terms,
        },
        FIELD_ORDER
      );
      return;
    }

    onSubmit({
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      password: values.password,
      accepted_terms: true,
      acceptedTerms: true,
      "cf-turnstile-response": turnstileToken
    });
  };

  const fieldError = (field) => (touched[field] ? errors[field] : "");
  const showRequirements = passwordFocused || Boolean(values.password);
  const confirmFilled = Boolean(values.confirm);
  const confirmMatches = confirmFilled && values.confirm === values.password;

  return (
    <div className="space-y-4">
      <AuthHeading
        step="Step 1 of 2 · Create account"
        title="Create your account"
        subtitle="Request quotes, confirm reservations, and follow every event in one place."
      />

      <form className="space-y-3 sm:space-y-3.5" onSubmit={handleSubmit} noValidate>
        <AuthSection label="Your details">
          <div className="grid gap-x-3.5 gap-y-2.5 sm:gap-y-3 sm:grid-cols-2">
            <AuthField id="signup-first-name" label="First name" error={fieldError("first_name")}>
              <AuthInput
                id="signup-first-name"
                icon={UserRound}
                autoComplete="given-name"
                placeholder="Juan"
                value={values.first_name}
                disabled={loading}
                hasError={Boolean(fieldError("first_name"))}
                describedBy={fieldError("first_name") ? "signup-first-name-error" : undefined}
                onChange={handleChange("first_name")}
                onBlur={handleBlur("first_name")}
              />
            </AuthField>

            <AuthField id="signup-last-name" label="Last name" error={fieldError("last_name")}>
              <AuthInput
                id="signup-last-name"
                icon={UserRound}
                autoComplete="family-name"
                placeholder="Dela Cruz"
                value={values.last_name}
                disabled={loading}
                hasError={Boolean(fieldError("last_name"))}
                describedBy={fieldError("last_name") ? "signup-last-name-error" : undefined}
                onChange={handleChange("last_name")}
                onBlur={handleBlur("last_name")}
              />
            </AuthField>

            <AuthField
              id="signup-email"
              label="Email address"
              error={fieldError("email")}
              className="sm:col-span-2"
            >
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
          <div className="grid gap-x-3.5 gap-y-2.5 sm:gap-y-3 sm:grid-cols-2">
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
                  className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${
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
                className="sm:col-span-2 -mt-0.5"
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
          <div className="flex justify-center my-2">
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
            />
          </div>
        )}

        {/* Terms & Conditions Agreement Checkbox */}
        <div className="pt-1.5 pb-0.5">
          <div className="flex items-start gap-2.5">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                id="signup-terms"
                checked={values.accepted_terms}
                onChange={handleTermsChange}
                onBlur={handleTermsBlur}
                disabled={loading}
                aria-describedby={
                  touched.accepted_terms && errors.accepted_terms
                    ? "signup-terms-error"
                    : undefined
                }
                className="peer sr-only"
              />
              <label
                htmlFor="signup-terms"
                className={cn(
                  "h-[18px] w-[18px] shrink-0 rounded-[4px] border-[1.5px] border-slate-800 bg-white transition-all flex items-center justify-center cursor-pointer select-none",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-[#2C4B8A] peer-focus-visible:ring-offset-2",
                  values.accepted_terms
                    ? "bg-[#2C4B8A] border-[#2C4B8A] text-white"
                    : "hover:border-slate-900",
                  touched.accepted_terms &&
                    errors.accepted_terms &&
                    !values.accepted_terms &&
                    "border-[#DC2626] ring-1 ring-[#DC2626]/30",
                  loading && "cursor-not-allowed opacity-60"
                )}
                aria-hidden="true"
              >
                {values.accepted_terms && (
                  <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                )}
              </label>
            </div>

            <label
              htmlFor="signup-terms"
              className="text-[13px] sm:text-sm text-slate-700 leading-snug cursor-pointer select-none"
            >
              I agree to the{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActivePolicy("terms");
                }}
                className="font-semibold text-[#2C4B8A] hover:text-[#1E3563] hover:underline underline-offset-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2C4B8A] rounded-sm cursor-pointer inline-block"
              >
                Terms &amp; Conditions
              </button>
              {" "}and{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActivePolicy("privacy");
                }}
                className="font-semibold text-[#2C4B8A] hover:text-[#1E3563] hover:underline underline-offset-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2C4B8A] rounded-sm cursor-pointer inline-block"
              >
                Privacy Policy
              </button>
            </label>
          </div>

          {touched.accepted_terms && errors.accepted_terms && (
            <p
              id="signup-terms-error"
              role="alert"
              className="mt-1.5 ml-7 flex items-center gap-1.5 text-xs font-medium text-[#DC2626]"
            >
              <AlertCircle size={13} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
              <span>{errors.accepted_terms}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
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

      <CustomerPolicyModal
        open={Boolean(activePolicy)}
        onClose={() => setActivePolicy(null)}
        policyKey={activePolicy || "terms"}
        initialPolicy={activePolicy || "terms"}
      />
    </div>
  );
}
