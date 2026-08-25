import { cn } from "@/lib/utils";
import { TONE_TEXT, TONE_NOTICE } from "./tones";

/**
 * The money block shared by the quotation and the booking details page.
 *
 * Customers should never have to add or subtract to learn what they owe, so
 * the running figures are listed plainly and the one number that matters —
 * what is still due — is pulled out as the headline with its own surface.
 *
 * All values render in Work Sans with tabular figures so columns line up and
 * digits stay legible; Playfair is never used for money.
 *
 *   rows      [{ label, value, hint, tone, strong, negative }]
 *   headline  { label, value, hint, tone } — the amount due / final state
 *   action    node rendered beside the headline (e.g. a Pay button)
 */
export default function AmountSummary({ rows = [], headline, action, className }) {
  const visible = rows.filter(Boolean);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-2xs", className)}>
      {visible.length > 0 && (
        <dl className="divide-y divide-border">
          {visible.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-4.5">
              <dt className="min-w-0">
                <span className={cn("text-xs sm:text-sm", row.strong ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {row.label}
                </span>
                {row.hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{row.hint}</span>}
              </dt>
              <dd
                className={cn(
                  "shrink-0 font-sans text-xs sm:text-sm tabular-nums",
                  row.strong ? "font-semibold" : "font-medium",
                  TONE_TEXT[row.tone] || "text-foreground"
                )}
              >
                {row.negative && "− "}
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {headline && (
        <div
          className={cn(
            "flex flex-col gap-2.5 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4.5",
            TONE_NOTICE[headline.tone] || TONE_NOTICE.neutral
          )}
        >
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold">{headline.label}</div>
            {headline.hint && <div className="mt-0.5 text-[11px] opacity-90">{headline.hint}</div>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-sans text-xl font-bold tabular-nums leading-none">{headline.value}</span>
            {action}
          </div>
        </div>
      )}
    </div>
  );
}
