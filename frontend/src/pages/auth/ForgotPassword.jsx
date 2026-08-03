import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { Link } from "react-router-dom";
import AuthForgotPasswordForm from "../../components/forms/AuthForgotPasswordForm";
import logo from "../../assets/images/logo.jpg";
import useToast from "../../hooks/useToast";
import { MailCheck } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSent, setIsSent] = useState(false);
  const { notify } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await CustomerAPI.forgotPassword({ email });
      notify("Reset link sent. Check your email.", "success");
      setIsSent(true);
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

      <div className="bg-white auth-right">
        {isSent ? (
          <div className="flex flex-col items-center text-center p-10 auth-card surface">
            <div className="flex items-center justify-center w-16 h-16 mb-6 text-green-600 bg-green-100 rounded-full">
              <MailCheck size={32} />
            </div>
            <h1 className="mb-2 text-2xl font-semibold">Check your inbox!</h1>
            <p className="mb-8 text-gray-500">We sent a password reset link. It expires in 15 minutes.</p>
            <Link to="/login" className="w-full text-center text-sm font-medium text-[var(--primary)] hover:underline mt-4 inline-block">
              Back to login
            </Link>
          </div>
        ) : (
          <div className="p-10 auth-card surface">
            <AuthForgotPasswordForm
              email={email}
              error={error}
              onEmailChange={(e) => setEmail(e.target.value)}
              onSubmit={submit}
            />
          </div>
        )}
        <div className="auth-footer">© 2026 Caezelle's Food, Catering & Services. All rights reserved.</div>
      </div>
    </div>
  );
}