/**
 * Shared bulk-action bar (design standard §03, rule 6): replaces the table
 * toolbar once any row is selected. actions: [{ key, label, onSelect, destructive, disabled }]
 */
export default function BulkActionBar({ count, actions = [], onClear }) {
  if (!count) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-md bg-primary text-white shadow-2xs">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold">{count} selected</span>
        <button type="button" onClick={onClear} className="text-xs text-blue-200 hover:text-white underline underline-offset-2 cursor-pointer">
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={a.onSelect}
            disabled={a.disabled}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              a.destructive ? "bg-red-500 hover:bg-red-600" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
