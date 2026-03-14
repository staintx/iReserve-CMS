import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.jpg";
import AuthLoginForm from "../../components/forms/AuthLoginForm";

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
        <div className="logo-card">
          <img src={logo} alt="Caezelle's logo" className="object-cover w-full h-full rounded-2xl" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold">Your next delicious moment starts here.</h2>
        <p className="mt-4 text-sm text-white/70">Handcrafted menus, seamless service, unforgettable events.</p>
      </div>
      <div className="bg-white auth-right">
        <div className="p-10 surface">
          <AuthLoginForm
            email={email}
            password={password}
            error={error}
            onEmailChange={(e) => setEmail(e.target.value)}
            onPasswordChange={(e) => setPassword(e.target.value)}
            onSubmit={submit}
          />
        </div>
      </div>
    </div>
  );
}