import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ArrowLeft } from "lucide-react";

export default function AuthForgotPasswordForm({ email, error, onEmailChange, onSubmit }) {
  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-foreground tracking-tight">Forgot password</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">We will send you a reset link.</p>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">EMAIL ADDRESS</Label>
          <Input 
            placeholder="you@example.com" 
            value={email} 
            onChange={onEmailChange} 
            className="h-12"
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium rounded-lg">
            {error}
          </div>
        )}

        <Button className="w-full h-12 text-base font-bold shadow-sm" type="submit">
          Send reset link
        </Button>

        <div className="text-center text-sm text-muted-foreground pt-4 flex items-center justify-center gap-1">
          Remembered it? <Link className="text-primary font-bold hover:underline flex items-center" to="/login"><ArrowLeft className="w-3 h-3 mr-1" /> Back to login</Link>
        </div>
      </form>
    </div>
  );
}
