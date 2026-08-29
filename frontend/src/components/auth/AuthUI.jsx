import React, { forwardRef, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Auth design system
// -----------------------------------------------------------------------------
// Shares the iReserve portal language already used by the booking flow
// (BookingSharedUI.jsx): Royal Blue #4C81E0 · Powder #D6E4F7 · Slate #1E293B /
// #64748B · Surface #F8FAFC · gold #C5A059 as a decorative accent only.
//
// Radius ......... controls rounded-xl (12px) · cards rounded-2xl (16px)
// Control height . h-11 (44px) — touch-friendly on mobile
// Typography ..... heading Playfair · everything else Work Sans
//                  label 11px uppercase · control 14px · help 12–13px
// -----------------------------------------------------------------------------

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const controlBase =
  "w-full rounded-xl text-sm text-[#1E293B] placeholder-[#94A3B8] transition-all duration-200 focus:outline-none focus:ring-2";
const controlIdle =
  "border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1] focus:border-[#2C4B8A] focus:ring-[#2C4B8A]/25 focus:bg-white";
const controlError =
  "border border-[#DC2626]/40 bg-[#FEF2F2] focus:border-[#DC2626] focus:ring-[#DC2626]/20";
const controlDisabled =
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[#F1F5F9] disabled:hover:border-[#E2E8F0]";

/* ── Heading ──────────────────────────────────────────────────────────────── */

/**
 * Gold hairline + Playfair title + supporting line — the same rule the booking
 * step headers use. `step` states where the user is in a multi-screen flow
 * ("Step 1 of 2 · Create account"); it replaces the hairline rather than
 * stacking another decorative element on top of it.
 */
export function AuthHeading({ title, subtitle, step, align = "left", className = "" }) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {step ? (
        <p
          className={cn(
            "mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]",
            align === "center" && "justify-center"
          )}
        >
          <span className="h-[3px] w-6 shrink-0 rounded-full bg-[#C5A059]" aria-hidden="true" />
          {step}
        </p>
      ) : (
        <span
          className={cn(
            "mb-2.5 block h-[3px] w-8 rounded-full bg-[#C5A059]",
            align === "center" && "mx-auto"
          )}
          aria-hidden="true"
        />
      )}
      <h1
        style={{ fontFamily: "Playfair Display, serif" }}
        className="text-[22px] font-semibold leading-tight tracking-tight text-[#1E293B] sm:text-[25px]"
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-[#64748B]">{subtitle}</p>
      )}
    </div>
  );
}

/* ── Field ────────────────────────────────────────────────────────────────── */

/**
 * Label + control + one message slot. Error and hint share the slot, and it is
 * only rendered when there is something to say — reserving a blank line under
 * every field is what makes a four-field form feel twice as tall as it is.
 */
export function AuthField({ id, label, hint, error, optionalLabel, children, className = "" }) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
        >
          {label}
        </label>
        {optionalLabel && (
          <span className="text-[11px] font-medium text-[#64748B]">{optionalLabel}</span>
        )}
      </div>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 flex items-start gap-1.5 text-xs font-medium text-[#DC2626]"
        >
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-[#64748B]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ── Text input ───────────────────────────────────────────────────────────── */

export const AuthInput = forwardRef(function AuthInput(
  { id, icon: Icon, hasError = false, describedBy, className = "", ...rest },
  ref
) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={16}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors",
            hasError ? "text-[#DC2626]/70" : "text-[#94A3B8]"
          )}
        />
      )}
      <input
        id={id}
        ref={ref}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className={cn(
          controlBase,
          "h-10 sm:h-[42px] pr-3.5",
          Icon ? "pl-9 sm:pl-10" : "pl-3.5",
          hasError ? controlError : controlIdle,
          controlDisabled,
          className
        )}
        {...rest}
      />
    </div>
  );
});

/* ── Password input ───────────────────────────────────────────────────────── */

/**
 * Password control with a keyboard-reachable visibility toggle. The toggle sits
 * inside the padding reserved on the right, so revealing never shifts layout.
 */
