import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export default function AuthLoginForm({ email, password, error, onEmailChange, onPasswordChange, onSubmit }) {
  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-foreground tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Sign in to manage your bookings.</p>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">EMAIL OR USERNAME</Label>
          <Input
            id="login-email"
            type="text"
            autoComplete="email username"
            placeholder="Email or Username"
            value={email}
            onChange={onEmailChange}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">PASSWORD</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={onPasswordChange}
            className="h-12"
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <Link className="text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-1" to="/">
            &larr; Back to homepage
          </Link>
          <Link className="text-primary hover:underline font-semibold" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button className="w-full h-12 text-base font-bold shadow-sm" type="submit">
          Login now
        </Button>

        <p className="text-center text-sm text-muted-foreground pt-4">
          Don't have an account? <Link className="text-primary font-bold hover:underline ml-1" to="/signup">Register</Link>
        </p>
      </form>
    </div>
  );
}
