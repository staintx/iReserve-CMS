import React from "react";
import {
  FileCheck2,
  CreditCard,
  Send,
  Save,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatShortDate } from "../../../../utils/format";
import DishThumbnail from "../DishThumbnail";

export default function ReviewSendStep({
  totals,
  details,
  packageName,
  chargeableMenuItems = [],
  chargeableAddOns = [],
  transportationFee = 0,
  additionalFees = [],
  offerContext,
  isSpecialOffer,
  catalogMenuItems = [],
  depositAmount,
  setDepositAmount,
  depositPercentage = 20,
  expirationDate,
  setExpirationDate,
  maxValidityDate,
  adminNotes,
  setAdminNotes,
  quotation,
  pendingChanges = [],
  errors = {},
  warnings = [],
  submitting,
  savingDraft,
  today,
  onBackToPrices,
  onSaveDraft,
}) {
  const depositShare =
    totals.totalCost > 0 ? Math.round((totals.depositAmount / totals.totalCost) * 100) : 0;

  const setDepositByPercent = (pct) => {
    if (totals.totalCost <= 0) return;
    const computed = Math.round((totals.totalCost * pct) / 100);
    setDepositAmount(String(computed));
  };

  const checks = [
    {
      label: "Customer & schedule verified",
      passed: Boolean(
        details.contact_first_name &&
        details.contact_email &&
        details.event_date &&
        details.guest_count > 0
      ),
      failMsg: "Customer contact info or event date is missing",
    },
    {
      label: "Package & items priced",
      passed: totals.totalCost > 0,
      failMsg: "Quotation total must be greater than ₱0",
    },
    {
      label: "Required deposit specified",
      passed: Number(depositAmount) > 0 && Number(depositAmount) <= totals.totalCost,
      failMsg: Number(depositAmount) > totals.totalCost
        ? "Deposit cannot exceed total cost"
        : "A deposit amount is required to confirm booking",
    },
    {
      label: "Quote expiration date valid",
      passed: Boolean(
        expirationDate &&
        expirationDate >= today &&
        (!maxValidityDate || expirationDate <= maxValidityDate)
      ),
      failMsg: maxValidityDate && expirationDate > maxValidityDate
        ? `Must expire by ${formatShortDate(maxValidityDate)} (3 days before event)`
        : "Valid expiration date is required",
    },
  ];

  const allChecksPassed = checks.every((c) => c.passed);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6 font-sans">
      {/* Revision Notice if updating existing quote */}
      {quotation && (
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 flex items-start gap-3 text-xs">
          <RefreshCw size={15} className="text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900">
              Publishing Version {(Number(quotation.version_number) || 1) + 1}.0
            </h4>
            <p className="text-slate-600 leading-relaxed">
              This will update the quotation sent to {details.contact_first_name || "the customer"} and replace their previous version.
            </p>
            {pendingChanges.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-700 block mb-1">
                  Adjustments made in this version ({pendingChanges.length}):
                </span>
                <ul className="space-y-0.5 text-slate-600">
                  {pendingChanges.map((change, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>{change.label}</span>
                      {change.from && change.to && (
                        <span className="font-mono text-[11px] text-slate-500">
                          ({change.from} → {change.to})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings Banner if any */}
      {warnings.length > 0 && (
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-1 text-xs text-slate-800">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <AlertTriangle size={13} className="text-primary shrink-0" />
            <span>Advisory Notes ({warnings.length})</span>
          </div>
          <ul className="space-y-0.5 pl-4 list-disc text-slate-600 text-[11px]">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Final Quotation Breakdown Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <FileCheck2 size={13} className="text-primary" /> Final Quotation Review
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {details.guest_count} Guests &middot; {details.event_date ? formatShortDate(details.event_date) : "TBD"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Quoted Line Items */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Quoted Items
            </span>

            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-700 font-medium truncate max-w-[190px]">
                {packageName || "Package"}
              </span>
              <span className="font-mono text-slate-900 font-semibold">
                {formatCurrency(totals.packagePrice)}
              </span>
            </div>

            {!offerContext && !isSpecialOffer && chargeableMenuItems.length > 0 && (
              <div className="py-1.5 border-b border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">
                    Menu Items ({chargeableMenuItems.length} dishes)
                  </span>
                  <span className="font-mono text-slate-900 font-semibold">
                    {formatCurrency(totals.menuSubtotal)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {chargeableMenuItems.map((dish, dIdx) => (
                    <span
                      key={dIdx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-white border border-slate-200 text-slate-700 shadow-2xs"
                    >
                      <DishThumbnail dish={dish} catalogMenuItems={catalogMenuItems} size="xs" />
                      <span className="font-medium text-slate-800">{dish.name}</span>
                      {dish.quantity && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({dish.quantity} {dish.unit || "Pax"})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(offerContext || isSpecialOffer) && (
              <div className="py-1.5 border-b border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">
                    Included Food Selections ({offerContext?.foodItems?.length || chargeableMenuItems.length} dishes)
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Included in Combo
                  </span>
                </div>
                {(offerContext?.foodItems?.length > 0 ? offerContext.foodItems : chargeableMenuItems).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {(offerContext?.foodItems?.length > 0 ? offerContext.foodItems : chargeableMenuItems).map((dish, dIdx) => {
                      const name = dish.name || dish.item_name;
                      const cat = dish.category || dish.menu_category;
                      return (
                        <span
                          key={dIdx}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-white border border-slate-200 text-slate-700 shadow-2xs"
                        >
                          <DishThumbnail dish={dish} catalogMenuItems={catalogMenuItems} size="xs" />
                          <span className="font-medium text-slate-800">{name}</span>
                          {cat && (
                            <span className="text-[9.5px] text-slate-400 font-semibold uppercase">
                              ({cat})
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {chargeableAddOns.length > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-700">
                  Extra Services ({chargeableAddOns.length} items)
                </span>
                <span className="font-mono text-slate-900 font-semibold">
                  {formatCurrency(totals.addOnsSubtotal)}
                </span>
              </div>
            )}

            {Number(transportationFee) > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-700">Delivery / Logistics</span>
                <span className="font-mono text-slate-900 font-semibold">
                  {formatCurrency(Number(transportationFee))}
                </span>
              </div>
            )}

            {additionalFees.filter((f) => Number(f.amount) > 0).map((f, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-700 truncate max-w-[190px]">{f.name || "Fee"}</span>
                <span className="font-mono text-slate-900 font-semibold">
                  {formatCurrency(Number(f.amount))}
                </span>
              </div>
            ))}
          </div>

          {/* Financial Totals */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Financial Summary
            </span>

            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-mono text-slate-800 font-semibold">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>

            {totals.discounts > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
                <span>Discount Applied</span>
                <span className="font-mono font-semibold">
                  -{formatCurrency(totals.discounts)}
                </span>
              </div>
            )}

            {totals.taxes > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Taxes</span>
                <span className="font-mono text-slate-800 font-semibold">
                  +{formatCurrency(totals.taxes)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1.5 pt-2 text-sm font-bold text-slate-900">
              <span>Total Quoted Amount</span>
              <span className="font-mono text-base text-primary">
                {formatCurrency(totals.totalCost)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Payment Terms & Expiration */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <CreditCard size={13} className="text-primary" /> Payment Terms &amp; Validity
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Deposit Amount */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700">
              Required Deposit Amount (₱) *
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-400 font-medium">
                ₱
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className={`w-full rounded-md border pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  errors.deposit_amount ? "border-red-400 bg-red-50/40" : "border-slate-300"
                }`}
              />
            </div>
            {errors.deposit_amount && (
              <p className="text-[11px] text-red-600 mt-0.5">{errors.deposit_amount}</p>
            )}

            {/* Quick Percentage Presets */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-500">Quick select:</span>
              {[depositPercentage, 30, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDepositByPercent(pct)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-medium border transition-colors cursor-pointer ${
                    depositShare === pct
                      ? "bg-primary text-white border-primary"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {pct}% {pct === depositPercentage ? "(Standard)" : ""}
                </button>
              ))}
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200 mt-2 flex justify-between items-center text-xs">
              <span className="text-slate-600">Remaining Balance on Event Day:</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {formatCurrency(totals.remainingBalance)}
              </span>
            </div>
          </div>

          {/* Expiration Date */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700">
              Quotation Expiration Date *
            </label>
            <input
              type="date"
              min={today}
              max={maxValidityDate || undefined}
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className={`w-full rounded-md border px-2.5 py-1.5 text-xs text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                errors.expiration_date ? "border-red-400 bg-red-50/40" : "border-slate-300"
              }`}
            />
            {errors.expiration_date ? (
              <p className="text-[11px] text-red-600 mt-0.5">{errors.expiration_date}</p>
            ) : maxValidityDate ? (
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Must expire at least 3 days before the event (latest: {formatShortDate(maxValidityDate)}).
              </p>
            ) : null}
          </div>
        </div>

        {/* Notes to Customer */}
        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
          <label className="block text-[11px] font-semibold text-slate-700">
            Notes to Customer (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Include special payment terms, catering reminders, or custom instructions..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 3. Pre-Flight Verification Checklist */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={15} className={allChecksPassed ? "text-emerald-600" : "text-slate-500"} />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
            Pre-Send Verification Checklist
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                check.passed
                  ? "bg-slate-50 border-slate-200 text-slate-800"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              {check.passed ? (
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={13} className="text-red-600 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="font-medium block leading-tight">{check.label}</span>
                {!check.passed && (
                  <span className="text-[10px] text-red-700 block mt-0.5">{check.failMsg}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBackToPrices}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Back to Set Prices</span>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={submitting || savingDraft}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Save size={13} />
            <span>{savingDraft ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            type="submit"
            disabled={submitting || savingDraft}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
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
                ? "Send Revised Quotation"
                : `Send Quotation to ${details.contact_first_name || "Customer"}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
