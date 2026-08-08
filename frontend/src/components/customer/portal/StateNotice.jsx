import { CheckCircle2, Clock, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_NOTICE, TONE_ICON } from "./tones";

const FALLBACK_ICON = {
  success: CheckCircle2,
  warning: Clock,
  danger: XCircle,
  info: Info,
  neutral: Info,
};

/**
 * A short plain-language explanation of what is happening and, when there is
 * one, the single primary action the customer can take about it.
 */
export default function StateNotice({ tone = "neutral", icon, title, children, action, className }) {
  const Icon = icon || FALLBACK_ICON[tone] || FALLBACK_ICON.neutral;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        TONE_NOTICE[tone] || TONE_NOTICE.neutral,
        className
      )}
    >
      <p className="flex items-start gap-2.5 text-sm leading-relaxed">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONE_ICON[tone])} aria-hidden="true" />
        <span>
          {title && <strong className="font-semibold">{title} </strong>}
          {children}
        </span>
      </p>
      {action && <div className="shrink-0 sm:pl-2">{action}</div>}
    </div>
  );
}
