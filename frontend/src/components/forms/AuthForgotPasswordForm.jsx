import { Link } from "react-router-dom";

export default function AuthForgotPasswordForm({ email, error, onEmailChange, onSubmit }) {
  return (
    <>
      <h1 className="text-3xl font-semibold">Forgot password</h1>
      <p className="mt-2 text-sm text-slate-500">We will send you a reset link.</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <input placeholder="Email" value={email} onChange={onEmailChange} />
        {error && <p className="auth-error">{error}</p>}
        <button className="btn" type="submit">Send reset link</button>
        <Link className="text-brand-700" to="/login">Back to login</Link>
      </form>
    </>
  );
}
