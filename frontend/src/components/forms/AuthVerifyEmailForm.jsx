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
      <h1>Verify Email</h1>
      {justRegistered && (
        <p className="auth-success">
          Registration successful. Please check your email for the OTP to verify your account.
        </p>
      )}
      {status.loading && <p>Verifying...</p>}
      {!token && (
        <form onSubmit={onSubmitOtp}>
          <input placeholder="Email" value={email} onChange={onEmailChange} />
          <input placeholder="OTP (6 digits)" value={otp} onChange={onOtpChange} />
          <button className="btn" type="submit">Verify</button>
          <button className="btn-ghost" type="button" onClick={onResendOtp}>Resend OTP</button>
        </form>
      )}
      {status.message && <p>{status.message}</p>}
      <Link to="/login">Go to login</Link>
    </>
  );
}
