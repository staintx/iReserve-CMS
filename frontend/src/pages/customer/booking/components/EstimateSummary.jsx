import { formatPeso } from "../lib/bookingUI";
import { cn } from "@/lib/utils";

/**
 * The one price surface in the booking flow.
 *
 * Every estimate on screen renders from the same object (see
 * lib/bookingRules.js#buildEstimate), so the itemisation and the total can
 * never disagree.
 *
 * It is deliberately not another white form card. Surrounded by six of those it
 * read as one more field group and stopped being noticed, so it takes the deep
 * slate from the brand palette with a single gold rule: the same treatment the
 * marketing pages give a price, and enough contrast that a changing number is
 * obvious without gradients, glows or a dashboard tile.
 *
 *   variant="sidebar"  sticky panel, shown beside price-affecting steps
 *   variant="review"   same panel, in the review rail
 *   variant="bar"      one compact row where the total is context, not the task
 *
 * It only appears on steps that can change the price.
 */
export default function EstimateSummary({
  estimate,
  variant = "sidebar",
  note,
  className = "",
}) {
  const {
    lines,
    blockers,
    total,
    hasTotal,
    depositPercentage,
    depositAmount,
    guests,
  } = estimate;

  if (variant === "bar") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-[#1E293B] px-4 py-3 text-white",
          className,
        )}
      >
        <p className="text-[13px] text-white/70">
          {note || "Estimated total so far"}
          {guests > 0 && (
            <span className="text-white/50"> · Estimated guests: {guests}</span>
          )}
        </p>
        <p className="text-sm font-semibold tabular-nums" aria-live="polite">
          {hasTotal ? formatPeso(total) : "Not yet available"}
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Estimated cost"
      className={cn(
        "overflow-hidden rounded-2xl bg-[#1E293B] text-white",
        variant === "sidebar" && "lg:sticky lg:top-[150px]",
        className,
      )}
    >
      <div className="px-4 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Estimated cost
          </h3>
          {guests > 0 && (
            <p className="text-[11px] text-white/50" aria-live="polite">
              Estimated guests:{" "}
              <span className="font-semibold text-white/80">{guests}</span>
            </p>
          )}
        </div>
        <span
          className="mt-2 block h-px w-8 bg-[#C5A059]"
          aria-hidden="true"
        />
      </div>

      <div className="px-4 py-3">
        {lines.length > 0 && (
          <dl className="space-y-2 text-[13px]">
            {lines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-3">
                <dt className="min-w-0">
                  <span className="block truncate text-white/90">
                    {line.isAddOn ? `Add-on: ${line.label}` : line.label}
                  </span>
                  {line.detail && (
                    <span className="block text-xs text-white/45">
                      {line.detail}
                    </span>
                  )}
                </dt>
                <dd className="shrink-0 tabular-nums text-white/90">
                  {formatPeso(line.amount)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {blockers.length > 0 && (
          <ul
            className={cn(
              "space-y-1.5 text-[13px] text-white/60",
              lines.length > 0 && "mt-3 border-t border-white/10 pt-3",
            )}
          >
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}

        <div
          className={cn(
            "flex items-baseline justify-between gap-3 border-t border-white/10 pt-3",
            lines.length > 0 || blockers.length > 0 ? "mt-3" : "",
          )}
        >
          <span className="text-[13px] text-white/70">Estimated total</span>
          <span
            className={cn(
              "tabular-nums",
              hasTotal ? "text-2xl font-semibold" : "text-[13px] text-white/60",
            )}
            aria-live="polite"
          >
            {hasTotal ? formatPeso(total) : "Not yet available"}
          </span>
        </div>
      </div>

      {hasTotal && (
        <p className="border-t border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs leading-relaxed text-white/60">
          {depositPercentage}% deposit{" "}
          <span className="font-semibold text-white">
            {formatPeso(depositAmount)}
          </span>{" "}
          reserves your date after you accept the quotation.
        </p>
      )}
    </section>
  );
}
