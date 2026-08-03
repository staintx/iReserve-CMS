import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isReady, sessionExpired } = useAuth();

  if (!isReady) return null;

  if (!user) {
    return <Navigate to="/login" state={sessionExpired ? { sessionExpired: true } : undefined} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
}