import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder shaped like a RecordCard so the list does not jump
 * when data arrives.
 */
export default function LoadingState({ rows = 3, label = "Loading…", className }) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="hidden h-8 w-24 animate-pulse rounded bg-muted sm:block" />
          </div>
        </div>
      ))}
    </div>
  );
}
