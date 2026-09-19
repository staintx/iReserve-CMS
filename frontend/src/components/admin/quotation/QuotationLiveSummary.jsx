import React, { useState } from "react";
import {
  Calculator,
  ArrowRight,
  ArrowLeft,
  Send,
  Save,
  Clock,
  Ruler,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { formatCurrency } from "../../../utils/format";

function SummaryRow({ label, value, detail, tone = "default", strong, indent }) {
  const toneClass =
    tone === "deduct"
      ? "text-emerald-400"
      : tone === "muted"
      ? "text-slate-400"
      : strong
      ? "text-white font-bold"
      : "text-slate-200";

  return (
    <div className={`flex items-baseline justify-between gap-1.5 text-xs py-0.5 ${indent ? "pl-2" : ""}`}>
      <span className="text-slate-300 truncate">
        {label}
        {detail && <span className="ml-1 text-[10px] text-slate-400">{detail}</span>}
      </span>
      <span className={`shrink-0 font-mono tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

/**
 * Narrow, collapsible sticky summary (~260px).
 * Pure read-only quick reference for Totals, Deposit, and Remaining Balance.
 */
export default function QuotationLiveSummary({
  totals,
  activeStep,
  onNextStep,
  onPrevStep,
  onSaveDraft,
  submitting,
  savingDraft,
  quotation,
  savedDraft,
  cateringIncluded,
  chargeableMenuItemsCount = 0,
  chargeableAddOnsCount = 0,
  transportationFee = 0,
  additionalFees = [],
  eventSpace,
  isFoodOnly,
  isSetupOnly,
  offerContext,
  isCollapsed,
  setIsCollapsed,
}) {
  const depositShare =
    totals.totalCost > 0 ? Math.round((totals.depositAmount / totals.totalCost) * 100) : 0;

  if (isCollapsed) {
    return (
      <aside className="h-full bg-[#16264A] text-white w-12 shrink-0 border-l border-white/10 flex flex-col items-center py-3 select-none transition-all">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer mb-4"
          title="Expand Live Summary"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 writing-vertical rotate-180">
          <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">
            Summary
          </span>
          <span className="font-mono text-xs font-bold text-white">
            {formatCurrency(totals.totalCost)}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col h-full bg-[#16264A] text-white w-full lg:w-[260px] shrink-0 border-l border-white/10 select-none overflow-hidden font-sans transition-all">
      {/* Header with Collapse Toggle */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-black/10 shrink-0">
        <div className="flex items-center gap-1.5">
          <Calculator size={15} className="text-sky-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
            Live Summary
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {savedDraft ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-slate-300">
              Draft
            </span>
          ) : quotation ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-slate-300 tabular-nums">
              v{(Number(quotation.version_number) || 1) + 1}.0
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Collapse Summary to Maximize Workspace"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable Breakdown */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 text-xs text-slate-300">
        {/* Package Section */}
        <div className="space-y-0.5">
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
            {isFoodOnly ? "Food Baseline" : isSetupOnly ? "Setup Package" : "Package Price"}
          </p>
          {eventSpace && !isFoodOnly && (
            <div className="flex items-center justify-between text-[11px] text-slate-300 py-0.5">
              <span className="flex items-center gap-1 text-slate-400">
                <Ruler size={11} className="text-sky-400" /> Space
              </span>
              <span className="font-mono text-white font-medium">{eventSpace}</span>
            </div>
          )}
          <SummaryRow
            label="Starting price"
            value={formatCurrency(totals.startingPrice)}
          />
          {totals.inclusionDeductions > 0 && (
            <SummaryRow
              label="Item credits"
              value={`-${formatCurrency(totals.inclusionDeductions)}`}
              tone="deduct"
            />
          )}
          {totals.inclusionAdjustments !== 0 && (
            <SummaryRow
              label="Quantity adjustments"
              value={`${totals.inclusionAdjustments > 0 ? "+" : ""}${formatCurrency(totals.inclusionAdjustments)}`}
              tone={totals.inclusionAdjustments < 0 ? "deduct" : "default"}
            />
          )}
          <SummaryRow
            label="Package Net"
            value={formatCurrency(totals.packagePrice)}
            strong
          />
        </div>

        {/* Added Items */}
        <div className="space-y-0.5 border-t border-white/10 pt-2">
          <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
            Menu &amp; Services
          </p>
          {!isSetupOnly && cateringIncluded && (
            <SummaryRow
              label="Menu dishes"
              detail={`(${chargeableMenuItemsCount})`}
              value={formatCurrency(totals.menuSubtotal)}
            />
          )}
          <SummaryRow
            label="Extra services"
            detail={`(${chargeableAddOnsCount})`}
            value={formatCurrency(totals.addOnsSubtotal)}
          />
          {Number(transportationFee) > 0 && (
            <SummaryRow
              label="Delivery"
              value={formatCurrency(Number(transportationFee))}
            />
          )}
          {additionalFees.map((fee, idx) => {
            const isOt = fee.isOvertime || /overtime/i.test(fee.name || "");
            const amt = Number(fee.amount) || 0;
            if (amt <= 0) return null;
            return (
              <SummaryRow
                key={idx}
                indent
                label={
                  <span className="inline-flex items-center gap-1 truncate max-w-[130px]">
                    {isOt && <Clock size={10} className="text-sky-400 shrink-0" />}
                    <span>{fee.name || "Fee"}</span>
                  </span>
                }
                value={formatCurrency(amt)}
              />
            );
          })}
        </div>

        {/* Discounts & Taxes */}
        {(totals.discounts > 0 || totals.taxes > 0) && (
          <div className="space-y-0.5 border-t border-white/10 pt-2">
            <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} strong />
            {totals.taxes > 0 && (
              <SummaryRow label="Taxes" value={`+${formatCurrency(totals.taxes)}`} />
            )}
            {totals.discounts > 0 && (
              <SummaryRow
                label="Discount"
                value={`-${formatCurrency(totals.discounts)}`}
                tone="deduct"
              />
            )}
          </div>
        )}

        {/* Totals Summary Box */}
        <div className="rounded-lg border border-white/15 bg-white/5 p-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Total
            </span>
            <span className="text-base font-bold font-mono text-white tabular-nums">
              {formatCurrency(totals.totalCost)}
            </span>
          </div>

          <div className="border-t border-white/10 pt-2 space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-300">
                Deposit {depositShare > 0 && `(${depositShare}%)`}
              </span>
              <span className="font-semibold font-mono text-sky-300 tabular-nums">
                {formatCurrency(totals.depositAmount)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">Balance Due</span>
              <span className="font-medium font-mono text-slate-200 tabular-nums">
                {formatCurrency(totals.remainingBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-white/10 bg-black/15 flex flex-col gap-2 shrink-0">
        {activeStep === 1 && (
          <button
            type="button"
            onClick={onNextStep}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <span>Proceed to Set Prices</span>
            <ArrowRight size={13} />
          </button>
        )}

        {activeStep === 2 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrevStep}
              className="px-2 py-2 rounded-md border border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 text-xs transition-colors cursor-pointer"
              title="Back to Customer Request"
            >
              <ArrowLeft size={13} />
            </button>
            <button
              type="button"
              onClick={onNextStep}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <span>Review &amp; Send</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {activeStep === 3 && (
          <div className="flex flex-col gap-1.5">
            <button
              type="submit"
              disabled={submitting || savingDraft}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={13} />
              )}
              <span>
                {submitting
                  ? "Sending..."
                  : quotation
                  ? "Send Revised Quote"
                  : "Send Quotation"}
              </span>
            </button>
            <button
              type="button"
              onClick={onPrevStep}
              className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-white/10 hover:bg-white/5 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Back to Set Prices</span>
            </button>
          </div>
        )}

        {/* Quick Save Draft */}
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={submitting || savingDraft}
          className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          {savingDraft ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Save size={11} />
          )}
          <span>{savingDraft ? "Saving..." : "Save Draft"}</span>
        </button>
      </div>
    </aside>
  );
}
