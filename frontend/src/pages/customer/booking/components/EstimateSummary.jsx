import { useState, useEffect, useRef } from "react";
import { ChevronDown, UtensilsCrossed } from "lucide-react";
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
  hideIncluded = false,
  showIncluded = true,
  selectedMenu: propSelectedMenu,
  selectedAddOns: propSelectedAddOns,
  specialRequests: propSpecialRequests,
  currentStepId: propCurrentStepId,
}) {
  const shouldHideIncluded =
    hideIncluded || !showIncluded || Boolean(estimate?.hideIncluded);

  const {
    lines = [],
    blockers = [],
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
    selectedMenu: estimateMenu = [],
    selectedAddOns: estimateAddOns = [],
    specialRequests: estimateSpecialRequests = "",
    currentStepId: estimateCurrentStepId = null,
  } = estimate || {};

  const currentStepId = propCurrentStepId ?? estimateCurrentStepId;
  const selectedMenu = Array.isArray(propSelectedMenu ?? estimateMenu)
    ? (propSelectedMenu ?? estimateMenu)
    : [];
  const selectedAddOns = Array.isArray(propSelectedAddOns ?? estimateAddOns)
    ? (propSelectedAddOns ?? estimateAddOns)
    : [];
  const specialRequests = String(
    propSpecialRequests ?? estimateSpecialRequests ?? "",
  ).trim();

  const isMenuStep = currentStepId === "MenuSelection";
  const isAddonsStep =
    currentStepId === "PackageAddOns" || currentStepId === "AddonSelection";

  const [expandedSections, setExpandedSections] = useState(() => ({
    menu: isMenuStep,
    addons: isAddonsStep,
    notes: false,
  }));

  const prevStepIdRef = useRef(currentStepId);

  useEffect(() => {
    if (currentStepId !== prevStepIdRef.current) {
      prevStepIdRef.current = currentStepId;
      if (currentStepId === "MenuSelection") {
        setExpandedSections({ menu: true, addons: false, notes: false });
      } else if (
        currentStepId === "PackageAddOns" ||
        currentStepId === "AddonSelection"
      ) {
        setExpandedSections({ menu: false, addons: true, notes: false });
      } else {
        setExpandedSections({ menu: false, addons: false, notes: false });
      }
    }
  }, [currentStepId]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
        "flex flex-col overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900 text-white shadow-xs",
        variant === "sidebar" && "lg:max-h-[calc(100vh-var(--ls-header-offset,var(--ls-header-h,76px))-90px)]",
        variant === "review" && "lg:max-h-[calc(100vh-200px)]",
        className,
      )}
    >
      {/* ── Fixed Header ───────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-slate-800 px-3.5 py-2.5 bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Estimated cost
          </h3>
          {guests > 0 && (
            <span
              className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300"
              aria-live="polite"
            >
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

      {/* ── Dedicated Scrollable Middle Body ────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pl-3.5 pr-3 py-2.5 custom-scrollbar-dark">
        {lines.length > 0 && (
          <dl className="space-y-2 text-xs">
            {lines.map((line) => {
              if (line.id === "food") {
                const dishCount = selectedMenu.length;
                const isMenuExpanded = Boolean(expandedSections.menu);
                return (
                  <div
                    key={line.id}
                    className="border-b border-slate-800/80 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <dt className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleSection("menu")}
                          className="group inline-flex items-center gap-1.5 text-left text-slate-200 hover:text-white transition-colors cursor-pointer max-w-full"
                          aria-expanded={isMenuExpanded}
                        >
                          <span className="font-semibold text-slate-200 group-hover:text-white transition-colors whitespace-nowrap">
                            Catering menu ({dishCount}{" "}
                            {dishCount === 1 ? "dish" : "dishes"})
                          </span>
                          <span className="text-slate-400 group-hover:text-amber-400 transition-colors shrink-0">
                            <ChevronDown
                              size={13}
                              className={cn(
                                "transition-transform duration-200",
                                isMenuExpanded && "rotate-180 text-amber-400",
                              )}
                            />
                          </span>
                        </button>
                        {line.detail && (
                          <span className="block text-[11px] text-slate-400 mt-0.5">
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
                        {line.isQuotedLater
                          ? "On quotation"
                          : formatPeso(line.amount)}
                      </dd>
                    </div>

                    {isMenuExpanded && (
                      <div className="mt-2 max-h-48 overflow-y-auto overscroll-contain custom-scrollbar-dark pr-1 space-y-1.5 rounded-md bg-slate-950/60 p-2 border border-slate-800/80">
                        {dishCount === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-0.5">
                            No dishes selected yet. Select dishes from the menu to see them here.
                          </p>
                        ) : (
                          selectedMenu.map((item, idx) => (
                            <div
                              key={item._id || item.id || idx}
                              className="flex items-center gap-2 py-0.5"
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt=""
                                  className="h-6 w-6 shrink-0 rounded object-cover border border-slate-700/60"
                                />
                              ) : (
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                  <UtensilsCrossed size={11} />
                                </span>
                              )}
                              <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-200">
                                {item.name || item.item_name || "Dish"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              if (line.id === "addons") {
                const addOnsCount = selectedAddOns.length;
                const isAddonsExpanded = Boolean(expandedSections.addons);
                return (
                  <div
                    key={line.id}
                    className="border-b border-slate-800/80 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <dt className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleSection("addons")}
                          className="group inline-flex items-center gap-1.5 text-left text-slate-200 hover:text-white transition-colors cursor-pointer max-w-full"
                          aria-expanded={isAddonsExpanded}
                        >
                          <span className="font-semibold text-slate-200 group-hover:text-white transition-colors whitespace-nowrap">
                            Add-ons ({addOnsCount})
                          </span>
                          <span className="text-slate-400 group-hover:text-amber-400 transition-colors shrink-0">
                            <ChevronDown
                              size={13}
                              className={cn(
                                "transition-transform duration-200",
                                isAddonsExpanded && "rotate-180 text-amber-400",
                              )}
                            />
                          </span>
                        </button>
                        {line.detail && (
                          <span className="block text-[11px] text-slate-400 mt-0.5">
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
                        {line.amount > 0
                          ? formatPeso(line.amount)
                          : "On quotation"}
                      </dd>
                    </div>

                    {isAddonsExpanded && (
                      <div className="mt-2 max-h-48 overflow-y-auto overscroll-contain custom-scrollbar-dark pr-1 space-y-1.5 rounded-md bg-slate-950/60 p-2 border border-slate-800/80">
                        {addOnsCount === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-0.5">
                            No add-ons selected yet.
                          </p>
                        ) : (
                          selectedAddOns.map((item, idx) => (
                            <div
                              key={item.item_id || item._id || item.name || idx}
                              className="flex items-center justify-between gap-2 py-0.5 text-[11px]"
                            >
                              <span className="min-w-0 flex-1 truncate font-medium text-slate-200">
                                {item.name}
                                {Number(item.quantity) > 1 && (
                                  <span className="text-slate-400 ml-1">
                                    × {item.quantity}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-[10px] text-slate-400">
                                {Number(item.price) > 0
                                  ? formatPeso(
                                      Number(item.price) *
                                        (Number(item.quantity) || 1),
                                    )
                                  : "On quotation"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              if (line.id === "special_requests") {
                const isNotesExpanded = Boolean(expandedSections.notes);
                return (
                  <div
                    key={line.id}
                    className="border-b border-slate-800/80 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <dt className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleSection("notes")}
                          className="group inline-flex items-center gap-1.5 text-left text-slate-200 hover:text-white transition-colors cursor-pointer max-w-full"
                          aria-expanded={isNotesExpanded}
                        >
                          <span className="font-semibold text-slate-200 group-hover:text-white transition-colors whitespace-nowrap">
                            Additional requests or notes
                          </span>
                          <span className="text-slate-400 group-hover:text-amber-400 transition-colors shrink-0">
                            <ChevronDown
                              size={13}
                              className={cn(
                                "transition-transform duration-200",
                                isNotesExpanded && "rotate-180 text-amber-400",
                              )}
                            />
                          </span>
                        </button>
                        {line.detail && (
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            {line.detail}
                          </span>
                        )}
                      </dt>
                      <dd className="shrink-0 text-right font-medium text-[11px] text-slate-400">
                        Noted
                      </dd>
                    </div>

                    {isNotesExpanded && (
                      <div className="mt-2 max-h-36 overflow-y-auto overscroll-contain custom-scrollbar-dark rounded-md bg-slate-950/60 p-2.5 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                        <p className="whitespace-pre-wrap italic">
                          "{specialRequests}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={line.id}
                  className="flex items-start justify-between gap-2"
                >
                  <dt className="min-w-0">
                    <span className="block truncate text-slate-200 font-medium">
                      {line.label}
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
                    {line.isQuotedLater
                      ? "On quotation"
                      : formatPeso(line.amount)}
                  </dd>
                </div>
              );
            })}
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

        {!shouldHideIncluded && (included?.length > 0 || quotedSeparately?.length > 0) && (
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
      </div>

      {/* ── Fixed / Pinned Total Footer ────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-900">
        <div className="flex items-baseline justify-between gap-2 px-3.5 py-2.5">
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

        {hasTotal && (
          <div className="border-t border-slate-800/80 bg-slate-950/70 px-3.5 py-2 text-[11px] leading-relaxed text-slate-400">
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
      </div>
    </section>
  );
}
