import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthLink } from "../../components/auth/AuthUI";
import AuthSignupForm from "../../components/forms/AuthSignupForm";
import { resolveAuthError } from "../../lib/authErrors";

export default function Signup() {
  const navigate = useNavigate();
  const { user, isReady } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isReady && user) {
      navigate("/", { replace: true });
    }
  }, [isReady, user, navigate]);

  const submit = async (values) => {
    setFormError(null);
    setLoading(true);
    try {
      await CustomerAPI.register(values);
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`, {
        state: { registered: true },
      });
    } catch (err) {
      const resolved = resolveAuthError(
        err,
        "We could not create your account. Please try again."
      );

      // The address is already taken — signing in is the useful next step.
      if (resolved.kind === "conflict") {
        setFormError({
          ...resolved,
          action: <AuthLink to="/login" className="text-[13px]">Sign in instead</AuthLink>,
        });
      } else {
        setFormError(resolved);
      }
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      width="wide"
      title="Create an account and taste the difference."
      body="Request custom quotes, confirm reservations, and keep every detail of your event in one place."
    >
      <AuthSignupForm onSubmit={submit} loading={loading} formError={formError} />
    </AuthLayout>
  );
}
