import { useState } from "react";
import { Mail, MailCheck, PenLine } from "lucide-react";
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthHeading,
  AuthInput,
  AuthLink,
  AuthPrompt,
  AuthTextButton,
  EmailChip,
  OtpInput,
} from "../auth/AuthUI";
import { formatCooldown } from "@/hooks/useCooldown";
import { isEmail } from "@/lib/authErrors";

const CODE_LENGTH = 6;

/**
 * Code-entry state of email verification.
 *
 * When the address is already known (straight from registration) it is shown as
 * context rather than as an editable field — the code is the only thing left to
 * do. "Use a different address" reveals the input for the recovery case.
 */
export default function AuthVerifyEmailForm({
  email,
  onEmailChange,
  code,
  onCodeChange,
  onSubmit,
  onResend,
  loading = false,
  resending = false,
  cooldown = 0,
  emailLocked = false,
  formError = null,
  notice = null,
}) {
  const [editingEmail, setEditingEmail] = useState(!emailLocked);
  const [emailError, setEmailError] = useState("");
  const [codeError, setCodeError] = useState("");

  const validateEmail = (value) => {
    if (!value.trim()) return "Enter the email address you registered with.";
    if (!isEmail(value)) return "Enter a valid email address.";
    return "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextEmailError = validateEmail(email);
    const nextCodeError =
      code.length === CODE_LENGTH ? "" : `Enter all ${CODE_LENGTH} digits of your code.`;

    setEmailError(nextEmailError);
    setCodeError(nextCodeError);
    if (nextEmailError) {
      setEditingEmail(true);
      return;
    }
    if (nextCodeError) return;

    onSubmit();
  };

  const handleResend = () => {
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    if (nextEmailError) {
      setEditingEmail(true);
      return;
    }
    onResend();
  };

  return (
    <div className="space-y-5">
      <AuthHeading
        step="Step 2 of 2 · Verify email"
        title="Verify your email"
        subtitle={
          email && !editingEmail
            ? // The address itself is shown in the chip below, so the sentence
              // stays short and can't break mid-word.
              `Enter the ${CODE_LENGTH}-digit code we emailed you to activate your account.`
            : `Enter your email address and the ${CODE_LENGTH}-digit code we sent you.`
        }
      />

      {notice}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {editingEmail ? (
          <AuthField id="verify-email" label="Email address" error={emailError}>
            <AuthInput
              id="verify-email"
              type="email"
              icon={Mail}
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              disabled={loading}
              hasError={Boolean(emailError)}
              describedBy={emailError ? "verify-email-error" : undefined}
              onChange={(event) => {
                onEmailChange(event.target.value);
                if (emailError) setEmailError(validateEmail(event.target.value));
              }}
              onBlur={() => setEmailError(validateEmail(email))}
            />
          </AuthField>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
            <span className="flex min-w-0 items-center gap-2.5 text-[13px] text-[#64748B]">
              <MailCheck size={16} className="shrink-0 text-[#2C4B8A]" aria-hidden="true" />
              <EmailChip email={email} />
            </span>
            <AuthTextButton
              className="flex shrink-0 items-center gap-1 text-[13px]"
              onClick={() => setEditingEmail(true)}
            >
              <PenLine size={13} aria-hidden="true" />
              Change
            </AuthTextButton>
          </div>
        )}

        <div>
          <span
            id="verify-code-label"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
          >
            Verification code
          </span>
          <OtpInput
            value={code}
            onChange={(next) => {
              onCodeChange(next);
              if (codeError && next.length === CODE_LENGTH) setCodeError("");
            }}
            length={CODE_LENGTH}
            disabled={loading}
            hasError={Boolean(codeError)}
            describedBy={codeError ? "verify-code-error" : "verify-code-help"}
            label={`Verification code, ${CODE_LENGTH} digits`}
          />
          {codeError ? (
            <p
              id="verify-code-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-[#DC2626]"
            >
              {codeError}
            </p>
          ) : (
            <p id="verify-code-help" className="mt-1.5 text-xs text-[#64748B]">
              The code expires 10 minutes after it is sent. Check your spam folder if it
              hasn&rsquo;t arrived.
            </p>
          )}
        </div>

        {formError && (
          <AuthAlert tone={formError.tone} action={formError.action}>
            {formError.message}
          </AuthAlert>
        )}

        <AuthButton
          type="submit"
          className="w-full"
          loading={loading}
          loadingLabel="Verifying…"
        >
          Verify email
        </AuthButton>
      </form>

      <div className="space-y-1.5">
        <AuthPrompt>
          Didn&rsquo;t get the code?{" "}
          <AuthTextButton onClick={handleResend} disabled={cooldown > 0 || resending || loading}>
            {resending
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${formatCooldown(cooldown)}`
                : "Resend code"}
          </AuthTextButton>
        </AuthPrompt>
        <AuthPrompt>
          Already verified? <AuthLink to="/login">Sign in</AuthLink>
        </AuthPrompt>
      </div>
    </div>
  );
}
