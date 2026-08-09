import { useState } from "react";
import { MailCheck } from "lucide-react";
import { CustomerAPI } from "../../api/customer";
import AuthLayout from "../../components/auth/AuthLayout";
import {
  AuthAlert,
  AuthButton,
  AuthLink,
  AuthStatus,
  EmailChip,
} from "../../components/auth/AuthUI";
import AuthForgotPasswordForm from "../../components/forms/AuthForgotPasswordForm";
import useCooldown, { formatCooldown } from "../../hooks/useCooldown";
import useToast from "../../hooks/useToast";
import { resolveAuthError } from "../../lib/authErrors";

// The API refuses a second reset link within two minutes of the last one
// (auth.controller.js), so the button stays quiet for exactly that long.
const RESEND_COOLDOWN_SECONDS = 120;

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [resendState, setResendState] = useState(null);
  const { notify } = useToast();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);

  const request = async (email, { isResend = false } = {}) => {
    setFormError(null);
    setResendState(null);
    setLoading(true);
    try {
      await CustomerAPI.forgotPassword({ email });
      setSentTo(email);
      cooldown.start();
      if (isResend) {
        setResendState({ tone: "success", message: "We've sent another link to your inbox." });
      }
      notify("If that address is registered, a reset link is on its way.", "success");
    } catch (err) {
      const resolved = resolveAuthError(
        err,
        "We could not send the reset link. Please try again."
      );
      if (isResend) {
        setResendState({ tone: resolved.tone, message: resolved.message });
        // A 429 means the server's own window is still open — respect it.
        if (resolved.kind === "rate_limited") cooldown.start();
      } else {
        setFormError(resolved);
      }
      notify(resolved.message, resolved.tone === "warning" ? "warning" : "error");
    } finally {
      setLoading(false);
    }
  };

  const layout = {
    title: "Forgot your password? Let's fix that in a bite.",
    body: "Tell us the address on your account and we'll send a secure link so you can get back to planning.",
  };

  if (sentTo) {
    return (
      <AuthLayout {...layout} backTo="/login" backLabel="Back to sign in">
        <AuthStatus
          icon={MailCheck}
          tone="success"
          title="Check your inbox"
          description={
            <>
              If <EmailChip email={sentTo} /> is registered with us, a password reset link is on
              its way. The link works once and expires in one hour.
            </>
          }
          actions={
            <>
              <AuthButton
                variant="outline"
                className="w-full"
                onClick={() => request(sentTo, { isResend: true })}
                loading={loading}
                loadingLabel="Resending…"
                disabled={cooldown.isCoolingDown}
              >
                {cooldown.isCoolingDown
                  ? `Resend available in ${formatCooldown(cooldown.remaining)}`
                  : "Resend the link"}
              </AuthButton>
              <AuthButton
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSentTo("");
                  setResendState(null);
                  cooldown.reset();
                }}
              >
                Use a different email address
              </AuthButton>
            </>
          }
        >
          <div className="space-y-3">
            {resendState && <AuthAlert tone={resendState.tone}>{resendState.message}</AuthAlert>}
            <AuthAlert tone="info" title="Nothing in your inbox?">
              Give it a minute, then check your spam or promotions folder. Make sure you used the
              address you registered with.
            </AuthAlert>
          </div>
        </AuthStatus>

        <p className="mt-6 text-center text-[13px] text-[#64748B]">
          Remembered it? <AuthLink to="/login">Back to sign in</AuthLink>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout {...layout} backTo="/login" backLabel="Back to sign in">
      <AuthForgotPasswordForm onSubmit={request} loading={loading} formError={formError} />
    </AuthLayout>
  );
}
