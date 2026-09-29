import React, { useState, useEffect, useRef, useCallback } from "react";
import Modal from "../common/Modal";
import { ShieldCheck, Mail, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfileOtpModal({
  isOpen,
  onClose,
  onVerify,
  onResend,
  maskedEmail,
  loading = false,
  error = "",
  setError = () => {},
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);

  // Reset state and focus first digit whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", "", "", ""]);
      setResendTimer(60);
      setError("");
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 60);
    }
  }, [isOpen, setError]);

  // Tick down the 60-second cooldown timer
  useEffect(() => {
    if (!isOpen || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, resendTimer]);

  const otpValue = digits.join("");

  const focusAt = (index) => {
    const target = inputRefs.current[Math.max(0, Math.min(5, index))];
    target?.focus();
    target?.select?.();
  };

  const handleDigitChange = (index, rawValue) => {
    const cleaned = rawValue.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    if (cleaned.length > 1) {
      // User typed or pasted multiple digits into this input
      const next = [...digits];
      const chars = cleaned.slice(0, 6 - index).split("");
      chars.forEach((ch, idx) => {
        next[index + idx] = ch;
      });
      setDigits(next);
      focusAt(index + chars.length);
      if (error) setError("");
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (error) setError("");

    if (index < 5) {
      focusAt(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      if (!digits[index] && index > 0) {
        event.preventDefault();
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        focusAt(index - 1);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      focusAt(index + 1);
    } else if (event.key === "Enter" && otpValue.length === 6) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, idx) => {
      next[idx] = char;
    });
    setDigits(next);
    if (error) setError("");
    focusAt(Math.min(5, pasted.length));
  };

  const handleResend = useCallback(async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setError("");
    try {
      if (onResend) {
        await onResend();
      }
      setResendTimer(60);
      setDigits(["", "", "", "", "", ""]);
      focusAt(0);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend verification code. Please try again.";
      setError(msg);
    } finally {
      setIsResending(false);
    }
  }, [resendTimer, isResending, onResend, setError]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError("");
    await onVerify(otpValue);
  };

  if (!isOpen) return null;

  const footerActions = (
    <div className="flex items-center justify-end gap-2.5">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="h-8.5 px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || otpValue.length !== 6}
        className="h-8.5 px-4 text-xs font-semibold text-white bg-[#2C4B8A] hover:bg-[#1E3563] rounded-md transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1.5 min-w-[125px] justify-center disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Verifying...</span>
          </>
        ) : (
          "Confirm & Save"
        )}
      </button>
    </div>
  );

  return (
    <Modal
      title="Security Verification"
      description="Enter the verification code sent to your email to confirm profile changes."
      icon={ShieldCheck}
      badge={
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2C4B8A]/10 text-[#2C4B8A] border border-[#2C4B8A]/20">
          2FA
        </span>
      }
      onClose={onClose}
      className="max-w-[420px]"
      bodyClassName="p-4 sm:p-5 space-y-4"
      footer={footerActions}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipient Notice Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/90 border border-slate-200/80">
          <div className="w-8 h-8 rounded-lg bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-500 leading-none">Code sent to</p>
            <p className="text-xs font-bold text-slate-900 truncate tracking-wide mt-1">
              {maskedEmail || "your registered email"}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sent
          </div>
        </div>

        {/* 6-Digit OTP Boxes */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-center text-[11px] font-semibold text-slate-700">
            Enter 6-Digit Verification Code
          </label>
          <div
            role="group"
            aria-label="Verification code digits"
            className="flex items-center justify-center gap-2 sm:gap-2.5 py-1"
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                disabled={loading}
                aria-label={`Digit ${index + 1} of 6`}
                aria-invalid={Boolean(error) || undefined}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className={cn(
                  "w-10 h-11 sm:w-11 sm:h-12 text-center text-lg font-bold rounded-lg border tabular-nums transition-all focus:outline-none",
                  error
                    ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-[#2C4B8A] focus:ring-2 focus:ring-[#2C4B8A]/15 focus:bg-white",
                  loading && "opacity-60 cursor-not-allowed bg-slate-50"
                )}
              />
            ))}
          </div>
        </div>

        {/* Inline Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-in fade-in-50">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Resend Cooldown UI */}
        <div className="text-center pt-0.5">
          {resendTimer > 0 ? (
            <p className="text-xs text-slate-500">
              Resend code in{" "}
              <span className="font-semibold tabular-nums text-slate-800">
                {resendTimer}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || loading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2C4B8A] hover:text-[#1E3563] hover:underline transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
              <span>Resend Verification Code</span>
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
