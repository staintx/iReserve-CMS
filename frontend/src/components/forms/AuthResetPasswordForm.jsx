import { Link } from "react-router-dom";

export default function AuthResetPasswordForm({ password, confirm, onPasswordChange, onConfirmChange, onSubmit }) {
  return (
    <>
      <h1>RESET PASSWORD</h1>
      <form onSubmit={onSubmit}>
        <input placeholder="New Password" value={password} onChange={onPasswordChange} />
        <input placeholder="Confirm Password" value={confirm} onChange={onConfirmChange} />
        <button className="btn">Reset Password</button>
        <Link to="/login">Back to login</Link>
      </form>
    </>
  );
}
