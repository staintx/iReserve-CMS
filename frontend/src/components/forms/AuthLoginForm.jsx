import { Link } from "react-router-dom";

export default function AuthLoginForm({ email, password, error, onEmailChange, onPasswordChange, onSubmit }) {
  return (
    <>
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-500">Sign in to manage your bookings.</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <div className="form-field">
          <input placeholder="Email" value={email} onChange={onEmailChange} />
        </div>
        <div className="form-field">
          <input placeholder="Password" type="password" value={password} onChange={onPasswordChange} />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <div className="flex items-center justify-between text-sm">
          <Link className="text-brand-700" to="/">Back to homepage</Link>
          <Link className="text-brand-700" to="/forgot-password">Forgot Password?</Link>
        </div>
        <button className="w-full btn" type="submit">Login now</button>
        <p className="text-sm text-slate-500">Don't have an account? <Link className="text-brand-700" to="/signup">Sign up</Link></p>
      </form>
    </>
  );
}
