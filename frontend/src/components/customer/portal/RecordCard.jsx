import { useId } from "react";
import { ChevronDown, CheckCircle2, Clock, XCircle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusPill from "./StatusPill";
import { TONE_TEXT, TONE_NOTICE, TONE_ICON, TONE_ACCENT } from "./tones";

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
 *  isNew            boolean, highlights recent requests (<=48h)
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
  isNew = false,
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
        "overflow-hidden rounded-lg border transition-all shadow-2xs",
        quiet ? "border-slate-200 bg-slate-50/60 opacity-80" : "border-slate-200 bg-white hover:border-slate-300",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-4.5",
          hasDetails && "cursor-pointer"
        )}
        onClick={hasDetails ? onToggle : undefined}
      >
        {/* Identity: name, status, when */}
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 mt-0.5"
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
          )}

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <h3
                className={cn(
                  "font-sans text-sm sm:text-base font-bold leading-snug",
                  quiet ? "text-slate-500" : "text-slate-900"
                )}
              >
                {title}
              </h3>
              {isNew && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-500/30 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3 text-amber-600" /> NEW
                </span>
              )}
              {status && <StatusPill {...status} />}
            </div>

            {visibleMeta.length > 0 && (
              <p className="text-xs leading-relaxed text-slate-500">
                {visibleMeta.map((item, index) => (
                  <span key={index} className={index === 0 ? "font-semibold text-slate-800" : undefined}>
                    {index > 0 && <span className="px-1.5 font-normal opacity-40" aria-hidden="true">·</span>}
                    {item}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {/* Money + disclosure */}
        <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-2.5 sm:items-start sm:justify-end sm:border-0 sm:pt-0">
          {amount && (
            <div className="text-left sm:text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{amount.label}</div>
              <div className={cn("text-base font-bold tabular-nums", TONE_TEXT[amount.tone] || TONE_TEXT.neutral)}>
                {amount.value}
              </div>
              {amount.hint && <div className="text-[11px] text-slate-400 font-medium">{amount.hint}</div>}
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
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]"
            >
              <span>{expanded ? "Hide details" : "Details"}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
              <span className="sr-only">for {title}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice strip */}
      {(notice || primaryAction || secondaryAction) && (() => {
        const tone = notice?.tone || "neutral";
        const NoticeIcon = notice?.icon || NOTICE_ICON[tone] || NOTICE_ICON.neutral;
        return (
          <div
            className={cn(
              "flex flex-col gap-2.5 border-t px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4.5",
              TONE_NOTICE[tone] || TONE_NOTICE.neutral
            )}
          >
            {notice && (
              <p className="flex items-start gap-2 text-xs leading-relaxed">
                <NoticeIcon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", TONE_ICON[tone])} aria-hidden="true" />
                <span>
                  {notice.title && <strong className="font-bold">{notice.title} </strong>}
                  {notice.text}
                </span>
              </p>
            )}
            {(primaryAction || secondaryAction) && (
              <div
                className={cn(
                  "flex shrink-0 flex-col gap-1.5 sm:flex-row-reverse sm:items-center",
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
        <div id={panelId} className="space-y-4 border-t border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
          {details}
          {secondaryActions && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">{secondaryActions}</div>
          )}
        </div>
      )}
    </article>
  );
}
