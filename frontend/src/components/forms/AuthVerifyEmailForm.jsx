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
    <div className="auth-form">
      <div>
        <h1 className="text-3xl font-semibold">Verify your email</h1>
        <p className="mt-3 text-sm text-slate-500">
          Enter the 6-digit code we sent to your email address.
        </p>
      </div>

      {justRegistered && (
        <p className="auth-success mt-6">
          Registration successful. Please check your email for the OTP to verify your account.
        </p>
      )}
      {status.loading && <p className="text-sm text-slate-500 mt-6">Verifying your email...</p>}
      {!token && (
        <form className="mt-8 space-y-5" onSubmit={onSubmitOtp}>
          <div className="form-field">
            <label className="auth-input-label">EMAIL ADDRESS</label>
            <input placeholder="you@example.com" value={email} onChange={onEmailChange} />
          </div>
          <div className="form-field">
            <label className="auth-input-label">OTP (6 DIGITS)</label>
            <input placeholder="000000" value={otp} onChange={onOtpChange} />
          </div>

          {status.message && (
            <p className={status.tone === "success" ? "auth-success" : status.tone === "error" ? "auth-error" : "text-sm text-slate-500"}>
              {status.message}
            </p>
          )}

          <button className="w-full btn" type="submit">Verify</button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-slate-500 auth-form-resend">
        Didn't receive the code?{" "}
        <button
          className="text-brand-700 font-semibold border-none bg-none p-0 cursor-pointer hover:underline"
          type="button"
          onClick={onResendOtp}
        >
          Resend OTP
        </button>
      </div>

      <div className="auth-form-footer text-sm text-slate-500">
        Already verified? <Link className="text-brand-700 font-semibold ml-1" to="/login">Go to login</Link>
      </div>
    </div>
  );
}
