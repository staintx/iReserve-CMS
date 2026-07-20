import { Link } from "react-router-dom";

export default function AuthForgotPasswordForm({ email, error, onEmailChange, onSubmit }) {
  return (
    <div className="auth-form">
      <div>
        <h1 className="text-3xl font-semibold">Forgot password</h1>
        <p className="mt-3 text-sm text-slate-500">We will send you a reset link.</p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div className="form-field">
          <label className="auth-input-label">EMAIL ADDRESS</label>
          <input placeholder="you@example.com" value={email} onChange={onEmailChange} />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="w-full btn" type="submit">Send reset link</button>

        <div className="auth-form-footer text-sm text-slate-500">Remembered it? <Link className="text-brand-700 font-semibold ml-1" to="/login">Back to login</Link></div>
      </form>
    </div>
  );
}
