import { Link } from "react-router-dom";

export default function AuthSignupForm({ form, setForm, error, onSubmit }) {
  return (
    <>
      <h1 className="text-3xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-slate-500">Start planning your event in minutes.</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <div className="form-field">
          <input placeholder="Full Name" onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="form-field">
          <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-field">
          <input placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="form-field">
          <input placeholder="Confirm Password" type="password" onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="w-full btn" type="submit">Create account</button>
        <p className="text-sm text-slate-500">Already have an account? <Link className="text-brand-700" to="/login">Sign in</Link></p>
      </form>
    </>
  );
}
