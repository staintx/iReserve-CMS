import { CheckCircle2, Clock, XCircle, Info, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_BADGE } from "./tones";

const FALLBACK_ICON = {
  success: CheckCircle2,
  warning: Clock,
  danger: XCircle,
  info: Info,
  neutral: Circle,
};

/**
 * The single status badge used everywhere in the customer portal.
 * Always pairs a colour with an icon and a written label.
 */
export default function StatusPill({ tone = "neutral", label, icon, className }) {
  const Icon = icon || FALLBACK_ICON[tone] || FALLBACK_ICON.neutral;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        TONE_BADGE[tone] || TONE_BADGE.neutral,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
