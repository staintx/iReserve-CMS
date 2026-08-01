import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2 } from "lucide-react";

export default function AuthSignupForm({ form, setForm, error, loading, onSubmit }) {
  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-foreground tracking-tight">Create account</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Start planning your event in minutes.</p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">FULL NAME</Label>
          <Input 
            placeholder="Juan Dela Cruz" 
            value={form.full_name} 
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
            disabled={loading} 
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">EMAIL ADDRESS</Label>
          <Input 
            placeholder="you@example.com" 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            disabled={loading} 
            className="h-12"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">PASSWORD</Label>
            <Input 
              placeholder="••••••••" 
              type="password" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              disabled={loading} 
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">CONFIRM PASSWORD</Label>
            <Input 
              placeholder="••••••••" 
              type="password" 
              value={form.confirm} 
              onChange={(e) => setForm({ ...form, confirm: e.target.value })} 
              disabled={loading} 
              className="h-12"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium rounded-lg">
            {error}
          </div>
        )}

        <Button className="w-full h-12 text-base font-bold shadow-sm mt-4" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground pt-4">
          Already have an account? <Link className="text-primary font-bold hover:underline ml-1" to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
