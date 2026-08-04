import { Checkbox } from "../../ui/checkbox";

/**
 * Shared admin table shell (design standard: components/admin-ux-audit §03).
 * Column-config driven so every admin table renders through one component
 * instead of hand-rolled <table> markup per page.
 *
 * columns: [{ key, header, render(row), className, headerClassName, stopRowClick }]
 */
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth, fontFamily: "Inter, sans-serif" }}>
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={someSelected ? "indeterminate" : allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                  disabled={rows.length === 0}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider whitespace-nowrap ${col.headerClassName || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={colCount} className="text-center py-10 text-sm text-gray-500">
                Loading…
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={colCount} className="text-center py-10 text-sm text-red-500">
                {error}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="text-center py-10">
                <p className="text-sm text-gray-500">{emptyTitle}</p>
                {emptyHint && <p className="text-xs text-gray-400 mt-1">{emptyHint}</p>}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = getRowId(row);
              const selected = selectedIds.includes(id);
              return (
                <tr
                  key={id}
                  onClick={handleRowClick(row)}
                  className={`transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                    selected ? "bg-blue-50/60" : rowHighlight?.(row) ? "bg-emerald-50" : "hover:bg-gray-50"
                  }`}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected} onCheckedChange={() => toggleOne(id)} aria-label="Select row" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.className || ""}`}
                      onClick={col.stopRowClick ? (e) => e.stopPropagation() : undefined}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
