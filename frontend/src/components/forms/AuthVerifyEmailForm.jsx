import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuthVerifyEmailForm({
  email,
  otp,
  status,
  justRegistered,
  token,
  onEmailChange,
  onOtpChange,
  onSubmitOtp,
  onResendOtp
}) {
  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-foreground tracking-tight">Verify your email</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Enter the 6-digit code we sent to your email address.
        </p>
      </div>

      {justRegistered && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-medium rounded-lg">
          Registration successful. Please check your email for the OTP to verify your account.
        </div>
      )}
      
      {status.loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Verifying your email...
        </div>
      )}

      {!token && (
        <form className="space-y-6" onSubmit={onSubmitOtp}>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">EMAIL ADDRESS</Label>
            <Input 
              placeholder="you@example.com" 
              value={email} 
              onChange={onEmailChange} 
              className="h-12"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">OTP (6 DIGITS)</Label>
            <Input 
              placeholder="000000" 
              value={otp} 
              onChange={onOtpChange} 
              className="h-12 text-center text-xl tracking-widest font-mono"
              maxLength={6}
            />
          </div>

          {status.message && !status.loading && (
            <div className={cn(
              "p-3 text-sm font-medium rounded-lg border",
              status.tone === "success" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600",
              status.tone === "error" && "bg-destructive/10 border-destructive/20 text-destructive",
              status.tone === "info" && "bg-muted text-muted-foreground border-border"
            )}>
              {status.message}
            </div>
          )}

          <Button className="w-full h-12 text-base font-bold shadow-sm" type="submit" disabled={status.loading}>
            Verify
          </Button>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground pt-4">
        Didn't receive the code?{" "}
        <button
          className="text-primary font-bold hover:underline"
          type="button"
          onClick={onResendOtp}
        >
          Resend OTP
        </button>
      </div>

      <div className="text-center text-sm text-muted-foreground pt-2 flex items-center justify-center gap-1">
        Already verified? <Link className="text-primary font-bold hover:underline flex items-center ml-1" to="/login"><ArrowLeft className="w-3 h-3 mr-1" /> Go to login</Link>
      </div>
    </div>
  );
}
