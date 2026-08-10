import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isReady, sessionExpired } = useAuth();
  const location = useLocation();

  if (!isReady) return null;

  if (!user) {
    // Carry the intended destination — and the router state the CTA attached
    // to it (package id, service type, guest range) — through the sign-in
    // detour, so a guest who clicks "Book an Event" on a specific package
    // lands back on that booking instead of a bare dashboard.
    return (
      <Navigate
        to="/login"
        replace
        state={{
          ...(sessionExpired ? { sessionExpired: true } : null),
          from: {
            pathname: location.pathname,
            search: location.search,
            state: location.state ?? null,
          },
        }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
}