export const AuthPasswordInput = forwardRef(function AuthPasswordInput(
  { id, visible, onToggleVisibility, hasError = false, describedBy, icon: Icon, className = "", ...rest },
  ref
) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={16}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors",
            hasError ? "text-[#DC2626]/70" : "text-[#94A3B8]"
          )}
        />
      )}
      <input
        id={id}
        ref={ref}
        type={visible ? "text" : "password"}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className={cn(
          controlBase,
          "h-10 sm:h-[42px] pr-10 sm:pr-11",
          Icon ? "pl-9 sm:pl-10" : "pl-3.5",
          hasError ? controlError : controlIdle,
          controlDisabled,
          className
        )}
        {...rest}
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={rest.disabled ? -1 : 0}
        className={cn(
          // #64748B rather than the lighter icon grey: this is an interactive
          // control, so it needs to clear the 3:1 non-text contrast bar.
          "absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#E2E8F0]/60 hover:text-[#1E293B]",
          focusRing
        )}
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  );
});

/* ── Buttons ──────────────────────────────────────────────────────────────── */

/**
 * `loading` swaps the label for a spinner and blocks repeat submits. Buttons are
 * fixed-height and (in forms) full-width, so the swap can't shift the layout.
 */
export function AuthButton({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  loadingLabel,
  disabled = false,
  className = "",
  ...rest
}) {
  const sizes = {
    sm: "h-9 px-4 text-[13px]",
    md: "h-10 sm:h-[42px] px-6 text-sm",
  };
  const variants = {
    primary:
      "bg-[#2C4B8A] text-white shadow-sm hover:bg-[#1E3563] hover:shadow-md active:scale-[0.99]",
    outline:
      "border border-[#2C4B8A] bg-white text-[#2C4B8A] hover:bg-[#2C4B8A]/10 active:scale-[0.99]",
    subtle:
      "border border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]",
    ghost: "bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200",
        sizes[size] || sizes.md,
        variants[variant],
        focusRing,
        (disabled || loading) && "cursor-not-allowed opacity-60 hover:shadow-sm active:scale-100",
        className
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {loadingLabel || children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Inline text action that keeps its own focus ring (resend, "use another email"). */
export function AuthTextButton({ children, className = "", ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md font-semibold text-[#2C4B8A] underline-offset-4 transition-colors hover:text-[#1E3563] hover:underline disabled:cursor-not-allowed disabled:text-[#94A3B8] disabled:no-underline",
        focusRing,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function AuthLink({ to, children, className = "", ...rest }) {
  return (
    <Link
      to={to}
      className={cn(
        "rounded-md font-semibold text-[#2C4B8A] underline-offset-4 transition-colors hover:text-[#1E3563] hover:underline",
        focusRing,
        className
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

/* ── Alerts ───────────────────────────────────────────────────────────────── */

const alertTones = {
  info: {
    wrap: "border-[#2C4B8A]/25 bg-[#2C4B8A]/[0.06] text-[#1E293B]",
    icon: "text-[#2C4B8A]",
    Icon: Info,
  },
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: "text-emerald-600",
    Icon: CheckCircle2,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "text-amber-600",
    Icon: TriangleAlert,
  },
  error: {
    wrap: "border-[#DC2626]/25 bg-[#FEF2F2] text-[#991B1B]",
    icon: "text-[#DC2626]",
    Icon: AlertCircle,
  },
};

/**
 * Form-level feedback. Errors announce themselves; everything else is polite.
 * The icon carries the meaning alongside the colour, never colour alone.
 */
export function AuthAlert({ tone = "error", title, children, action, className = "" }) {
  const config = alertTones[tone] || alertTones.error;
  const { Icon } = config;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border p-3 text-[13px] leading-relaxed",
        config.wrap,
        className
      )}
    >
      <Icon size={16} className={cn("mt-0.5 shrink-0", config.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <strong className="mb-0.5 block font-semibold">{title}</strong>}
        {children}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/* ── Full-panel state ─────────────────────────────────────────────────────── */

const statusTones = {
  success: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  error: "bg-[#FEF2F2] text-[#DC2626] ring-[#FEE2E2]",
  warning: "bg-amber-50 text-amber-600 ring-amber-100",
  info: "bg-[#2C4B8A]/10 text-[#2C4B8A] ring-[#2C4B8A]/20",
};

/**
 * The designed outcome screen — sent, verified, expired, failed. Used instead of
 * dropping the user back on the form they just submitted.
 */
export function AuthStatus({
  icon,
  tone = "info",
  title,
  description,
  children,
  actions,
  className = "",
}) {
  const Icon = icon;
  return (
    <div className={cn("text-center", className)}>
      {/* auth-pop is a short scale/fade defined in globals.css; it is switched
          off wholesale under prefers-reduced-motion. */}
      <div
        className={cn(
          "auth-pop mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ring-8",
          statusTones[tone] || statusTones.info
        )}
      >
        <Icon size={26} aria-hidden="true" />
      </div>
      <h1
        style={{ fontFamily: "Playfair Display, serif" }}
        className="text-[24px] font-semibold leading-tight tracking-tight text-[#1E293B] sm:text-[26px]"
      >
        {title}
      </h1>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[#64748B]">
          {description}
        </p>
      )}
      {children && <div className="mt-4 text-left">{children}</div>}
      {actions && <div className="mt-5 flex flex-col gap-2">{actions}</div>}
    </div>
  );
}

/** Centred spinner used while a link-based verification is in flight. */
export function AuthPending({ title, description }) {
  return (
    <div className="py-6 text-center" role="status" aria-live="polite">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2C4B8A]/10 text-[#2C4B8A] ring-8 ring-[#2C4B8A]/20">
        <Loader2 size={26} className="animate-spin" aria-hidden="true" />
      </div>
      <h1
        style={{ fontFamily: "Playfair Display, serif" }}
        className="text-[24px] font-semibold leading-tight text-[#1E293B]"
      >
        {title}
      </h1>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#64748B]">
          {description}
        </p>
      )}
    </div>
  );
}

/* ── Footer prompt ────────────────────────────────────────────────────────── */

/** The one supporting link at the bottom of a form — deliberately quiet. */
export function AuthPrompt({ children, className = "" }) {
  return (
    <p className={cn("text-center text-[13px] text-[#64748B]", className)}>{children}</p>
  );
}

/** Small caps section marker used to group fields inside a longer form. */
export function AuthSection({ label, children, className = "" }) {
  return (
    <section className={className}>
      {/* font-sans is explicit: the base layer gives every h2 the Playfair serif. */}
      <h2 className="mb-2.5 flex items-center gap-2.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
        {label}
        <span className="h-px flex-1 bg-[#E2E8F0]" aria-hidden="true" />
      </h2>
      {children}
    </section>
  );
}

/** Emphasises which address a message was sent to, without shouting. */
export function EmailChip({ email }) {
  if (!email) return null;
  return (
    <span className="break-all font-semibold text-[#1E293B]">{email}</span>
  );
}

/* ── One-time code input ──────────────────────────────────────────────────── */

/**
 * Six single-character boxes backed by real inputs, so paste, autofill
 * (`one-time-code`), arrow keys and screen readers all behave.
 */
export function OtpInput({
  value = "",
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
  describedBy,
  label = "Verification code",
}) {
  const groupId = useId();
  const inputsRef = useRef([]);
  const digits = Array.from({ length }, (_, index) => value[index] || "");

  const focusAt = (index) => {
    const next = inputsRef.current[Math.max(0, Math.min(length - 1, index))];
    next?.focus();
    next?.select?.();
  };

  const writeAt = (index, digit) => {
    const chars = Array.from({ length }, (_, position) => value[position] || "");
    chars[index] = digit;
    onChange(chars.join(""));
  };

  const handleChange = (index, raw) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      writeAt(index, "");
      return;
    }
    if (cleaned.length > 1) {
      // Typing/pasting several digits at once fills forward from here.
      const merged = (value.slice(0, index) + cleaned).slice(0, length);
      onChange(merged);
      focusAt(merged.length);
      return;
    }
    writeAt(index, cleaned);
    if (index < length - 1) focusAt(index + 1);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      writeAt(index - 1, "");
      focusAt(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focusAt(pasted.length);
  };

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className="flex items-center gap-1.5 sm:gap-2.5"
    >
      {digits.map((digit, index) => (
        <input
          key={`${groupId}-${index}`}
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={hasError || undefined}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={cn(
            // Explicit radius: the theme's rounded-xl (24px) would turn a
            // square box into a circle. Height steps down at 375–414px so six
            // boxes plus gaps still fit the card without squeezing.
            "h-12 w-full min-w-0 rounded-[14px] text-center text-lg font-semibold tabular-nums text-[#1E293B] transition-all duration-200 focus:outline-none focus:ring-2 sm:h-[52px]",
            hasError ? controlError : controlIdle,
            controlDisabled
          )}
        />
      ))}
    </div>
  );
}
