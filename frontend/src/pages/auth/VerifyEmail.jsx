import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import AuthVerifyEmailForm from "../../components/forms/AuthVerifyEmailForm";
import logo from "../../assets/images/logo.jpg";

export default function VerifyEmail() {
  const location = useLocation();
  const justRegistered = Boolean(location.state?.registered);
  const [params] = useSearchParams();
  const token = params.get("token");
  const initialEmail = params.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState({ loading: Boolean(token), message: "", tone: "info" });

  useEffect(() => {
    const verify = async () => {
      if (!token) return;

      try {
        const { data } = await CustomerAPI.verifyEmail(token);
        setStatus({ loading: false, message: data.message || "Email verified. You can sign in now.", tone: "success" });
      } catch (err) {
        setStatus({ loading: false, message: err.response?.data?.message || "We could not verify your email. Please try again.", tone: "error" });
      }
    };

    verify();
  }, [token]);

  const submitOtp = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: "", tone: "info" });
    try {
      const { data } = await CustomerAPI.verifyOtp({ email, otp });
      setStatus({ loading: false, message: data.message || "Email verified. You can sign in now.", tone: "success" });
    } catch (err) {
      setStatus({ loading: false, message: err.response?.data?.message || "We could not verify that code. Please try again.", tone: "error" });
    }
  };

  const resendOtp = async () => {
    setStatus({ loading: true, message: "", tone: "info" });
    try {
      const { data } = await CustomerAPI.resendOtp({ email });
      setStatus({ loading: false, message: data.message || "OTP sent. Check your inbox.", tone: "success" });
    } catch (err) {
      setStatus({ loading: false, message: err.response?.data?.message || "We could not resend the OTP. Please try again.", tone: "error" });
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
          <h2 className="text-4xl font-semibold">Confirm your account in minutes.</h2>
          <p className="mt-4 text-sm text-white/70">
            Verify your email to unlock bookings, messages, and payment tracking.
          </p>
        </div>
      </div>
      <div className="bg-white auth-right">
        <div className="auth-card surface p-10">
          <AuthVerifyEmailForm
            email={email}
            otp={otp}
            status={status}
            justRegistered={justRegistered}
            token={token}
            onEmailChange={(e) => setEmail(e.target.value)}
            onOtpChange={(e) => setOtp(e.target.value)}
            onSubmitOtp={submitOtp}
            onResendOtp={resendOtp}
          />
        </div>
        <div className="auth-footer">© 2026 Caezelle's Food, Catering & Services. All rights reserved.</div>
      </div>
    </div>
  );
}
