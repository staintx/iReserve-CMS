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
      {title && <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>}
      <dl
        className={cn(
          "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2",
          columns >= 3 && "lg:grid-cols-3"
        )}
      >
        {visible.map((item) => (
          <div key={item.label} className={cn("min-w-0", item.wide && "sm:col-span-2 lg:col-span-3")}>
            <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className={cn("mt-1 text-sm font-medium text-foreground", item.mono && "font-mono")}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
