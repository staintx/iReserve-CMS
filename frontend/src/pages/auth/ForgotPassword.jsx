import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useNavigate } from "react-router-dom";
import AuthForgotPasswordForm from "../../components/forms/AuthForgotPasswordForm";
import logo from "../../assets/images/logo.jpg";
import useToast from "../../hooks/useToast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { notify } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await CustomerAPI.forgotPassword({ email });
      notify("Reset link sent. Check your email.", "success");
      navigate("/forgot-password/sent");
    } catch (err) {
      const message = err.response?.data?.message || "We could not send the reset link. Please try again.";
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
          <h2 className="text-4xl font-semibold">Forgot your password? Let’s fix that in a bite.</h2>
          <p className="mt-4 text-sm text-white/70">Enter your email and we'll send you a reset link right away.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card surface p-10">
          <AuthForgotPasswordForm
            email={email}
            error={error}
            onEmailChange={(e) => setEmail(e.target.value)}
            onSubmit={submit}
          />
        </div>
        <div className="auth-footer">© 2026 Caezelle's Food, Catering & Services. All rights reserved.</div>
      </div>
    </div>
  );
}