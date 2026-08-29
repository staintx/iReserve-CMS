import { Checkbox } from "../../ui/checkbox";

/**
 * Shared admin table shell (design standard: components/admin-ux-audit §03).
 * Column-config driven so every admin table renders through one component
 * instead of hand-rolled <table> markup per page.
 *
 * columns: [{ key, header, render(row), className, headerClassName, stopRowClick, width }]
 *
 * `pinLastColumn` keeps the final column — always the row's actions —
 * parked against the right edge while the rest of the table scrolls
 * under it. On a wide table the actions were the first thing pushed
 * off screen, which is backwards: they are the reason the row is being
 * read. Pinning costs an opaque background on that one cell, which is
 * why the row tint below is a solid colour rather than a translucent
 * one — anything see-through lets the scrolled content show through
 * the pinned column.
 */

// #EBF2FB is `powder` at 50% over white: the same tint as before, mixed
// down rather than composited, so the pinned cell can reuse it as-is.
const rowTone = (selected, highlighted) => {
  if (selected) return { row: "bg-[#EBF2FB]", cell: "bg-[#EBF2FB]" };
  if (highlighted) return { row: "bg-emerald-50", cell: "bg-emerald-50" };
  return { row: "bg-card hover:bg-muted", cell: "bg-card group-hover:bg-muted" };
};

export default function DataTable({
  columns,
  rows,
  getRowId = (row) => row._id ?? row.id,
  loading = false,
  error = null,
  emptyTitle = "No records found.",
  emptyHint,
  onRowClick,
  rowHighlight,
  selectable = false,
  selectedIds = [],
  onSelectedIdsChange,
  minWidth = "720px",
  pinLastColumn = false,
}) {
  const allIds = rows.map(getRowId);
  const allSelected = selectable && rows.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someSelected = selectable && !allSelected && allIds.some((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (!onSelectedIdsChange) return;
    onSelectedIdsChange(allSelected ? [] : allIds);
  };
  const toggleOne = (id) => {
    if (!onSelectedIdsChange) return;
    onSelectedIdsChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  // Row click is guarded so it never fires for clicks that belong to a
  // checkbox, a row-actions menu, or a popover — those render via a Radix
  // portal outside the row's DOM subtree, so `currentTarget.contains(target)`
  // reliably tells a real row click apart from a portaled overlay click even
  // though React still bubbles the synthetic event through the row's handler.
  const handleRowClick = (row) => (e) => {
    if (!onRowClick) return;
    if (!e.currentTarget.contains(e.target)) return;
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    if (selection && selection.toString().length > 0) return;
    onRowClick(row);
  };

  const colCount = columns.length + (selectable ? 1 : 0);
  const lastIndex = columns.length - 1;

  // The divider and its short shadow are what tell the reader the column
  // is pinned rather than just last, so the scrolled content clearly
  // passes *under* it.
  const pinnedClass = (index) =>
    pinLastColumn && index === lastIndex
      ? "sticky right-0 z-[2] border-l border-border shadow-[-10px_0_10px_-10px_rgba(15,23,42,0.14)]"
      : "";

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth, fontFamily: "var(--font-sans, Inter), sans-serif" }}>
        <thead className="bg-muted border-b border-border sticky top-0 z-10">
          <tr>
            {selectable && (
              <th className="w-9 px-3 py-2 bg-muted">
                <Checkbox
                  checked={someSelected ? "indeterminate" : allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                  disabled={rows.length === 0}
                />
              </th>
            )}
            {columns.map((col, index) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`bg-muted px-3.5 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${pinnedClass(index)} ${col.headerClassName || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70 text-xs">
          {loading ? (
            <tr>
              <td colSpan={colCount} className="text-center py-8 text-xs text-muted-foreground">
                Loading…
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={colCount} className="text-center py-8 text-xs text-rose-600">
                {error}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="text-center py-8">
                <p className="text-xs font-medium text-muted-foreground">{emptyTitle}</p>
                {emptyHint && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{emptyHint}</p>}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = getRowId(row);
              const selected = selectedIds.includes(id);
              const tone = rowTone(selected, rowHighlight?.(row));
              return (
                <tr
                  key={id}
                  onClick={handleRowClick(row)}
                  className={`group transition-colors ${onRowClick ? "cursor-pointer" : ""} ${tone.row}`}
                >
                  {selectable && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected} onCheckedChange={() => toggleOne(id)} aria-label="Select row" />
                    </td>
                  )}
                  {columns.map((col, index) => {
                    const pinned = pinLastColumn && index === lastIndex;
                    return (
                      <td
                        key={col.key}
                        className={`px-3.5 py-2.5 transition-colors ${pinned ? `${tone.cell} ${pinnedClass(index)}` : ""} ${col.className || ""}`}
                        onClick={col.stopRowClick ? (e) => e.stopPropagation() : undefined}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

