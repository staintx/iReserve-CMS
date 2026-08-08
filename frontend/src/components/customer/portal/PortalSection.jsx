import { cn } from "@/lib/utils";

/** Titled content panel — the standard section container for the portal. */
export default function PortalSection({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="font-sans text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
