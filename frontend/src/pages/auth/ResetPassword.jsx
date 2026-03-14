import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useSearchParams } from "react-router-dom";
import AuthResetPasswordForm from "../../components/forms/AuthResetPasswordForm";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    await CustomerAPI.resetPassword({ token, password, confirm });
    alert("Password reset success!");
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="logo-card">Caezelle’s</div>
        <h2>Forgot your password? Let’s fix that in a bite.</h2>
      </div>
      <div className="auth-right">
        <AuthResetPasswordForm
          password={password}
          confirm={confirm}
          onPasswordChange={(e) => setPassword(e.target.value)}
          onConfirmChange={(e) => setConfirm(e.target.value)}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}