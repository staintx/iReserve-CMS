import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const initialEmail = params.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState({ loading: Boolean(token), message: "" });

  useEffect(() => {
    const verify = async () => {
      if (!token) return;

      try {
        const { data } = await CustomerAPI.verifyEmail(token);
        setStatus({ loading: false, message: data.message || "Email verified." });
      } catch (err) {
        setStatus({ loading: false, message: err.response?.data?.message || "Verification failed." });
      }
    };

    verify();
  }, [token]);

  const submitOtp = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: "" });
    try {
      const { data } = await CustomerAPI.verifyOtp({ email, otp });
      setStatus({ loading: false, message: data.message || "Email verified." });
    } catch (err) {
      setStatus({ loading: false, message: err.response?.data?.message || "Verification failed." });
    }
  };

  const resendOtp = async () => {
    setStatus({ loading: true, message: "" });
    try {
      const { data } = await CustomerAPI.resendOtp({ email });
      setStatus({ loading: false, message: data.message || "OTP sent." });
    } catch (err) {
      setStatus({ loading: false, message: err.response?.data?.message || "Failed to resend OTP." });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-right">
        <h1>Verify Email</h1>
        {status.loading && <p>Verifying...</p>}
        {!token && (
          <form onSubmit={submitOtp}>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="OTP (6 digits)"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button className="btn" type="submit">Verify</button>
            <button className="btn-ghost" type="button" onClick={resendOtp}>Resend OTP</button>
          </form>
        )}
        {status.message && <p>{status.message}</p>}
        <Link to="/login">Go to login</Link>
      </div>
    </div>
  );
}
