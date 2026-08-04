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
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
        <Search size={14} className="text-[#9CA3AF]" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="bg-transparent text-sm focus:outline-none flex-1"
          style={{ fontFamily: "Inter, sans-serif" }}
        />
      </div>
      {quickFilters && quickFilters.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {quickFilters.map((qf) => (
            <button
              key={qf.value}
              type="button"
              onClick={() => onQuickFilterChange(qf.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                activeQuickFilter === qf.value
                  ? "bg-[#111827] text-white"
                  : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"
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
