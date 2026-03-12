import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const loggedInUser = await login(email, password);
      const role = loggedInUser?.role;

      if (role === "admin" || role === "manager" || role === "staff") {
        navigate("/admin/dashboard");
      } else {
        navigate("/customer/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="logo-card">Caezelle's</div>
        <h2 className="mt-6 text-3xl font-semibold">Your next delicious moment starts here.</h2>
        <p className="mt-4 text-sm text-white/70">Handcrafted menus, seamless service, unforgettable events.</p>
      </div>
      <div className="auth-right bg-white">
        <div className="surface p-10">
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage your bookings.</p>
          <form className="mt-8 space-y-4" onSubmit={submit}>
            <div className="form-field">
              <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-field">
              <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="flex items-center justify-between text-sm">
              <Link className="text-brand-700" to="/forgot-password">Forgot Password?</Link>
            </div>
            <button className="btn w-full" type="submit">Login now</button>
            <p className="text-sm text-slate-500">Don't have an account? <Link className="text-brand-700" to="/signup">Sign up</Link></p>
          </form>
        </div>
      </div>
    </div>
  );
}