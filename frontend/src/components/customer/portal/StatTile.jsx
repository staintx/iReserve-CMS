import { cn } from "@/lib/utils";

/**
 * Compact overview metric. Interactive when `onClick` is supplied so the
 * dashboard numbers double as shortcuts into the matching list.
 */
export default function StatTile({ icon: Icon, label, value, hint, onClick, className }) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 text-left transition-colors",
        onClick && "hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold leading-tight text-foreground tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </Wrapper>
  );
}
