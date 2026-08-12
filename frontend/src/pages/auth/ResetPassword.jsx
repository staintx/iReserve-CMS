import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LinkIcon, ShieldAlert } from "lucide-react";
import { CustomerAPI } from "../../api/customer";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthAlert, AuthButton, AuthLink, AuthStatus } from "../../components/auth/AuthUI";
import AuthResetPasswordForm from "../../components/forms/AuthResetPasswordForm";
import useToast from "../../hooks/useToast";
import { resolveAuthError } from "../../lib/authErrors";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [stage, setStage] = useState(token ? "form" : "missing-token");
  const { notify } = useToast();

  const submit = async ({ password, "cf-turnstile-response": turnstileToken }) => {
    setFormError(null);
    setLoading(true);
    try {
      // The API validates the body strictly — it accepts `token` and `password`
      // only, so the confirmation stays on the client.
      await CustomerAPI.resetPassword({ token, password, "cf-turnstile-response": turnstileToken });
      notify("Password updated. You can sign in now.", "success");
      setStage("done");
    } catch (err) {
      const resolved = resolveAuthError(
        err,
        "We could not reset your password. Please try again."
      );
      // A dead link can't be fixed by retrying the form — swap the whole screen.
      if (resolved.kind === "invalid_token") {
        setStage("expired");
      } else {
        setFormError(resolved);
        notify(resolved.message, resolved.tone === "warning" ? "warning" : "error");
      }
      setLoading(false);
    }
  };

  const layout = {
    title: "A new password, and you're back in the kitchen.",
    body: "Choose something memorable to you and hard to guess for everyone else.",
  };

  if (stage === "done") {
    return (
      <AuthLayout {...layout} backTo={null}>
        <AuthStatus
          icon={CheckCircle2}
          tone="success"
          title="Password updated"
          description="Your new password is active. Sign in to get back to your bookings."
          actions={
            <AuthButton
              className="w-full"
              onClick={() => navigate("/login", { replace: true, state: { passwordReset: true } })}
            >
              Continue to sign in
            </AuthButton>
          }
        />
      </AuthLayout>
    );
  }

  if (stage === "expired" || stage === "missing-token") {
    const isMissing = stage === "missing-token";
    return (
      <AuthLayout {...layout} backTo="/login" backLabel="Back to sign in">
        <AuthStatus
          icon={isMissing ? LinkIcon : ShieldAlert}
          tone="warning"
          title={isMissing ? "This link is incomplete" : "This link has expired"}
          description={
            isMissing
              ? "The reset link is missing its security token. Copy the full link from your email, or request a new one."
              : "Reset links work once and stay valid for one hour. Request a new one and we'll email it straight away."
          }
          actions={
            <AuthButton className="w-full" onClick={() => navigate("/forgot-password")}>
              Request a new link
            </AuthButton>
          }
        >
          <AuthAlert tone="info" title="Already reset your password?">
            A link that has been used once can't be used again. Sign in with your new password
            instead.
          </AuthAlert>
        </AuthStatus>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout {...layout} backTo="/login" backLabel="Back to sign in">
      <AuthResetPasswordForm onSubmit={submit} loading={loading} formError={formError} />
      <p className="mt-5 text-center text-xs text-[#64748B]">
        Didn&rsquo;t request this? <AuthLink to="/login">Sign in</AuthLink> and your current
        password stays unchanged.
      </p>
    </AuthLayout>
  );
}
