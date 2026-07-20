import { Link } from "react-router-dom";

export default function AuthSignupForm({ form, setForm, error, onSubmit }) {
  return (
    <div className="auth-form">
      <div>
        <h1 className="text-3xl font-semibold">Create account</h1>
        <p className="mt-3 text-sm text-slate-500">Start planning your event in minutes.</p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div className="form-field">
          <label className="auth-input-label">FULL NAME</label>
          <input placeholder="Juan Dela Cruz" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>

        <div className="form-field">
          <label className="auth-input-label">EMAIL ADDRESS</label>
          <input placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="form-field">
          <label className="auth-input-label">PASSWORD</label>
          <input placeholder="••••••••" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        <div className="form-field">
          <label className="auth-input-label">CONFIRM PASSWORD</label>
          <input placeholder="••••••••" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="w-full btn" type="submit">Create account</button>

        <p className="auth-form-footer text-sm text-slate-500">Already have an account? <Link className="text-brand-700 font-semibold ml-1" to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
