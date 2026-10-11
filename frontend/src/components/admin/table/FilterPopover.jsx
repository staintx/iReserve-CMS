import { useState } from "react";
import { Filter, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { cn } from "@/lib/utils";

/**
 * Shared "advanced filters" trigger + popover styled consistently with FilterPill:
 *   - Inactive: [Filter] [Label] ▾ (clean white card with slate-200 border, slate-700 text)
 *   - Active:   [Filter] [Label] [Count] ▾ (soft blue-50 background, blue-200 border, blue-700 text)
 *   - Header:   FILTER BY [LABEL] in text-[10px] font-bold uppercase tracking-wider text-slate-500 with Reset
 *   - Inputs:   rounded-lg border-slate-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-blue-500/15
 *   - Buttons:  Clear all (slate-500 hover:text-slate-800) + Apply (blue-600 hover:bg-blue-700 text-white)
 */
export default function FilterPopover({
  label = "Filters",
  activeCount = 0,
  onApply,
  onClear,
  align = "end",
  className,
  children,
}) {
  const [open, setOpen] = useState(false);
  const isActive = activeCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={cn(
            "h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none border font-sans shadow-2xs",
            isActive || open
              ? "bg-blue-50/90 border-blue-200 text-blue-700 hover:bg-blue-100/70 hover:border-blue-300 font-semibold"
              : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50/80 hover:border-slate-300"
          )}
        >
          <Filter
            size={12}
            className={cn(
              "shrink-0 transition-colors",
              isActive || open ? "text-blue-600" : "text-slate-400"
            )}
          />
          <span>{label}</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={12}
            className={cn(
              "shrink-0 transition-transform duration-150",
              open ? "rotate-180 text-blue-600" : isActive ? "text-blue-500" : "text-slate-400"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className={cn(
          "w-72 sm:w-80 p-0 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 text-xs font-sans text-slate-800 animate-in fade-in-50 zoom-in-95 duration-100 overflow-hidden",
          className
        )}
      >
        {/* Popover Header matching FilterPill standard */}
        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/50">
          <span>Filter by {label}</span>
          {isActive && (
            <button
              type="button"
              onClick={() => {
                onClear?.();
                setOpen(false);
              }}
              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-[11px] normal-case cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="p-3.5 space-y-3.5">
          {children}

          {/* Popover Actions Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
            <button
              type="button"
              onClick={() => {
                onClear?.();
                setOpen(false);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline transition-colors cursor-pointer"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => {
                onApply?.();
                setOpen(false);
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer active:scale-95"
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Shared Field Wrapper for filter inputs and selects.
 */
export function FilterField({ label, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

/**
 * Shared Radio Option Group for single-select filter categories/statuses.
 * Matches FilterPill option styling exactly (Photo 2).
 */
export function FilterRadioGroup({ options = [], value, onChange }) {
  return (
    <div className="space-y-0.5">
      {options.map((opt) => {
        const selected = String(opt.value) === String(value);
        const OptIcon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange?.(opt.value)}
            className={cn(
              "w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-left text-xs transition-colors cursor-pointer group",
              selected
                ? "bg-blue-50/90 text-blue-700 font-semibold"
                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className={cn(
                  "w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  selected
                    ? "border border-blue-600 bg-blue-600 text-white"
                    : "border border-slate-300 text-transparent group-hover:border-slate-400"
                )}
              >
                {selected && <Check size={9} strokeWidth={3} />}
              </div>
              {OptIcon && (
                <OptIcon
                  size={13}
                  className={cn(
                    "shrink-0",
                    selected ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
              )}
              <span className="truncate">{opt.label}</span>
            </div>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  selected
                    ? "bg-blue-200/60 text-blue-800"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
