import React from "react";
import {
  Package,
  Layers,
  Utensils,
  Sparkles,
  Truck,
  Percent,
  Receipt,
  Check,
  AlertCircle,
  FileText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Left-side workflow navigation for the Walk-in Client Quotation Step (~195px).
 * Follows the Admin Quotation Builder structure:
 * 1. Package Price
 * 2. Included Items
 * 3. Menu Pricing
 * 4. Extra Services & Notes
 * 5. Other Charges
 * 6. Discount & Taxes
 * 7. Review & Terms
 */
export default function WalkInQuotationNavigation({
  activeSection = "pricing-package",
  onSelectSection,
  cateringIncluded = true,
  isSpecialOffer = false,
  menuItemsCount = 0,
  addOnsCount = 0,
  hasNotes = false,
  inclusionsCount = 0,
  errors = {},
  onProceedToReview,
}) {
  const hasPackageErrors = Boolean(errors.package_name || errors.package_price);
  const hasInclusionErrors = Object.keys(errors).some((k) => k.startsWith("inclusions."));
  const hasMenuErrors = Object.keys(errors).some((k) => k.startsWith("menu_items."));
  const hasAddonErrors = Object.keys(errors).some((k) => k.startsWith("add_ons."));
  const hasChargesErrors = Object.keys(errors).some((k) => k.startsWith("additional_fees."));
  const hasDiscountErrors = Boolean(errors.discounts || errors.taxes);
  const hasTermsErrors = Boolean(errors.deposit_amount || errors.payment_method);

  const sections = [
    {
      id: "pricing-package",
      stepNumber: 1,
      label: "Package Price",
      desc: "Base rate & space",
      icon: Package,
      hasError: hasPackageErrors,
      badge: null,
    },
    {
      id: "pricing-inclusions",
      stepNumber: 2,
      label: "Included Items",
      desc: inclusionsCount > 0 ? `${inclusionsCount} included` : "Package inclusions",
      icon: Layers,
      hasError: hasInclusionErrors,
      badge: inclusionsCount > 0 ? `${inclusionsCount}` : null,
    },
    {
      id: "pricing-menu",
      stepNumber: 3,
      label: isSpecialOffer ? "Included Food" : "Menu Pricing",
      desc: `${menuItemsCount} dish${menuItemsCount === 1 ? "" : "es"} quoted`,
      icon: Utensils,
      hasError: hasMenuErrors,
      badge: menuItemsCount > 0 ? `${menuItemsCount}` : null,
      highlight: menuItemsCount > 0,
    },
    {
      id: "pricing-addons",
      stepNumber: 4,
      label: "Extra Services & Notes",
      desc: hasNotes ? "Extras & client notes" : `${addOnsCount} extra${addOnsCount === 1 ? "" : "s"}`,
      icon: Sparkles,
      hasError: hasAddonErrors,
      badge: hasNotes ? "Notes" : addOnsCount > 0 ? `${addOnsCount}` : null,
      badgeTone: hasNotes ? "amber" : "default",
    },
    {
      id: "pricing-charges",
      stepNumber: 5,
      label: "Other Charges",
      desc: "Transpo & fees",
      icon: Truck,
      hasError: hasChargesErrors,
      badge: null,
    },
    {
      id: "pricing-discount",
      stepNumber: 6,
      label: "Discount & Taxes",
      desc: "Deductions & tax",
      icon: Percent,
      hasError: hasDiscountErrors,
      badge: null,
    },
    {
      id: "pricing-terms",
      stepNumber: 7,
      label: "Review & Terms",
      desc: "Deposit & status",
      icon: Receipt,
      hasError: hasTermsErrors,
      badge: null,
    },
  ];

  return (
    <nav
      aria-label="Walk-in quotation workflow sections"
      className="flex flex-col w-full lg:w-[195px] shrink-0 bg-slate-50/90 rounded-xl border border-slate-200 p-2.5 select-none font-sans lg:sticky lg:top-4 shadow-2xs"
    >
      <div className="mb-2 px-1.5 pt-0.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Workflow Steps
        </span>
        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
          7 Areas
        </span>
      </div>

      <div className="space-y-1">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectSection?.(sec.id)}
              className={cn(
                "w-full text-left px-2.5 py-2 rounded-lg transition-all flex items-start gap-2 cursor-pointer group text-xs",
                isActive
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-300 font-semibold ring-1 ring-blue-500/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
              )}
            >
              {/* Step number / icon badge */}
              <div
                className={cn(
                  "mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold transition-colors",
                  sec.hasError
                    ? "bg-red-100 text-red-700"
                    : isActive
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-200/80 text-slate-600 group-hover:bg-slate-300"
                )}
              >
                {sec.hasError ? (
                  <AlertCircle size={11} />
                ) : (
                  <span>{sec.stepNumber}</span>
                )}
              </div>

              {/* Title & description */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "truncate block leading-tight text-[11.5px]",
                      isActive ? "font-bold text-slate-900" : "font-medium"
                    )}
                  >
                    {sec.label}
                  </span>
                  {sec.badge && (
                    <span
                      className={cn(
                        "text-[9.5px] px-1 py-0.2 rounded font-bold shrink-0",
                        sec.badgeTone === "amber"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {sec.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                  {sec.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick link to proceed to review step */}
      {onProceedToReview && (
        <div className="mt-3 pt-2.5 border-t border-slate-200">
          <button
            type="button"
            onClick={onProceedToReview}
            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors cursor-pointer border border-blue-200/80"
          >
            <span>Proceed to Review</span>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </nav>
  );
}
