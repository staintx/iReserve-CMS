import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.jpg";
import AuthSignupForm from "../../components/forms/AuthSignupForm";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match. Please re-enter them.");
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
      setError(err.response?.data?.message || "We could not create your account. Please try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="bg-white auth-right">
        <div className="p-10 surface">
          <AuthSignupForm
            form={form}
            setForm={setForm}
            error={error}
            onSubmit={submit}
          />
        </div>
      </div>
      <div className="auth-left">
        <div className="logo-card">
          <img src={logo} alt="Caezelle's logo" className="object-cover w-full h-full rounded-2xl" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold">Create an account and taste the difference.</h2>
        <p className="mt-4 text-sm text-white/70">Get custom quotes and manage every detail.</p>
      </div>
    </div>
  );
}