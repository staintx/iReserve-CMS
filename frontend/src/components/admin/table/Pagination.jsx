import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared pagination control (design standard §03, rule 5). Page-number
 * windowing algorithm matches the one already proven in AdminSystemLogsTable
 * — standardizing on the best pattern already in the app rather than
 * inventing a new one.
 *
 * Two presentations, one component:
 *
 * - **Phone**: a numbered strip of 26px targets is both unhittable and
 *   the wrong interaction — nobody jumps to page 4 of an event list on a
 *   phone, they page forward. So below `sm` it is two 44px Prev/Next
 *   buttons flanking a "Page 2 of 5" readout, and the "Showing 1–10 of 42"
 *   line moves above them where it reads as context rather than competing
 *   for the same row.
 * - **`sm` and up**: unchanged — the count on the left, the windowed page
 *   numbers on the right.
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
  const summary = `Showing ${startEntry}–${endEntry} of ${total}`;

  return (
    <nav
      aria-label="Pagination"
      className="border-t border-border bg-muted rounded-b-md px-3 sm:px-5 py-2.5 sm:py-3"
    >
      {/* Phone */}
      <div className="sm:hidden space-y-2">
        <p className="text-[11.5px] text-muted-foreground text-center">{summary}</p>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs transition-colors disabled:opacity-40 cursor-pointer portal-press"
            >
              <ChevronLeft size={15} />
              <span>Previous</span>
            </button>
            <span
              aria-live="polite"
              className="shrink-0 px-2 text-xs font-bold text-foreground tabular-nums"
            >
              <span className="sr-only">Page </span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs transition-colors disabled:opacity-40 cursor-pointer portal-press"
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Tablet and desktop */}
      <div className="hidden sm:flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">{summary}</p>
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
                aria-current={n === page ? "page" : undefined}
                className={`min-w-[26px] h-[26px] px-1.5 rounded-md text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
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
    </nav>
  );
}
