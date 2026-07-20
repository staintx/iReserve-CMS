import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useSearchParams } from "react-router-dom";
import AuthResetPasswordForm from "../../components/forms/AuthResetPasswordForm";
import logo from "../../assets/images/logo.jpg";
import useToast from "../../hooks/useToast";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const { notify } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await CustomerAPI.resetPassword({ token, password, confirm });
      notify("Password updated. You can sign in now.", "success");
    } catch (err) {
      const message = err.response?.data?.message || "We could not reset your password. Please try again.";
      setError(message);
      notify(message, "error");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="brand-hero">
          <div className="logo-badge">
            <img src={logo} alt="Caezelle's logo" className="object-cover w-full h-full rounded-full" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Caezelle's</p>
            <p className="text-sm text-white/70">Food, Catering & Services</p>
          </div>
        </div>
        <div className="hero-copy">
          <h2 className="text-4xl font-semibold">Forgot your password? Let's fix that in a bite.</h2>
          <p className="mt-4 text-sm text-white/70">Enter a new password and get back to planning your events.</p>
        </div>
      </div>
      <div className="bg-white auth-right">
        <div className="auth-card surface p-10">
          <AuthResetPasswordForm
            password={password}
            confirm={confirm}
            error={error}
            onPasswordChange={(e) => setPassword(e.target.value)}
            onConfirmChange={(e) => setConfirm(e.target.value)}
            onSubmit={submit}
          />
        </div>
        <div className="auth-footer">© 2026 Caezelle's Food, Catering & Services. All rights reserved.</div>
      </div>
    </div>
  );
}