import React from "react";
import {
  User,
  Package,
  Utensils,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  Trash2,
  FileText,
  DollarSign,
  FileCheck2,
  Truck,
  Percent,
} from "lucide-react";

/**
 * Compact left-side workflow navigation (~185px).
 * Clear business labels and status indicators without decorative fluff.
 */
export default function QuotationNavigation({
  activeStep,
  setActiveStep,
  activePricingSection,
  setActivePricingSection,
  cateringIncluded,
  isSpecialOffer,
  offerContext,
  errors = {},
  savedDraft,
  draftSavedAt,
  onDiscardDraft,
}) {
  const isSpecial = Boolean(isSpecialOffer || offerContext);
  const hasStep1Errors = Object.keys(errors).some(
    (k) =>
      k.startsWith("contact_") ||
      k.startsWith("event_") ||
      k === "celebrant_name" ||
      k === "guest_count" ||
      k === "municipality" ||
      k === "barangay"
  );

  const hasStep2Errors = Object.keys(errors).some(
    (k) =>
      k.startsWith("inclusions.") ||
      k.startsWith("menu_items.") ||
      k.startsWith("add_ons.") ||
      k.startsWith("additional_fees.") ||
      k === "package_name" ||
      k === "total_cost"
  );

  const hasStep3Errors = Object.keys(errors).some(
    (k) => k === "deposit_amount" || k === "expiration_date"
  );

  const steps = [
    {
      id: 1,
      title: "Customer Request",
      desc: "Event details & specs",
      icon: User,
      hasError: hasStep1Errors,
    },
    {
      id: 2,
      title: "Set Prices",
      desc: "Package, menu & charges",
      icon: DollarSign,
      hasError: hasStep2Errors,
      subItems: [
        { id: "pricing-package", label: "Package Price", icon: Package },
        { id: "pricing-inclusions", label: "Included Items", icon: Check },
        ...(cateringIncluded ? [{ id: "pricing-menu", label: isSpecial ? "Included Food" : "Menu Pricing", icon: Utensils }] : []),
        { id: "pricing-addons", label: "Extra Services", icon: Sparkles },
        { id: "pricing-charges", label: "Other Charges", icon: Truck },
        { id: "pricing-discount", label: "Discount & Taxes", icon: Percent },
      ],
    },
    {
      id: 3,
      title: "Review & Send",
      desc: "Deposit, terms & send",
      icon: FileCheck2,
      hasError: hasStep3Errors,
    },
  ];

  return (
    <nav
      aria-label="Quotation builder steps"
      className="flex flex-col h-full bg-slate-50 border-r border-slate-200 p-2.5 w-full lg:w-[185px] shrink-0 select-none overflow-y-auto font-sans"
    >
      <div className="mb-2.5 px-1.5 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Workflow Steps
        </span>
      </div>

      <div className="space-y-1 flex-1">
        {steps.map((step) => {
          const isActive = activeStep === step.id;
          const isPassed = activeStep > step.id;

          return (
            <div key={step.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-start gap-2 cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-300 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold transition-colors ${
                    step.hasError
                      ? "bg-red-100 text-red-700"
                      : isActive
                      ? "bg-primary text-white"
                      : isPassed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {step.hasError ? (
                    <AlertCircle size={12} />
                  ) : isPassed ? (
                    <Check size={12} strokeWidth={2.5} />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs truncate block leading-tight ${
                      isActive ? "font-bold text-slate-900" : "font-medium"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                    {step.desc}
                  </span>
                </div>
              </button>

              {/* Step 2 Sub-items */}
              {step.id === 2 && isActive && step.subItems && (
                <div className="ml-3.5 pl-2.5 border-l-2 border-primary/25 space-y-0.5 py-1">
                  {step.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = activePricingSection === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePricingSection(sub.id);
                          const el = document.getElementById(sub.id);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isSubActive
                            ? "text-primary font-bold bg-primary/10"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        <SubIcon size={11} className="shrink-0 opacity-70" />
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Draft status indicator */}
      {savedDraft && (
        <div className="mt-auto pt-2.5 border-t border-slate-200">
          <div className="rounded-lg bg-slate-100 border border-slate-200 p-2 text-[11px] text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <FileText size={12} className="text-primary shrink-0" />
              <span>Draft Saved</span>
            </div>
            {draftSavedAt && (
              <p className="text-[10px] text-slate-500 leading-tight">
                {draftSavedAt}
              </p>
            )}
            <button
              type="button"
              onClick={onDiscardDraft}
              className="w-full mt-1 inline-flex items-center justify-center gap-1 px-1.5 py-0.5 text-[10.5px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
            >
              <Trash2 size={11} /> Discard Draft
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
