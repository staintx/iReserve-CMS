import { useState, useRef, useEffect } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { Mail } from "lucide-react";
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthHeading,
  AuthInput,
  AuthLink,
  AuthPrompt,
} from "../auth/AuthUI";
import { isEmail } from "@/lib/authErrors";

/**
 * Step one of password recovery. It says up front what will happen next, so the
 * success screen confirms an expectation instead of springing one.
 */
export default function AuthForgotPasswordForm({
  initialEmail = "",
  onSubmit,
  loading = false,
  formError = null,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (formError) {
      setTurnstileToken("");
      turnstileRef.current?.reset();
    }
  }, [formError]);

  const validate = (value) => {
    if (!value.trim()) return "Enter the email address on your account.";
    if (!isEmail(value)) return "Enter a valid email address.";
    return "";
  };

  const handleChange = (event) => {
    const value = event.target.value;
    setEmail(value);
    if (error) setError(validate(value));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextError = validate(email);
    setError(nextError);
    setTouched(true);
    if (nextError) return;
    onSubmit(email.trim(), { "cf-turnstile-response": turnstileToken });
  };

  const visibleError = touched ? error : "";

  return (
    <div className="space-y-5">
      <AuthHeading
        step="Step 1 of 2 · Request a link"
        title="Forgot your password?"
        subtitle="Enter the email address on your account and we'll send you a secure link to choose a new password."
      />

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="forgot-email"
          label="Email address"
          error={visibleError}
          hint="The reset link stays valid for one hour."
        >
          <AuthInput
            id="forgot-email"
            type="email"
            icon={Mail}
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            disabled={loading}
            hasError={Boolean(visibleError)}
            describedBy={visibleError ? "forgot-email-error" : "forgot-email-hint"}
            onChange={handleChange}
            onBlur={() => {
              setTouched(true);
              setError(validate(email));
            }}
          />
        </AuthField>

        {formError && <AuthAlert tone={formError.tone}>{formError.message}</AuthAlert>}

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
          loadingLabel="Sending link…"
        >
          Send reset link
        </AuthButton>
      </form>

      <AuthPrompt>
        Remembered it? <AuthLink to="/login">Back to sign in</AuthLink>
      </AuthPrompt>
    </div>
  );
}
