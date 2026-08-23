import { useState, useRef, useEffect } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { Check, LockKeyhole, X } from "lucide-react";
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthHeading,
  AuthPasswordInput,
} from "../auth/AuthUI";
import { focusFirstError } from "../auth/authFocus";
import PasswordRequirements from "../auth/PasswordRequirements";
import { describePasswordGap } from "../auth/passwordPolicy";

/**
 * Step two of password recovery. Uses the same password affordances as
 * registration — live requirements, match feedback, visibility toggles — so the
 * rules only ever have to be learned once.
 */
export default function AuthResetPasswordForm({ onSubmit, loading = false, formError = null }) {
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (formError) {
      setTurnstileToken("");
      turnstileRef.current?.reset();
    }
  }, [formError]);

  const validate = (field, value, all = values) => {
    if (field === "password") {
      if (!value) return "Choose a new password.";
      return describePasswordGap(value);
    }
    if (field === "confirm") {
      if (!value) return "Re-enter your new password.";
      if (value !== all.password) return "Your passwords don't match yet.";
    }
    return "";
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    const next = { ...values, [field]: value };
    setValues(next);

    setErrors((current) => {
      const updated = { ...current };
      if (current[field]) updated[field] = validate(field, value, next);
      if (field === "password" && touched.confirm) updated.confirm = validate("confirm", next.confirm, next);
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
      password: validate("password", values.password),
      confirm: validate("confirm", values.confirm),
    };
    setErrors(nextErrors);
    setTouched({ password: true, confirm: true });

    if (nextErrors.password || nextErrors.confirm) {
      focusFirstError(
        { "reset-password": nextErrors.password, "reset-confirm": nextErrors.confirm },
        ["reset-password", "reset-confirm"]
      );
      return;
    }

    onSubmit({ password: values.password, "cf-turnstile-response": turnstileToken });
  };

  const fieldError = (field) => (touched[field] ? errors[field] : "");
  const showRequirements = passwordFocused || Boolean(values.password);
  const confirmFilled = Boolean(values.confirm);
  const confirmMatches = confirmFilled && values.confirm === values.password;

  return (
    <div className="space-y-5">
      <AuthHeading
        step="Step 2 of 2 · Set a new password"
        title="Choose a new password"
        subtitle="Pick a password you haven't used here before. Once it's saved you can sign in right away."
      />

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthField id="reset-password" label="New password" error={fieldError("password")}>
          <AuthPasswordInput
            id="reset-password"
            icon={LockKeyhole}
            autoComplete="new-password"
            autoFocus
            placeholder="Create a new password"
            value={values.password}
            disabled={loading}
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((visible) => !visible)}
            hasError={Boolean(fieldError("password"))}
            describedBy="reset-password-requirements"
            onChange={handleChange("password")}
            onFocus={() => setPasswordFocused(true)}
            onBlur={(event) => {
              setPasswordFocused(false);
              handleBlur("password")(event);
            }}
          />
        </AuthField>

        {showRequirements && (
          <PasswordRequirements
            id="reset-password-requirements"
            value={values.password}
            className="-mt-1"
          />
        )}

        <AuthField id="reset-confirm" label="Confirm new password" error={fieldError("confirm")}>
          <AuthPasswordInput
            id="reset-confirm"
            icon={LockKeyhole}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={values.confirm}
            disabled={loading}
            visible={showConfirm}
            onToggleVisibility={() => setShowConfirm((visible) => !visible)}
            hasError={Boolean(fieldError("confirm"))}
            describedBy={fieldError("confirm") ? "reset-confirm-error" : "reset-confirm-status"}
            onChange={handleChange("confirm")}
            onBlur={handleBlur("confirm")}
          />
          {confirmFilled && !fieldError("confirm") && (
            <p
              id="reset-confirm-status"
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

        {formError && (
          <AuthAlert tone={formError.tone} action={formError.action}>
            {formError.message}
          </AuthAlert>
        )}

        {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
          <div className="flex justify-center my-4">
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
            />
          </div>
        )}

        <AuthButton
          type="submit"
          className="w-full"
          loading={loading}
          loadingLabel="Updating password…"
        >
          Update password
        </AuthButton>
      </form>
    </div>
  );
}
