import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useSearchParams } from "react-router-dom";
import AuthResetPasswordForm from "../../components/forms/AuthResetPasswordForm";
import useToast from "../../hooks/useToast";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const { notify } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await CustomerAPI.resetPassword({ token, password, confirm });
      notify("Password updated. You can sign in now.", "success");
    } catch (err) {
      const message = err.response?.data?.message || "We could not reset your password. Please try again.";
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
        <AuthResetPasswordForm
          password={password}
          confirm={confirm}
          error={error}
          onPasswordChange={(e) => setPassword(e.target.value)}
          onConfirmChange={(e) => setConfirm(e.target.value)}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}