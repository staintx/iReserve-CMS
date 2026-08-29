import { useState, useRef, useEffect } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { AtSign, LockKeyhole } from "lucide-react";
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthHeading,
  AuthInput,
  AuthLink,
  AuthPasswordInput,
  AuthPrompt,
} from "../auth/AuthUI";
import { focusFirstError } from "../auth/authFocus";
import { isEmail } from "@/lib/authErrors";

const FIELD_ORDER = ["login-identifier", "login-password"];

/**
 * Sign-in form. Validation runs on blur and on submit, then follows the user's
 * corrections — the form never turns red while they are still typing a value
 * for the first time.
 *
 * The identifier accepts an email *or* a username because the API matches both;
 * format is only checked once the value looks like it is meant to be an email.
 */
export default function AuthLoginForm({ onSubmit, loading = false, formError = null, banner = null }) {
  const [values, setValues] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (formError) {
      setTurnstileToken("");
      turnstileRef.current?.reset();
    }
  }, [formError]);

  const validate = (field, value) => {
    if (field === "identifier") {
      if (!value.trim()) return "Enter your email address or username.";
      if (value.includes("@") && !isEmail(value)) return "Enter a valid email address.";
    }
    if (field === "password" && !value) return "Enter your password.";
    return "";
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    // Only re-validate a field that is already showing an error, so corrections
    // clear immediately without new errors appearing mid-keystroke.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validate(field, value) }));
  };

  const handleBlur = (field) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validate(field, values[field]) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {
      identifier: validate("identifier", values.identifier),
      password: validate("password", values.password),
    };
    setErrors(nextErrors);
    setTouched({ identifier: true, password: true });

    if (nextErrors.identifier || nextErrors.password) {
      focusFirstError(
        { "login-identifier": nextErrors.identifier, "login-password": nextErrors.password },
        FIELD_ORDER
      );
      return;
    }

    onSubmit({ 
      identifier: values.identifier.trim(), 
      password: values.password,
      "cf-turnstile-response": turnstileToken
    });
  };

  const fieldError = (field) => (touched[field] ? errors[field] : "");

  return (
    <div className="space-y-4">
      <AuthHeading
        title="Welcome back"
        subtitle="Sign in to manage your reservations, quotes, and messages."
      />

      {banner}

      <form className="space-y-3 sm:space-y-3.5" onSubmit={handleSubmit} noValidate>
        <AuthField id="login-identifier" label="Email or username" error={fieldError("identifier")}>
          <AuthInput
            id="login-identifier"
            type="text"
            icon={AtSign}
            autoComplete="username"
            autoFocus
            placeholder="you@example.com"
            value={values.identifier}
            disabled={loading}
            hasError={Boolean(fieldError("identifier"))}
            describedBy={fieldError("identifier") ? "login-identifier-error" : undefined}
            onChange={handleChange("identifier")}
            onBlur={handleBlur("identifier")}
          />
        </AuthField>

        {/* Recovery sits on the label row: it stays one tab away from the
            password field without spending a whole row under the form. */}
        <AuthField
          id="login-password"
          label="Password"
          error={fieldError("password")}
          optionalLabel={
            <AuthLink to="/forgot-password" className="text-[11px] font-semibold">
              Forgot password?
            </AuthLink>
          }
        >
          <AuthPasswordInput
            id="login-password"
            icon={LockKeyhole}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={values.password}
            disabled={loading}
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((visible) => !visible)}
            hasError={Boolean(fieldError("password"))}
            describedBy={fieldError("password") ? "login-password-error" : undefined}
            onChange={handleChange("password")}
            onBlur={handleBlur("password")}
          />
        </AuthField>

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

        <AuthButton
          type="submit"
          className="w-full"
          loading={loading}
          loadingLabel="Signing in…"
        >
          Sign in
        </AuthButton>
      </form>

      <AuthPrompt>
        New to Caezelle&rsquo;s? <AuthLink to="/signup">Create an account</AuthLink>
      </AuthPrompt>
    </div>
  );
}
