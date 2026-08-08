import { useId } from "react";
import { ChevronDown, CheckCircle2, Clock, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusPill from "./StatusPill";
import { TONE_TEXT, TONE_NOTICE, TONE_ICON } from "./tones";

const NOTICE_ICON = {
  success: CheckCircle2,
  warning: Clock,
  danger: XCircle,
  info: Info,
  neutral: Info,
};

/**
 * The one card used for every customer record (bookings and inquiries).
 *
 * Collapsed it answers, in reading order: what is this event, what state is it
 * in, when is it, what do I owe, and what should I do next. Everything else
 * lives behind "Details" so the list stays scannable.
 *
 * Props
 *  icon             leading service icon
 *  title            event name — the primary identifier
 *  status           { tone, label, icon } rendered as a StatusPill
 *  meta             array of short strings shown as a single dot-separated line
 *  amount           { label, value, tone, hint } financial state
 *  notice           { tone, title, text, icon } plain-language state explanation
 *  primaryAction    the single obvious next step (rendered in the notice strip)
 *  secondaryAction  optional lower-weight action shown beside it
 *  secondaryActions lower-priority actions, revealed with the details panel
 *  details          node rendered inside the details panel
 *  quiet            true for cancelled/closed records — visually recessive
 */
export default function RecordCard({
  icon: Icon,
  title,
  status,
  meta = [],
  amount,
  notice,
  primaryAction,
  secondaryAction,
  secondaryActions = null,
  details,
  expanded = false,
  onToggle,
  quiet = false,
  className,
}) {
  const panelId = useId();
  const visibleMeta = meta.filter(Boolean);
  const hasDetails = Boolean(details || secondaryActions);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        quiet ? "border-border bg-muted/40" : "border-border bg-card hover:border-primary/30",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5",
          hasDetails && "cursor-pointer"
        )}
        onClick={hasDetails ? onToggle : undefined}
      >
        {/* Identity: name, status, when */}
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {Icon && (
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                quiet ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
              )}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
          )}

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <h3
                className={cn(
                  "font-sans text-base font-semibold leading-snug",
                  quiet ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {title}
              </h3>
              {status && <StatusPill {...status} />}
            </div>

            {visibleMeta.length > 0 && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {visibleMeta.map((item, index) => (
                  <span key={index}>
                    {index > 0 && <span className="px-1.5 opacity-40" aria-hidden="true">·</span>}
                    {item}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {/* Money + disclosure */}
        <div className="flex items-end justify-between gap-4 border-t border-border pt-3 sm:items-start sm:justify-end sm:border-0 sm:pt-0">
          {amount && (
            <div className="text-left sm:text-right">
              <div className="text-xs font-medium text-muted-foreground">{amount.label}</div>
              <div className={cn("text-lg font-semibold tabular-nums", TONE_TEXT[amount.tone] || TONE_TEXT.neutral)}>
                {amount.value}
              </div>
              {amount.hint && <div className="text-xs text-muted-foreground">{amount.hint}</div>}
            </div>
          )}

          {hasDetails && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggle?.();
              }}
              aria-expanded={expanded}
              aria-controls={panelId}
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span>{expanded ? "Hide details" : "Details"}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
              <span className="sr-only">for {title}</span>
            </button>
          )}
        </div>
      </div>

      {/* What's happening + the single next step.
          A full-bleed tinted strip rather than a nested box, so the card keeps
          one border and one radius. */}
      {(notice || primaryAction || secondaryAction) && (() => {
        const tone = notice?.tone || "neutral";
        const NoticeIcon = notice?.icon || NOTICE_ICON[tone] || NOTICE_ICON.neutral;
        return (
          <div
            className={cn(
              "flex flex-col gap-3 border-t px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5",
              TONE_NOTICE[tone] || TONE_NOTICE.neutral
            )}
          >
            {notice && (
              <p className="flex items-start gap-2.5 text-sm leading-relaxed">
                <NoticeIcon className={cn("mt-0.5 h-4 w-4 shrink-0", TONE_ICON[tone])} aria-hidden="true" />
                <span>
                  {notice.title && <strong className="font-semibold">{notice.title} </strong>}
                  {notice.text}
                </span>
              </p>
            )}
            {(primaryAction || secondaryAction) && (
              <div
                className={cn(
                  "flex shrink-0 flex-col gap-2 sm:flex-row-reverse sm:items-center",
                  !notice && "sm:ml-auto"
                )}
              >
                {primaryAction}
                {secondaryAction}
              </div>
            )}
          </div>
        );
      })()}

      {/* Progressive disclosure */}
      {hasDetails && expanded && (
        <div id={panelId} className="space-y-5 border-t border-border bg-muted/40 p-4 sm:p-5">
          {details}
          {secondaryActions && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">{secondaryActions}</div>
          )}
        </div>
      )}
    </article>
  );
}
