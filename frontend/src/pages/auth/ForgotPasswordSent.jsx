import { Link } from "react-router-dom";

export default function ForgotPasswordSent() {
  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="logo-card">Caezelle’s</div>
        <h2>Forgot your password? Let’s fix that in a bite.</h2>
      </div>
      <div className="auth-right">
        <h1>Check your inbox!</h1>
        <p>We sent a password reset link. It expires in 15 minutes.</p>
        <input placeholder="New Password" />
        <input placeholder="Confirm New Password" />
        <button className="btn">Reset Password</button>
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}