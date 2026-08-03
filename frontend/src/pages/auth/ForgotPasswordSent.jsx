import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.jpg";
import { MailCheck } from "lucide-react";

export default function ForgotPasswordSent() {
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
        <div className="auth-card surface p-10 flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-green-100 text-green-600">
            <MailCheck size={32} />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Check your inbox!</h1>
          <p className="text-gray-500 mb-8">We sent a password reset link. It expires in 15 minutes.</p>
          <Link to="/login" className="w-full text-center text-sm font-medium text-[var(--primary)] hover:underline mt-4 inline-block">
            Back to login
          </Link>
        </div>
        <div className="auth-footer">© 2026 Caezelle's Food, Catering & Services. All rights reserved.</div>
      </div>
    </div>
  );
}