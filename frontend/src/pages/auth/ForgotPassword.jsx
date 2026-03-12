import { useState } from "react";
import { CustomerAPI } from "../../api/customer";
import { useNavigate, Link } from "react-router-dom";

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
        <h1>FORGOT PASSWORD</h1>
        <form onSubmit={submit}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn">Send Reset Link</button>
          <Link to="/login">Back to login</Link>
        </form>
      </div>
    </div>
  );
}