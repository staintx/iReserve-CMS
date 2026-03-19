import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useNavigate } from "react-router-dom";
import AuthForgotPasswordForm from "../../components/forms/AuthForgotPasswordForm";
import useToast from "../../hooks/useToast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { notify } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await CustomerAPI.forgotPassword({ email });
      notify("Reset link sent. Check your email.", "success");
      navigate("/forgot-password/sent");
    } catch (err) {
      const message = err.response?.data?.message || "We could not send the reset link. Please try again.";
      setError(message);
      notify(message, "error");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="logo-card">Caezelle’s</div>
        <h2>Forgot your password? Let’s fix that in a bite.</h2>
      </div>
      <div className="auth-right">
        <AuthForgotPasswordForm
          email={email}
          error={error}
          onEmailChange={(e) => setEmail(e.target.value)}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}