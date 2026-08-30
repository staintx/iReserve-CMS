import { Search, X } from "lucide-react";

/**
 * Shared table toolbar layout (design standard §03, rules 2 & 3):
 * search always top-left, quick filter tabs beside it, extra controls
 * (Filters popover trigger, page actions) in a right-aligned slot.
 *
 * Mobile behaviour, which is where the old single wrapping flex row fell
 * apart: search takes its own full-width row at a 44px height, and the
 * quick filters become a horizontally scrollable chip rail with snap
 * points instead of wrapping into three ragged lines that pushed the
 * list itself below the fold. The rail is edge-to-edge — it is bled out
 * past the card padding — because a chip clipped at the viewport edge is
 * the affordance that tells you there are more chips to the right.
 *
 * `type="search"` gives Android and iOS a Search key on the keyboard and
 * a native clear affordance; the explicit clear button is there because
 * WebKit hides its own once the field is styled.
 */
export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  quickFilters,
  activeQuickFilter,
  onQuickFilterChange,
  right,
}) {
  const hasFilters = quickFilters && quickFilters.length > 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 sm:flex-wrap">
      <div className="flex items-center gap-2 bg-muted/60 border border-border/70 rounded-md px-3 h-11 sm:h-auto sm:py-1.5 w-full sm:w-auto sm:flex-1 sm:min-w-48 shadow-2xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
        <Search size={15} className="text-muted-foreground/70 shrink-0" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          /* h-full, so the tap target is the whole 44px field rather than the
             23px band the text happens to occupy. */
          className="h-full w-full bg-transparent text-sm focus:outline-none flex-1 min-w-0 text-foreground [&::-webkit-search-cancel-button]:hidden"
          style={{ fontFamily: "var(--font-sans, Inter), sans-serif" }}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-border/70 hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {hasFilters && (
        <div
          role="group"
          aria-label="Quick filters"
          className="flex gap-1.5 sm:gap-1 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-2.5 px-2.5 pb-0.5 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:flex-wrap"
        >
          {quickFilters.map((qf) => {
            const isActive = activeQuickFilter === qf.value;
            return (
              <button
                key={qf.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onQuickFilterChange(qf.value)}
                className={`shrink-0 snap-start px-3.5 sm:px-3 h-10 sm:h-auto sm:py-1.5 rounded-md text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer portal-press ${
                  isActive
                    ? "bg-primary text-white shadow-2xs"
                    : "bg-muted text-muted-foreground hover:bg-border/80 hover:text-foreground"
                }`}
              >
                {qf.label}
              </button>
            );
          })}
        </div>
      )}

      {right && <div className="flex items-center gap-2 sm:ml-auto">{right}</div>}
    </div>
  );
}
