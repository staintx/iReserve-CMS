import React from "react";
import { ChevronDown, Plus, Minus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { focusRing } from "../lib/bookingUI";

const controlBase =
  "w-full rounded-md text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2";
const controlIdle =
  "border border-slate-200 bg-white focus:ring-[#4C81E0]/20 focus:border-[#4C81E0] hover:border-slate-300";
const controlError =
  "border border-red-300 bg-red-50/50 focus:ring-red-200 focus:border-red-400";
const controlDisabled =
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-100 disabled:hover:border-slate-200";

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
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 cursor-pointer select-none whitespace-nowrap";
  const sizes = {
    sm: "h-8.5 px-3 text-xs",
    md: "h-10 px-4 sm:px-5 text-xs sm:text-sm",
  };
  const v = {
    primary:
      "bg-[#4C81E0] text-white hover:bg-[#3b6ec6] shadow-2xs active:scale-[0.98]",
    outline:
      "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98]",
    ghost:
      "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent",
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
        "bg-white rounded-lg border border-slate-200/90 shadow-2xs",
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
      className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600"
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
        <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
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

/**
 * Step heading. Clean, modern, high-density display.
 */
export function SH({ title, sub, aside }) {
  return (
    <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-2">
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug">
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-xs text-slate-500 leading-normal">{sub}</p>}
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
        "mb-2.5 flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5",
        className,
      )}
    >
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
        {Icon && <Icon size={14} className="text-[#4C81E0]" />}
        {children}
      </h3>
      {right}
    </div>
  );
}

/**
 * A field's at-a-glance state, for a sub-section header.
 */
export function FieldStatusPill({ value, optionalLabel = "Optional" }) {
  const filled = Boolean(value);
  return (
    <span
      className={cn(
        "inline-flex max-w-[220px] items-center gap-1 truncate rounded-md px-2 py-0.5 text-[11px] font-semibold",
        filled
          ? "bg-[#4C81E0]/10 text-[#4C81E0]"
          : "bg-slate-100 text-slate-400",
      )}
      title={filled ? value : undefined}
    >
      {filled ? value : optionalLabel}
    </span>
  );
}

/** Informational callout used across steps. */
export function InfoNote({ icon: Icon, title, children, tone = "info", className = "" }) {
  const tones = {
    info: "border-blue-200 bg-blue-50/60 text-slate-600",
    warn: "border-amber-200 bg-amber-50/70 text-amber-900",
    success: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    danger: "border-red-200 bg-red-50/70 text-red-700",
  };
  const iconTones = {
    info: "text-[#4C81E0]",
    warn: "text-amber-600",
    success: "text-emerald-600",
    danger: "text-red-500",
  };
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border p-2.5 text-xs leading-relaxed",
        tones[tone],
        className,
      )}
    >
      {Icon && (
        <Icon size={15} className={cn("mt-0.5 shrink-0", iconTones[tone])} />
      )}
      <div className="min-w-0">
        {title && (
          <strong className="mb-0.5 block font-semibold text-slate-900">
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
        "relative w-full rounded-lg border p-3 sm:p-3.5 text-left transition-all duration-150 cursor-pointer select-none",
        selected
          ? "border-[#4C81E0] bg-[#4C81E0]/[0.03] ring-1 ring-[#4C81E0] shadow-xs"
          : "border-slate-200 bg-white hover:border-[#4C81E0]/40 hover:bg-slate-50/60 shadow-2xs",
        disabled && "cursor-not-allowed opacity-50 hover:border-slate-200 hover:bg-white hover:shadow-none",
        focusRing,
        className,
      )}
      {...rest}
    >
      {selected && showCheck && (
        <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4C81E0] text-white shadow-2xs">
          <Check size={10} strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

/** Compact −/+ quantity control shared by both add-on steps. */
export function QtyStepper({ value = 0, onDecrease, onIncrease, label = "quantity" }) {
  const btn = cn(
    "flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer",
    focusRing,
  );
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onDecrease}
        disabled={value === 0}
        aria-label={`Decrease ${label}`}
        className={btn}
      >
        <Minus size={13} />
      </button>
      <span
        className="w-5 text-center text-xs font-bold tabular-nums text-slate-800"
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
        <Plus size={13} />
      </button>
    </div>
  );
}

/**
 * Guest count counter. Clean, responsive, high-density.
 */
export function GuestCounter({ value, onChange, min = 1, max = 300 }) {
  const numeric = Number(value) || 0;
  const [draft, setDraft] = React.useState(String(value ?? ""));
  const [focused, setFocused] = React.useState(false);

  // Follow the form while the customer is not mid-edit.
  React.useEffect(() => {
    if (!focused) setDraft(String(value ?? ""));
  }, [value, focused]);

  const clamp = (n) => Math.min(max, Math.max(min, n));
  const step = (delta) => onChange(clamp((numeric || min) + delta));

  const commit = () => {
    setFocused(false);
    const parsed = parseInt(String(draft).replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value ?? min));
      return;
    }
    const next = clamp(parsed);
    setDraft(String(next));
    onChange(next);
  };

  const btn = cn(
    "flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer",
    focusRing,
  );

  // Round numbers inside the allowed range, so the common cases are one tap.
  const basePresets = [25, 50, 60, 75, 80, 100, 150, 200, 250, 300];
  let presets = basePresets.filter((n) => n >= min && n <= max);
  if (presets.length <= 1 && max > min) {
    const stepSize = Math.max(10, Math.round((max - min) / 4 / 10) * 10 || 10);
    const generated = [];
    for (let val = min; val <= max; val += stepSize) {
      generated.push(val);
    }
    if (!generated.includes(max)) generated.push(max);
    presets = generated;
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => step(-10)}
          disabled={numeric <= min}
          aria-label="Ten fewer guests"
          className={btn}
        >
          <Minus size={14} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          min={min}
          max={max}
          aria-label="Number of guests"
          onFocus={() => setFocused(true)}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
          }}
          className={cn(
            controlBase,
            "h-9.5 flex-1 px-2 text-center text-sm font-bold tabular-nums",
            controlIdle,
          )}
        />
        <button
          type="button"
          onClick={() => step(10)}
          disabled={numeric >= max}
          aria-label="Ten more guests"
          className={btn}
        >
          <Plus size={14} />
        </button>
      </div>

      {presets.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-pressed={numeric === preset}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors cursor-pointer",
                numeric === preset
                  ? "border-[#4C81E0] bg-[#4C81E0]/10 text-[#4C81E0]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                focusRing,
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Standard step wrapper: one max width, one rhythm, optional sticky sidebar.
 */
export function StepShell({ children, aside, width = "wide", className = "" }) {
  const widths = {
    narrow: "max-w-2xl",
    medium: "max-w-4xl",
    wide: "max-w-5xl",
  };
  if (aside) {
    return (
      <div className={cn("mx-auto w-full", widths.wide, className)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">{children}</div>
          <div className="w-full shrink-0 lg:w-[290px]">{aside}</div>
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
