import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared pagination control (design standard §03, rule 5). Page-number
 * windowing algorithm matches the one already proven in AdminSystemLogsTable
 * — standardizing on the best pattern already in the app rather than
 * inventing a new one.
 */
export default function Pagination({ page, totalPages, total, pageSize, shownCount, onPageChange }) {
  if (total === 0) return null;

  const getPageNumbers = () => {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    const result = [];
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  };

  const startEntry = (page - 1) * pageSize + 1;
  const endEntry = startEntry + shownCount - 1;

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted flex-wrap gap-2">
      <p className="text-xs text-muted-foreground">
        Showing {startEntry}–{endEntry} of {total}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-border/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          {getPageNumbers().map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              className={`min-w-[26px] h-[26px] px-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                n === page ? "bg-primary text-white shadow-2xs" : "text-muted-foreground hover:bg-border/80"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-border/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
