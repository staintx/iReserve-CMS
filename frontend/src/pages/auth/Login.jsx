import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthAlert, AuthLink } from "../../components/auth/AuthUI";
import AuthLoginForm from "../../components/forms/AuthLoginForm";
import { resolveAuthError } from "../../lib/authErrors";

const HOME_BY_ROLE = {
  admin: "/admin/dashboard",
  manager: "/manager/dashboard",
  staff: "/staff/dashboard",
};

const homeFor = (role) => HOME_BY_ROLE[role] || "/";

export default function Login() {
  const { user, isReady, login, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const sessionExpired = Boolean(location.state?.sessionExpired);
  const justVerified = Boolean(location.state?.verified);
  const passwordReset = Boolean(location.state?.passwordReset);

  // Clear the sessionExpired flag in context once the login page mounts
  useEffect(() => {
    if (sessionExpired) {
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);

  // Already authenticated — send them where they were headed anyway.
  useEffect(() => {
    if (isReady && user) {
      navigate(homeFor(user.role), { replace: true });
    }
  }, [isReady, user, navigate]);

  const submit = async ({ identifier, password }) => {
    setFormError(null);
    setLoading(true);
    try {
      const loggedInUser = await login(identifier, password);
      navigate(homeFor(loggedInUser?.role), { replace: true });
    } catch (err) {
      const resolved = resolveAuthError(
        err,
        "We could not sign you in. Please check your details and try again."
      );

      // An unverified account is recoverable in one click — offer the route out.
      if (resolved.kind === "unverified") {
        setFormError({
          ...resolved,
          message: "Your email address hasn't been verified yet. Verify it to finish setting up your account.",
          action: (
            <AuthLink
              to={`/verify-email?email=${encodeURIComponent(identifier)}`}
              className="text-[13px]"
            >
              Verify my email
            </AuthLink>
          ),
        });
      } else {
        setFormError(resolved);
      }
      setLoading(false);
    }
  };

  let banner = null;
  if (sessionExpired) {
    banner = (
      <AuthAlert tone="warning" title="Your session expired">
        You were signed out after a period of inactivity. Please sign in again to continue.
      </AuthAlert>
    );
  } else if (passwordReset) {
    banner = (
      <AuthAlert tone="success" title="Password updated">
        Sign in with your new password to pick up where you left off.
      </AuthAlert>
    );
  } else if (justVerified) {
    banner = (
      <AuthAlert tone="success" title="Email verified">
        Your account is active. Sign in to start planning.
      </AuthAlert>
    );
  }

  return (
    <AuthLayout
      title="Your next delicious moment starts here."
      body="Handcrafted menus, seamless service, and every detail of your event tracked in one place."
    >
      <AuthLoginForm
        onSubmit={submit}
        loading={loading}
        formError={formError}
        banner={banner}
      />
    </AuthLayout>
  );
}
