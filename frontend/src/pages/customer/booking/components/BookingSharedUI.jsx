import React from "react";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrimaryBtn({ onClick, children, variant = "primary", disabled = false, className = "", type = "button" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 px-6 py-3 text-sm cursor-pointer select-none";
  const v = {
    primary: "bg-[#4C81E0] text-white hover:bg-[#3D6BC4] shadow-sm hover:shadow-md active:scale-[0.98]",
    outline: "border border-[#4C81E0] text-[#4C81E0] hover:bg-[#D6E4F7]/60 bg-transparent",
    ghost: "text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] bg-transparent",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, v[variant], disabled && "opacity-40 cursor-not-allowed", className)}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", onClick }) {
  return (
    <div 
      onClick={onClick} 
      className={cn("bg-white rounded-2xl border border-[#E2E8F0] shadow-sm", className)}
    >
      {children}
    </div>
  );
}

export function FL({ children }) {
  return (
    <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

export function TInput({ value, onChange, onBlur, placeholder, type = "text", icon, min, max, required, disabled = false, hasError = false, className = "" }) {
  return (
    <div className="relative">
      {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">{icon}</div>}
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange && onChange(e.target.value)} 
        onBlur={onBlur}
        placeholder={placeholder}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        aria-invalid={hasError}
        className={cn(
          "w-full pr-4 py-3 rounded-xl text-[#1E293B] text-sm placeholder-[#94A3B8] focus:outline-none transition-all",
          hasError
            ? "border border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200 focus:border-red-400"
            : "border border-[#E2E8F0] bg-[#F8FAFC] focus:ring-2 focus:ring-[#4C81E0]/50 focus:border-[#4C81E0]",
          icon ? "pl-9" : "pl-4",
          disabled ? "cursor-not-allowed opacity-70" : "",
          className,
        )}
        style={{ fontFamily: "Inter, sans-serif" }} 
      />
    </div>
  );
}

export function TSelect({ value, onChange, options, placeholder, required }) {
  return (
    <div className="relative">
      <select 
        value={value} 
        onChange={e => onChange && onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/50 focus:border-[#4C81E0] transition-all appearance-none pr-10 cursor-pointer"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
    </div>
  );
}

export function TTextarea({ value, onChange, placeholder, rows = 4, required }) {
  return (
    <textarea 
      value={value} 
      onChange={e => onChange && onChange(e.target.value)} 
      placeholder={placeholder} 
      rows={rows}
      required={required}
      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/50 resize-none transition-all"
      style={{ fontFamily: "Inter, sans-serif" }} 
    />
  );
}

export function SH({ title, sub }) {
  return (
    <div className="mb-7">
      <span className="mb-3 block h-[3px] w-10 rounded-full bg-[#C5A059]" aria-hidden="true" />
      <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-semibold text-[#1E293B] mb-1.5">{title}</h2>
      {sub && <p className="text-[#64748B] text-sm">{sub}</p>}
    </div>
  );
}

export function GuestCounter({ value, onChange, min = 1, max = 1000 }) {
  return (
    <div className="flex items-center gap-3">
      <button 
        type="button"
        onClick={() => onChange(Math.max(min, Number(value) - 5))} 
        className="w-10 h-10 rounded-xl border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition-colors flex-shrink-0"
      >
        <Minus size={14} />
      </button>
      <input 
        type="number" 
        value={value} 
        onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        className="flex-1 text-center px-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/50"
        style={{ fontFamily: "Inter, sans-serif" }} 
      />
      <button 
        type="button"
        onClick={() => onChange(Math.min(max, Number(value) + 5))} 
        className="w-10 h-10 rounded-xl border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition-colors flex-shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
