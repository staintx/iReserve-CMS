import { Link } from "react-router-dom";

export default function AuthVerifyEmailForm({
  email,
  otp,
  status,
  justRegistered,
  token,
  onEmailChange,
  onOtpChange,
  onSubmitOtp,
  onResendOtp
}) {
  return (
    <>
      <h1 className="text-3xl font-semibold">Verify email</h1>
      {justRegistered && (
        <p className="auth-success">
          Registration successful. Please check your email for the OTP to verify your account.
        </p>
      )}
      {status.loading && <p className="text-sm text-slate-500">Verifying your email...</p>}
      {!token && (
        <form className="mt-6 space-y-4" onSubmit={onSubmitOtp}>
          <input placeholder="Email" value={email} onChange={onEmailChange} />
          <input placeholder="OTP (6 digits)" value={otp} onChange={onOtpChange} />
          <button className="btn" type="submit">Verify</button>
          <button className="btn-ghost" type="button" onClick={onResendOtp}>Resend OTP</button>
        </form>
      )}
      {status.message && (
        <p className={status.tone === "success" ? "auth-success" : status.tone === "error" ? "auth-error" : "text-sm text-slate-500"}>
          {status.message}
        </p>
      )}
      <Link className="text-brand-700" to="/login">Go to login</Link>
    </>
  );
}
