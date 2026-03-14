import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useNavigate } from "react-router-dom";
import AuthForgotPasswordForm from "../../components/forms/AuthForgotPasswordForm";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    await CustomerAPI.forgotPassword({ email });
    navigate("/forgot-password/sent");
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
          onEmailChange={(e) => setEmail(e.target.value)}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}