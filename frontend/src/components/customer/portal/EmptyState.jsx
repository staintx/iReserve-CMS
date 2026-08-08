import { cn } from "@/lib/utils";

/** Shared empty state for every customer portal list. */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="font-sans text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
