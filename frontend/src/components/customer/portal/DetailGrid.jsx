import { cn } from "@/lib/utils";

/**
 * Label/value pairs used inside a RecordCard details panel.
 * `title` groups a related set (e.g. payment figures) so they read as a block
 * instead of wrapping into whatever row happens to be next.
 */
export default function DetailGrid({ items = [], columns = 3, title, className }) {
  const visible = items.filter((item) => item && item.value !== undefined && item.value !== null && item.value !== "");
  if (visible.length === 0) return null;

  return (
    <div className={className}>
      {title && <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>}
      <dl
        className={cn(
          "grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2",
          columns >= 3 && "lg:grid-cols-3"
        )}
      >
        {visible.map((item) => (
          <div key={item.label} className={cn("min-w-0", item.wide && "sm:col-span-2 lg:col-span-3")}>
            <dt className="text-[11px] font-medium text-slate-500">{item.label}</dt>
            <dd className={cn("mt-0.5 text-xs sm:text-sm font-semibold text-slate-900", item.mono && "font-mono text-slate-800")}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

