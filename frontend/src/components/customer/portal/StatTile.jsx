import { cn } from "@/lib/utils";
import { TONE_ACCENT } from "./tones";

/**
 * Compact overview metric. Interactive when `onClick` is supplied so the
 * dashboard numbers double as shortcuts into the matching list.
 *
 * `tone` tints only the icon tile — the card surface stays white so a row of
 * tiles reads as one set rather than as four coloured blocks.
 */
export default function StatTile({ icon: Icon, label, value, hint, tone = "neutral", onClick, className }) {
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
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            TONE_ACCENT[tone] || TONE_ACCENT.neutral
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold leading-tight text-foreground tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </Wrapper>
  );
}
