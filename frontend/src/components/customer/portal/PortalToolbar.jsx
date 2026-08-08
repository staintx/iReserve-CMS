import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_SEGMENT_ACTIVE } from "./tones";
import { FILTER_ACTIVE_BRAND } from "./actionStyles";

/**
 * Shared list toolbar: status segments + search + one row of secondary chips.
 *
 * Status segments carry a soft pastel tint when active, matching the status
 * pill colour they filter for (e.g. "Confirmed" activates green) — the
 * service-type chips are a different kind of filter (category, not status),
 * so they activate in a single calm brand blue instead.
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
    <div className={cn("rounded-xl border border-border bg-card p-3 sm:p-4", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* The segment track scrolls sideways on narrow screens. w-full +
            min-w-0 are what make it a scroll container — without them the
            inline-flex track widens its parent instead. */}
        {segments.length > 0 && (
          <div className="-mx-1 w-full min-w-0 overflow-x-auto px-1 pb-1 lg:w-auto lg:pb-0">
            <div className="inline-flex items-center gap-1 rounded-lg bg-muted/60 p-1">
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
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? cn("font-semibold", TONE_SEGMENT_ACTIVE[tone] || TONE_SEGMENT_ACTIVE.neutral)
                        : "font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground"
                    )}
                  >
                    {segment.label}
                    {typeof segment.count === "number" && (
                      // Count chip inherits the button's text colour so contrast
                      // holds in both states; active pastel tones get a
                      // translucent white chip instead of the neutral grey one.
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs tabular-nums",
                          isActive
                            ? tone === "neutral"
                              ? "bg-muted font-semibold"
                              : "bg-white/60 font-semibold"
                            : "bg-card font-medium"
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
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder || "Search"}
              aria-label={search.label || search.placeholder || "Search"}
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
      </div>

      {filter && filter.options?.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-sm font-medium text-foreground">{filter.label}</span>
          {filter.options.map((option) => {
            const isActive = filter.value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => filter.onChange?.(option.id)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    // Category filter (not a status), so it gets its own
                    // single calm navy rather than a status pastel — filled +
                    // ticked + bold so it also survives greyscale.
                    ? cn("font-semibold", FILTER_ACTIVE_BRAND)
                    : "border-border font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
