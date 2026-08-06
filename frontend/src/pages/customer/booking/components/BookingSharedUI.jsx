import React from "react";
import { ChevronDown, Plus, Minus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Booking flow design system
// -----------------------------------------------------------------------------
// Spacing scale ....... 4 / 8 / 12 / 16 / 24 (gap-1 … gap-6)
// Radius .............. controls: rounded-xl (12px) · cards: rounded-2xl (16px)
// Control height ...... h-10 (40px) — compact but comfortable
// Shadow .............. shadow-sm on resting surfaces, shadow-md on raised
// Typography .......... step title: Playfair 22–24px · section: 13px semibold
//                       body/control: 14px · label: 11px uppercase · help: 12px
// -----------------------------------------------------------------------------

export const ACCENT = "#4C81E0";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C81E0] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const controlBase =
  "w-full rounded-xl text-sm text-[#1E293B] placeholder-[#94A3B8] transition-all focus:outline-none focus:ring-2";
const controlIdle =
  "border border-[#E2E8F0] bg-[#F8FAFC] focus:ring-[#4C81E0]/40 focus:border-[#4C81E0] hover:border-[#CBD5E1]";
const controlError =
  "border border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-400";
const controlDisabled =
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[#F1F5F9] disabled:hover:border-[#E2E8F0]";

export function PrimaryBtn({
  onClick,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap";
  const sizes = {
    sm: "h-9 px-4 text-[13px]",
    md: "h-11 px-6 text-sm",
  };
  const v = {
    primary:
      "bg-[#4C81E0] text-white hover:bg-[#3D6BC4] shadow-sm hover:shadow-md active:scale-[0.98]",
    outline:
      "border border-[#4C81E0] text-[#4C81E0] bg-white hover:bg-[#D6E4F7]/60 active:scale-[0.98]",
    ghost:
      "text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] bg-transparent",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        base,
        sizes[size] || sizes.md,
        v[variant],
        focusRing,
        disabled && "opacity-40 cursor-not-allowed hover:shadow-none active:scale-100",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", onClick, ...rest }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-[#E2E8F0] shadow-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Field label. Pass `required` to render the consistent required marker. */
export function FL({ children, required = false, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
    >
      {children}
      {required && (
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

/** Label + control + helper/error, with consistent vertical rhythm. */
export function Field({ label, required, hint, error, children, className = "" }) {
  return (
    <div className={className}>
      {label && <FL required={required}>{label}</FL>}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[#94A3B8]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TInput({
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  icon,
  min,
  max,
  required,
  disabled = false,
  hasError = false,
  className = "",
  ...rest
}) {
  return (
    <div className="relative">
      {icon && (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        className={cn(
          controlBase,
          "h-10 pr-3",
          hasError ? controlError : controlIdle,
          controlDisabled,
          icon ? "pl-9" : "pl-3.5",
          className,
        )}
        {...rest}
      />
    </div>
  );
}

export function TSelect({
  value,
  onChange,
  options = [],
  placeholder,
  required,
  disabled = false,
  hasError = false,
  className = "",
  ...rest
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        required={required}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        className={cn(
          controlBase,
          "h-10 cursor-pointer appearance-none pl-3.5 pr-9",
          hasError ? controlError : controlIdle,
          controlDisabled,
          className,
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option
            key={typeof o === "string" ? o : o.value}
            value={typeof o === "string" ? o : o.value}
          >
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]",
          disabled && "opacity-50",
        )}
      />
    </div>
  );
}

export function TTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  required,
  disabled = false,
  hasError = false,
  className = "",
  ...rest
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      aria-invalid={hasError || undefined}
      className={cn(
        controlBase,
        "resize-none px-3.5 py-2.5 leading-relaxed",
        hasError ? controlError : controlIdle,
        controlDisabled,
        className,
      )}
      {...rest}
    />
  );
}

/** Step heading. Compact on desktop so steps stay above the fold. */
export function SH({ title, sub, aside }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <span
          className="mb-2 block h-[3px] w-8 rounded-full bg-[#C5A059]"
          aria-hidden="true"
        />
        <h2
          style={{ fontFamily: "Playfair Display, serif" }}
          className="text-xl font-semibold leading-tight text-[#1E293B] lg:text-2xl"
        >
          {title}
        </h2>
        {sub && <p className="mt-1 text-[13px] text-[#64748B]">{sub}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Small section heading used inside cards. */
export function SectionTitle({ icon: Icon, children, className = "", right }) {
  return (
    <div
      className={cn(
        "mb-3 flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-2",
        className,
      )}
    >
      <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[#1E293B]">
        {Icon && <Icon size={14} className="text-[#4C81E0]" />}
        {children}
      </h3>
      {right}
    </div>
  );
}

/** Informational callout used across steps. */
export function InfoNote({ icon: Icon, title, children, tone = "info", className = "" }) {
  const tones = {
    info: "border-[#4C81E0]/20 bg-[#4C81E0]/5 text-[#64748B]",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    danger: "border-red-200 bg-red-50 text-red-700",
  };
  const iconTones = {
    info: "text-[#4C81E0]",
    warn: "text-amber-500",
    success: "text-emerald-500",
    danger: "text-red-500",
  };
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-3 text-[13px] leading-relaxed",
        tones[tone],
        className,
      )}
    >
      {Icon && (
        <Icon size={16} className={cn("mt-0.5 shrink-0", iconTones[tone])} />
      )}
      <div className="min-w-0">
        {title && (
          <strong className="mb-0.5 block font-semibold text-[#1E293B]">
            {title}
          </strong>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Selectable tile used for packages, service types, delivery methods, etc.
 * Renders a real <button> so it is keyboard reachable and announces state.
 */
export function SelectableCard({
  selected = false,
  disabled = false,
  onClick,
  className = "",
  children,
  showCheck = true,
  ...rest
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative w-full rounded-2xl border-2 p-4 text-left transition-all duration-200",
        selected
          ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm"
          : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50 hover:shadow-sm",
        disabled && "cursor-not-allowed opacity-50 hover:border-[#E2E8F0] hover:shadow-none",
        focusRing,
        className,
      )}
      {...rest}
    >
      {selected && showCheck && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#4C81E0] text-white shadow-sm">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

/** Compact −/+ quantity control shared by both add-on steps. */
export function QtyStepper({ value = 0, onDecrease, onIncrease, label = "quantity" }) {
  const btn = cn(
    "flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#1E293B] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40",
    focusRing,
  );
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDecrease}
        disabled={value === 0}
        aria-label={`Decrease ${label}`}
        className={btn}
      >
        <Minus size={14} />
      </button>
      <span
        className="w-6 text-center text-sm font-semibold tabular-nums text-[#1E293B]"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label={`Increase ${label}`}
        className={btn}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export function GuestCounter({ value, onChange, min = 1, max = 1000 }) {
  const btn = cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#1E293B] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40",
    focusRing,
  );
  const numeric = Number(value) || min;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, numeric - 5))}
        disabled={numeric <= min}
        aria-label="Decrease guest count by 5"
        className={btn}
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        aria-label="Guest count"
        onChange={(e) =>
          onChange(Math.min(max, Math.max(min, Number(e.target.value))))
        }
        className={cn(
          controlBase,
          "h-10 flex-1 px-2 text-center font-semibold tabular-nums",
          controlIdle,
        )}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, numeric + 5))}
        disabled={numeric >= max}
        aria-label="Increase guest count by 5"
        className={btn}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/** Consistent peso formatting across the flow. */
export const formatPeso = (value, { decimals = 0 } = {}) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

/**
 * Standard step wrapper: one max width, one rhythm, optional sticky sidebar.
 * `width` keeps single-column steps readable without changing the page frame.
 */
export function StepShell({ children, aside, width = "wide", className = "" }) {
  const widths = {
    narrow: "max-w-2xl",
    medium: "max-w-4xl",
    wide: "max-w-6xl",
  };
  if (aside) {
    return (
      <div className={cn("mx-auto w-full", widths.wide, className)}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">{children}</div>
          <div className="w-full shrink-0 lg:w-[300px]">{aside}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("mx-auto w-full", widths[width] || widths.wide, className)}>
      {children}
    </div>
  );
}
