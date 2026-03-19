import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import AuthVerifyEmailForm from "../../components/forms/AuthVerifyEmailForm";

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
      <div className="auth-right">
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
    </div>
  );
}
