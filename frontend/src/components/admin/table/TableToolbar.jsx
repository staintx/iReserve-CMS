import { Search } from "lucide-react";

/**
 * Shared table toolbar layout (design standard §03, rules 2 & 3):
 * search always top-left, quick filter tabs beside it, extra controls
 * (Filters popover trigger, page actions) in a right-aligned slot.
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
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-muted/60 border border-border/70 rounded-md px-3 py-1.5 flex-1 min-w-48 shadow-2xs">
        <Search size={14} className="text-muted-foreground/70" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="bg-transparent text-xs sm:text-sm focus:outline-none flex-1 text-foreground"
          style={{ fontFamily: "var(--font-sans, Inter), sans-serif" }}
        />
      </div>
      {quickFilters && quickFilters.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {quickFilters.map((qf) => (
            <button
              key={qf.value}
              type="button"
              onClick={() => onQuickFilterChange(qf.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                activeQuickFilter === qf.value
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:bg-border/80 hover:text-foreground"
              }`}
            >
              {qf.label}
            </button>
          ))}
        </div>
      )}
      {right && <div className="flex items-center gap-2 ml-auto">{right}</div>}
    </div>
  );
}
