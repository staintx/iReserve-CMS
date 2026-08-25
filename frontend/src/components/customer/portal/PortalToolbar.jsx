import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_SEGMENT_ACTIVE } from "./tones";
import { FILTER_ACTIVE_BRAND } from "./actionStyles";

/**
 * Shared operational toolbar: status segments + search + category chips.
 */
export default function PortalToolbar({
  segments = [],
  activeSegment,
  onSegmentChange,
  search,
  filter,
  className,
}) {
  return (
    <div className={cn("rounded-md border border-slate-200 bg-white p-3 sm:p-3.5 shadow-2xs", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {segments.length > 0 && (
          <div className="-mx-1 w-full min-w-0 overflow-x-auto px-1 pb-1 lg:w-auto lg:pb-0">
            <div className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-100/80 p-1">
              {segments.map((segment) => {
                const isActive = activeSegment === segment.id;
                const tone = segment.tone || "neutral";
                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => onSegmentChange?.(segment.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] cursor-pointer",
                      isActive
                        ? cn("font-bold", TONE_SEGMENT_ACTIVE[tone] || TONE_SEGMENT_ACTIVE.neutral)
                        : "font-medium text-slate-600 hover:bg-white/80 hover:text-slate-900"
                    )}
                  >
                    {segment.label}
                    {typeof segment.count === "number" && (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.2 text-[10px] tabular-nums transition-colors",
                          isActive
                            ? "bg-white/20 text-white font-bold"
                            : "bg-white text-slate-600 font-semibold border border-slate-200/80"
                        )}
                      >
                        {segment.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {search && (
          <div className="relative w-full lg:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder || "Search"}
              aria-label={search.label || search.placeholder || "Search"}
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]"
            />
          </div>
        )}
      </div>

      {filter && filter.options?.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
          <span className="text-xs font-semibold text-slate-600">{filter.label}</span>
          {filter.options.map((option) => {
            const isActive = filter.value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => filter.onChange?.(option.id)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]",
                  isActive
                    ? cn("font-bold border-[#2C4B8A] bg-[#2C4B8A] text-white", FILTER_ACTIVE_BRAND)
                    : "border-slate-200 font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {isActive && <Check className="h-3 w-3" aria-hidden="true" />}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
