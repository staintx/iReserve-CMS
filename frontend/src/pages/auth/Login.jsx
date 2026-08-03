import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.jpg";
import AuthLoginForm from "../../components/forms/AuthLoginForm";

export default function Login() {
  const { login, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const showSessionExpired = location.state?.sessionExpired;

  // Clear the sessionExpired flag in context once the login page mounts
  useEffect(() => {
    if (showSessionExpired) {
      clearSessionExpired();
    }
  }, [showSessionExpired, clearSessionExpired]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const loggedInUser = await login(email, password);
      const role = loggedInUser?.role;

      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "manager") {
        navigate("/manager/dashboard", { replace: true });
      } else if (role === "staff") {
        navigate("/staff/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.errors?.[0] || err.response?.data?.message || "We could not sign you in. Check your email and password and try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-copy">
          <div className="brand-hero">
            <div className="logo-badge">
              <img src={logo} alt="Caezelle's logo" className="object-cover w-full h-full rounded-full" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Caezelle's</p>
              <p className="text-sm text-white/70">Food, Catering & Services</p>
            </div>
          </div>

          <div className="hero-copy">
            <h2 className="text-4xl font-semibold">Your next delicious moment starts here.</h2>
            <p className="mt-4 max-w-lg text-sm text-white/70">Handcrafted menus, seamless service, unforgettable events.</p>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card surface p-10">
          {showSessionExpired && (
            <div className="session-expired-banner">
              Your session has expired. Please log in again.
            </div>
          )}
          <AuthLoginForm
            email={email}
            password={password}
            error={error}
            onEmailChange={(e) => setEmail(e.target.value)}
            onPasswordChange={(e) => setPassword(e.target.value)}
            onSubmit={submit}
          />
        </div>
        <div className="auth-footer">© 2026 Caezelle's Food, Catering & Services. All rights reserved.</div>
      </div>
    </div>
  );
}