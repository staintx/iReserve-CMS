import { Link } from "react-router-dom";

export default function AuthForgotPasswordForm({ email, onEmailChange, onSubmit }) {
  return (
    <>
      <h1>FORGOT PASSWORD</h1>
      <form onSubmit={onSubmit}>
        <input placeholder="Email" value={email} onChange={onEmailChange} />
        <button className="btn">Send Reset Link</button>
        <Link to="/login">Back to login</Link>
      </form>
    </>
  );
}
