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
    // "Estimated guests" everywhere except a combo pack, whose count is fixed
    // by the combo itself.
    guestsLabel = "Estimated guests",
    // The event space the selected package is built for, as one label — the
    // package's own fact, not something the customer has chosen (see
    // lib/packageDisplay.js#packageScaffoldSize). Empty on a booking that has
    // no footprint — food only, or a combo — where the row is simply omitted.
    eventSpace = "",
    // Combo packs only. What the combo price buys, and what it does not —
    // present so the total is never mistaken for the final bill.
    offerName,
    included,
    quotedSeparately,
    totalLabel = "Estimated total",
  } = estimate;

  if (variant === "bar") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-[#1E293B] px-3.5 py-2.5 text-white",
          className,
        )}
      >
        <p className="text-xs text-white/70">
          {note || "Estimated total so far"}
          {guests > 0 && (
            <span className="text-white/50"> · {guestsLabel}: {guests}</span>
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
        "overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900 text-white shadow-xs",
        variant === "sidebar" && "lg:sticky lg:top-[120px]",
        className,
      )}
    >
      <div className="border-b border-slate-800 px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Estimated cost
          </h3>
          {guests > 0 && (
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300" aria-live="polite">
              {guestsLabel}: <strong className="text-white">{guests}</strong>
            </span>
          )}
        </div>

        {eventSpace && (
          <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="text-[11px] text-slate-400">
              Scaffold / Space:
            </span>
            <span className="font-semibold text-slate-200">
              {eventSpace}
            </span>
          </div>
        )}
      </div>

      <div className="px-3.5 py-2.5">
        {lines.length > 0 && (
          <dl className="space-y-1.5 text-xs">
            {lines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-2">
                <dt className="min-w-0">
                  <span className="block truncate text-slate-200 font-medium">
                    {line.isAddOn ? `Add-on: ${line.label}` : line.label}
                  </span>
                  {line.detail && (
                    <span className="block text-[11px] text-slate-400">
                      {line.detail}
                    </span>
                  )}
                </dt>
                <dd
                  className={cn(
                    "shrink-0 text-right font-medium",
                    line.isQuotedLater
                      ? "text-[11px] text-slate-400"
                      : "tabular-nums text-white",
                  )}
                >
                  {line.isQuotedLater ? "On quotation" : formatPeso(line.amount)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {blockers.length > 0 && (
          <ul
            className={cn(
              "space-y-1 text-xs text-slate-400",
              lines.length > 0 && "mt-2 border-t border-slate-800 pt-2",
            )}
          >
            {blockers.map((blocker) => (
              <li key={blocker} className="leading-snug">{blocker}</li>
            ))}
          </ul>
        )}

        {(included?.length > 0 || quotedSeparately?.length > 0) && (
          <div className="mt-2.5 space-y-2 border-t border-slate-800 pt-2 text-xs">
            {included?.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Included in combo
                </p>
                <ul className="space-y-0.5 text-slate-300 text-[11px]">
                  {included.map((entry) => (
                    <li key={entry} className="flex gap-1.5">
                      <span aria-hidden="true" className="text-emerald-400 font-bold">✓</span>
                      <span>{entry}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {quotedSeparately?.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quoted Separately
                </p>
                <ul className="space-y-0.5 text-slate-400 text-[11px]">
                  {quotedSeparately.map((entry) => (
                    <li key={entry} className="flex gap-1.5">
                      <span aria-hidden="true" className="text-slate-500">+</span>
                      <span>{entry}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "flex items-baseline justify-between gap-2 border-t border-slate-800 pt-2",
            lines.length > 0 || blockers.length > 0 ? "mt-2.5" : "",
          )}
        >
          <span className="text-xs font-semibold text-slate-300">{totalLabel}</span>
          <span
            className={cn(
              "tabular-nums font-bold",
              hasTotal ? "text-lg text-white" : "text-xs text-slate-400",
            )}
            aria-live="polite"
          >
            {hasTotal ? formatPeso(total) : "Not yet available"}
          </span>
        </div>
      </div>

      {hasTotal && (
        <div className="border-t border-slate-800 bg-slate-950/60 px-3.5 py-2 text-[11px] leading-relaxed text-slate-400">
          {offerName ? (
            <>
              Combo base price. Extra rentals & services will be itemized on quotation. {depositPercentage}% deposit reserves date.
            </>
          ) : (
            <>
              {depositPercentage}% deposit (<strong className="text-white font-mono">{formatPeso(depositAmount)}</strong>) reserves date upon quotation acceptance.
            </>
          )}
        </div>
      )}
    </section>
  );
}
