import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.jpg";
import AuthSignupForm from "../../components/forms/AuthSignupForm";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (form.password !== form.confirm) {
      setError("Passwords do not match. Please re-enter them.");
      setLoading(false);
      return;
    }

    try {
      await CustomerAPI.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password
      });
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, {
        state: { registered: true }
      });
    } catch (err) {
      setError(err.response?.data?.errors?.[0] || err.response?.data?.message || "We could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="bg-white auth-right">
        <div className="auth-card surface p-10">
          <AuthSignupForm
            form={form}
            setForm={setForm}
            error={error}
            loading={loading}
            onSubmit={submit}
          />
        </div>
        <div className="auth-footer">© 2026 Caezelle's Food, Catering & Services. All rights reserved.</div>
      </div>

      <div className="auth-left">
        <div className="brand-hero">
          <div className="logo-badge">
            <img src={logo} alt="Caezelle's logo" className="object-cover w-full h-full rounded-full" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Caezelle's</p>
            <p className="text-sm text-white/70">Food, Catering & Services</p>
          </div>
        </div>
        <div className="hero-copy hero-copy-right">
          <h2 className="text-4xl font-semibold">Create an account and taste the difference.</h2>
          <p className="mt-4 text-sm text-white/70">Get custom quotes and manage every detail.</p>
        </div>
      </div>
    </div>
  );
}