import React, { useState } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";

/**
 * Interactive Filter Pill with Popover Dropdown.
 * Clean, consistent styling matching the iReserve Admin theme:
 *   - Inactive: [Icon] [Label] ▾ (clean white card with slate-200 border, slate-700 text)
 *   - Active:   (✕) [Label] | [Selected Value] ▾ (soft blue-50 background, blue-200 border, blue-700 text)
 */
export default function FilterPill({
  label,
  icon: Icon,
  value,
  defaultValue = "all",
  options = [],
  onSelect,
  onClear,
  customActive = false,
  customLabel = null,
  renderCustomContent = null,
  align = "start",
  className = "",
}) {
  const [open, setOpen] = useState(false);

  const isActive = customActive || (value !== undefined && value !== null && value !== defaultValue);
  const activeOption = options.find((opt) => String(opt.value) === String(value));
  const displayValue = customLabel || activeOption?.label || value;

  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onSelect) {
      onSelect(defaultValue);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={`h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none border font-sans shadow-2xs ${
            isActive
              ? "bg-blue-50/90 border-blue-200 text-blue-700 hover:bg-blue-100/70 hover:border-blue-300 font-semibold"
              : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50/80 hover:border-slate-300"
          } ${className}`}
        >
          {/* Active Clear X Icon Button */}
          {isActive ? (
            <span
              onClick={handleClear}
              role="button"
              tabIndex={0}
              title={`Clear ${label} filter`}
              className="grid place-items-center w-4 h-4 -ml-0.5 rounded-full hover:bg-blue-200/70 text-blue-600 transition-colors cursor-pointer"
            >
              <X size={11} strokeWidth={2.5} />
            </span>
          ) : Icon ? (
            <Icon size={12} className="text-slate-400 shrink-0" />
          ) : null}

          {/* Label & Active Value Display */}
          <span className="flex items-center gap-1">
            <span className={isActive ? "font-bold text-blue-900" : "text-slate-700"}>{label}</span>
            {isActive && (
              <>
                <span className="text-blue-300 font-normal">|</span>
                <span className="font-semibold text-blue-600 truncate max-w-[120px]">{displayValue}</span>
              </>
            )}
          </span>

          <ChevronDown
            size={12}
            className={`shrink-0 transition-transform duration-150 ${
              open ? "rotate-180 text-blue-600" : isActive ? "text-blue-500" : "text-slate-400"
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-64 p-1.5 rounded-xl border border-slate-200 bg-white shadow-xl z-50 text-xs space-y-1 font-sans text-slate-800 animate-in fade-in-50 zoom-in-95 duration-100"
      >
        {/* Popover Header */}
        <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>Filter by {label}</span>
          {isActive && (
            <button
              type="button"
              onClick={() => {
                handleClear({ stopPropagation: () => {} });
                setOpen(false);
              }}
              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-[11px] normal-case cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Custom Body Slot or Standard Option List */}
        {renderCustomContent ? (
          <div className="p-1">
            {renderCustomContent(() => setOpen(false))}
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-0.5 p-0.5">
            {options.map((opt) => {
              const selected = String(opt.value) === String(value);
              const OptIcon = opt.icon;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (onSelect) onSelect(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors cursor-pointer group ${
                    selected
                      ? "bg-blue-50/90 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        selected
                          ? "border border-blue-600 bg-blue-600 text-white"
                          : "border border-slate-300 text-transparent group-hover:border-slate-400"
                      }`}
                    >
                      {selected && <Check size={9} strokeWidth={3} />}
                    </div>

                    {OptIcon && (
                      <OptIcon
                        size={13}
                        className={`shrink-0 ${selected ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
                      />
                    )}

                    <span className="truncate">{opt.label}</span>
                  </div>

                  {opt.count !== undefined && opt.count !== null && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold shrink-0 ml-1.5 ${
                        selected
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/60"
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
