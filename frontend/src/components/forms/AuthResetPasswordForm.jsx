import { Link } from "react-router-dom";

export default function AuthResetPasswordForm({ password, confirm, error, onPasswordChange, onConfirmChange, onSubmit }) {
  return (
    <>
      <h1 className="text-3xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-slate-500">Create a new password for your account.</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <input placeholder="New Password" type="password" value={password} onChange={onPasswordChange} />
        <input placeholder="Confirm Password" type="password" value={confirm} onChange={onConfirmChange} />
        {error && <p className="auth-error">{error}</p>}
        <button className="btn" type="submit">Reset password</button>
        <Link className="text-brand-700" to="/login">Back to login</Link>
      </form>
    </>
  );
}
