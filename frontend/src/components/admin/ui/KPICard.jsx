import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import AdminCard from "./AdminCard";

/**
 * The metric tile used at the top of every operational dashboard.
 *
 * Two things it gained for the Manager and Staff portals:
 *
 * 1. `label` is accepted alongside `title`. Both dashboards were already
 *    passing `label`, which this component did not read, so their whole
 *    KPI row rendered with an empty caption above the number — on mobile,
 *    where the row *is* the first screen, four unlabelled figures.
 * 2. `tone` and `onClick` are honoured. "Needs Staffing" is not a neutral
 *    number; it is the manager's queue, and tapping it should open that
 *    queue. A tile with an `onClick` renders as a real <button> so it is
 *    keyboard-reachable and announces itself as an action, and it carries
 *    a 56px minimum height so it clears the touch-target floor at 320px.
 *
 * Tones tint the value and the icon chip only. The card surface stays
 * neutral: four saturated cards in a 2x2 grid is a colour competition
 * with no winner, and the point of the tone is to make one of them win.
 */
const TONES = {
  neutral: { value: "text-foreground", chip: "bg-muted text-muted-foreground" },
  info: { value: "text-foreground", chip: "bg-primary/10 text-primary" },
  success: { value: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700" },
  warning: { value: "text-amber-700", chip: "bg-amber-50 text-amber-700" },
  danger: { value: "text-rose-700", chip: "bg-rose-50 text-rose-700" },
};

export default function KPICard({
  title,
  label,
  value,
  sub,
  trend,
  up,
  icon: Icon,
  badge,
  tone = "neutral",
  onClick,
}) {
  const caption = title ?? label;
  const toneStyle = TONES[tone] || TONES.neutral;
  const interactive = typeof onClick === "function";

  return (
    <AdminCard
      as={interactive ? "button" : "div"}
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={`!p-3 sm:!p-4 min-h-[5.5rem] flex flex-col justify-between text-left w-full ${
        interactive
          ? "cursor-pointer hover:border-primary/40 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 portal-press"
          : ""
      }`}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <p className="text-[11px] sm:text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
          {caption}
        </p>
        {trend ? (
          <span
            className={`text-[10px] font-semibold font-mono flex items-center gap-0.5 px-2 py-0.5 rounded-md shrink-0 ${
              up
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-rose-50 text-rose-700 border border-rose-200/60"
            }`}
          >
            {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {trend}
          </span>
        ) : badge ? (
          <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
            {badge}
          </span>
        ) : Icon ? (
          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${toneStyle.chip}`}>
            <Icon size={13} />
          </div>
        ) : null}
      </div>
      <div>
        <p className={`text-xl sm:text-2xl font-bold tracking-tight leading-none mb-1 ${toneStyle.value}`}>
          {value}
        </p>
        {sub && <p className="text-[11.5px] sm:text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
    </AdminCard>
  );
}
