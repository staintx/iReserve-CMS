import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    try {
      await CustomerAPI.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password
      });
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-right bg-white">
        <div className="surface p-10">
          <h1 className="text-3xl font-semibold">Create account</h1>
          <p className="mt-2 text-sm text-slate-500">Start planning your event in minutes.</p>
          <form className="mt-8 space-y-4" onSubmit={submit}>
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
            <button className="btn w-full" type="submit">Create account</button>
            <p className="text-sm text-slate-500">Already have an account? <Link className="text-brand-700" to="/login">Sign in</Link></p>
          </form>
        </div>
      </div>
      <div className="auth-left">
        <div className="logo-card">Caezelle's</div>
        <h2 className="mt-6 text-3xl font-semibold">Create an account and taste the difference.</h2>
        <p className="mt-4 text-sm text-white/70">Get custom quotes and manage every detail.</p>
      </div>
    </div>
  );
}