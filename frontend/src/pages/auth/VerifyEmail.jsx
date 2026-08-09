import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, CheckCircle2, ShieldAlert } from "lucide-react";
import { CustomerAPI } from "../../api/customer";
import AuthLayout from "../../components/auth/AuthLayout";
import {
  AuthAlert,
  AuthButton,
  AuthPending,
  AuthStatus,
} from "../../components/auth/AuthUI";
import AuthVerifyEmailForm from "../../components/forms/AuthVerifyEmailForm";
import useCooldown from "../../hooks/useCooldown";
import useToast from "../../hooks/useToast";
import { resolveAuthError, serverMessage } from "../../lib/authErrors";

const RESEND_COOLDOWN_SECONDS = 60;
const REDIRECT_DELAY_MS = 2500;

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get("token");
  const initialEmail = params.get("email") || "";
  const justRegistered = Boolean(location.state?.registered);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  // "link" → following a link from the email · "code" → typing the OTP
  // "verified" · "already-verified" · "link-failed"
  const [stage, setStage] = useState(token ? "link" : "code");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [resendNotice, setResendNotice] = useState(null);
  const [linkError, setLinkError] = useState("");

  const { notify } = useToast();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);
  const redirectRef = useRef(null);

  const goToLogin = useCallback(
    (replace = true) => navigate("/login", { replace, state: { verified: true } }),
    [navigate]
  );

  const finishAsVerified = useCallback(
    (alreadyVerified = false) => {
      setStage(alreadyVerified ? "already-verified" : "verified");
      redirectRef.current = setTimeout(() => goToLogin(), REDIRECT_DELAY_MS);
    },
    [goToLogin]
  );

  useEffect(() => () => clearTimeout(redirectRef.current), []);

  // Verification link from the email — resolve it before showing anything else.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        await CustomerAPI.verifyEmail(token);
        if (cancelled) return;
        setStage("verified");
        redirectRef.current = setTimeout(() => goToLogin(), REDIRECT_DELAY_MS);
      } catch (err) {
        if (cancelled) return;
        const resolved = resolveAuthError(
          err,
          "We could not verify your email with that link."
        );
        setLinkError(resolved.message);
        setStage("link-failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, goToLogin]);

  const submitCode = async () => {
    setFormError(null);
    setResendNotice(null);
    setLoading(true);
    try {
      const { data } = await CustomerAPI.verifyOtp({ email: email.trim(), otp: code });
      const alreadyVerified = /already verified/i.test(data?.message || "");
      notify(data?.message || "Email verified. You can sign in now.", "success");
      finishAsVerified(alreadyVerified);
    } catch (err) {
      const message = serverMessage(err);
      const resolved = resolveAuthError(err, "We could not verify that code. Please try again.");

      if (/user not found/i.test(message)) {
        setFormError({
          tone: "error",
          message: "We don't have an account for that email address. Check the spelling, or create an account.",
        });
      } else if (/expired/i.test(message)) {
        setFormError({
          tone: "warning",
          message: "That code has expired. Request a new one and we'll email it straight away.",
        });
        setCode("");
      } else if (/invalid otp/i.test(message)) {
        setFormError({
          tone: "error",
          message: "That code doesn't match the one we sent. Check the digits and try again.",
        });
      } else {
        setFormError(resolved);
      }
      setLoading(false);
    }
  };

  const resend = async () => {
    setFormError(null);
    setResendNotice(null);
    setResending(true);
    try {
      const { data } = await CustomerAPI.resendOtp({ email: email.trim() });
      if (/already verified/i.test(data?.message || "")) {
        finishAsVerified(true);
        return;
      }
      cooldown.start();
      setCode("");
      setResendNotice({ tone: "success", message: "A new code is on its way to your inbox." });
      notify("Verification code sent.", "success");
    } catch (err) {
      const resolved = resolveAuthError(err, "We could not send a new code. Please try again.");
      setResendNotice({ tone: resolved.tone, message: resolved.message });
    } finally {
      setResending(false);
    }
  };

  const layout = {
    title: "Confirm your account in minutes.",
    body: "Verifying your email unlocks bookings, quotes, messages, and payment tracking.",
  };

  if (stage === "link") {
    return (
      <AuthLayout {...layout} backTo={null}>
        <AuthPending
          title="Verifying your email"
          description="Hang tight — this only takes a moment."
        />
      </AuthLayout>
    );
  }

  if (stage === "verified" || stage === "already-verified") {
    const already = stage === "already-verified";
    return (
      <AuthLayout {...layout} backTo={null}>
        <AuthStatus
          icon={already ? BadgeCheck : CheckCircle2}
          tone="success"
          title={already ? "Already verified" : "Email verified"}
          description={
            already
              ? "This email address was verified earlier. You can sign in whenever you're ready."
              : "Your account is active. We're taking you to sign in — or go ahead now."
          }
          actions={
            <AuthButton className="w-full" onClick={() => goToLogin(false)}>
              Continue to sign in
            </AuthButton>
          }
        />
      </AuthLayout>
    );
  }

  if (stage === "link-failed") {
    return (
      <AuthLayout {...layout} backTo="/login" backLabel="Back to sign in">
        <AuthStatus
          icon={ShieldAlert}
          tone="warning"
          title="That link didn't work"
          description={`${linkError} Verification links expire after 24 hours — enter the code from your email instead, or send yourself a fresh one.`}
          actions={
            <AuthButton
              className="w-full"
              onClick={() => {
                setLinkError("");
                setStage("code");
              }}
            >
              Enter a code instead
            </AuthButton>
          }
        />
      </AuthLayout>
    );
  }

  const notice = resendNotice ? (
    <AuthAlert tone={resendNotice.tone}>{resendNotice.message}</AuthAlert>
  ) : justRegistered ? (
    <AuthAlert tone="success" title="Account created">
      One last step — enter the code we just emailed you to activate your account.
    </AuthAlert>
  ) : null;

  return (
    <AuthLayout {...layout} backTo="/login" backLabel="Back to sign in">
      <AuthVerifyEmailForm
        email={email}
        onEmailChange={setEmail}
        code={code}
        onCodeChange={setCode}
        onSubmit={submitCode}
        onResend={resend}
        loading={loading}
        resending={resending}
        cooldown={cooldown.remaining}
        emailLocked={Boolean(initialEmail)}
        formError={formError}
        notice={notice}
      />
    </AuthLayout>
  );
}
