import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useSearchParams, Link } from "react-router-dom";

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
        <h1>RESET PASSWORD</h1>
        <form onSubmit={submit}>
          <input placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="btn">Reset Password</button>
          <Link to="/login">Back to login</Link>
        </form>
      </div>
    </div>
  );
}