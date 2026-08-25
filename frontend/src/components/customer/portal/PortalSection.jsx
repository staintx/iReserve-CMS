import { cn } from "@/lib/utils";

/** Clean operational section card container for the portal */
export default function PortalSection({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={cn("rounded-md border border-slate-200 bg-white shadow-2xs", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100/80 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="font-sans text-base font-bold text-slate-900 tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}
