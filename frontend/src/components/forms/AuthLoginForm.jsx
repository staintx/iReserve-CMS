import { Link } from "react-router-dom";

export default function AuthLoginForm({ email, password, error, onEmailChange, onPasswordChange, onSubmit }) {
  return (
    <div className="auth-form">
      <div>
        <h1 className="text-3xl font-semibold">Welcome back</h1>
        <p className="mt-3 text-sm text-slate-500">Sign in to manage your bookings.</p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div className="form-field">
          <label className="auth-input-label" htmlFor="login-email">EMAIL ADDRESS</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={onEmailChange}
          />
        </div>

        <div className="form-field">
          <label className="auth-input-label" htmlFor="login-password">PASSWORD</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={onPasswordChange}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-form-row">
          <Link className="auth-form-link" to="/">← Back to homepage</Link>
          <Link className="auth-form-link" to="/forgot-password">Forgot password?</Link>
        </div>

        <button className="w-full btn" type="submit">Login now</button>

        <p className="auth-form-footer text-sm text-slate-500">
          Don't have an account? <Link className="text-brand-700 font-semibold ml-1" to="/signup">Register</Link>
        </p>
      </form>
    </div>
  );
}
