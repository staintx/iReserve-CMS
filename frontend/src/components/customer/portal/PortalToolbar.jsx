import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared list toolbar: status segments + search + one row of secondary chips.
 *
 * Segments are deliberately monochrome — the status colour lives on the cards,
 * so the filter row stays quiet and the list below does the talking.
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
                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => onSegmentChange?.(segment.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-card font-semibold text-foreground shadow-sm"
                        : "font-medium text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {segment.label}
                    {typeof segment.count === "number" && (
                      // Count chip inherits the button's text colour so contrast
                      // holds in both states.
                      <span className={cn("rounded px-1.5 py-0.5 text-xs tabular-nums", isActive ? "bg-powder" : "bg-card")}>
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
          <span className="text-sm text-muted-foreground">{filter.label}</span>
          {filter.options.map((option) => {
            const isActive = filter.value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => filter.onChange?.(option.id)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary/40 bg-powder font-medium text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
