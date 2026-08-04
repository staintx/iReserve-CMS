import { useState } from "react";

/**
 * Shared client-side pagination (design standard §03, rule 5 — one
 * pagination component/behavior for every table). Resets to page 1
 * whenever the filtered row count changes, using the render-time
 * "adjust state while rendering" pattern instead of an effect, so a new
 * search/filter never leaves the view stuck on a now-empty page.
 *
 * Server-side pagination for a given table is a drop-in swap: pass the
 * server's `total` and page of rows instead of slicing here, and wire
 * onPageChange to refetch — the Pagination component's props don't change.
 */
export default function usePagination(rows, pageSize = 10) {
  const [page, setPage] = useState(1);
  const [prevLength, setPrevLength] = useState(rows.length);

  if (rows.length !== prevLength) {
    setPrevLength(rows.length);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return { page: clampedPage, setPage, totalPages, total: rows.length, pageRows, pageSize };
}
