import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RotateCcw,
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  Banknote,
} from "lucide-react";
import PricingAdjustmentsStep from "../quotation/steps/PricingAdjustmentsStep";
import QuotationLiveSummary from "../quotation/QuotationLiveSummary";
import WalkInQuotationNavigation from "./WalkInQuotationNavigation";
import { formatCurrency } from "../../../utils/format";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "gcash", label: "GCash", icon: CreditCard },
  { value: "bank", label: "Bank Transfer", icon: CreditCard },
  { value: "paymongo", label: "PayMongo (Online)", icon: CreditCard },
];

const PRESET_PERCENTAGES = [10, 20, 30, 50, 100];

const SECTION_IDS = [
  "pricing-package",
  "pricing-inclusions",
  "pricing-menu",
  "pricing-addons",
  "pricing-charges",
  "pricing-terms",
];

export default function WalkInQuotationStep({
  // Package & Pricing props for PricingAdjustmentsStep
  packageName,
  startingPrice,
  setStartingPrice,
  inclusions,
  setInclusions,
  handleInclusionQuantity,
  handleInclusionUnitPrice,
  handleInclusionDeduction,
  toggleInclusionRemoved,
  scaffoldOptions = [],
  selectedScaffoldId,
  handleScaffoldOptionChange,
  isCustomScaffold,
  scaffoldWidth,
  scaffoldLength,
  handleCustomScaffoldChange,
  isFoodOnly,
  isSetupOnly,
  cateringIncluded,
  isSpecialOffer,
  offerContext,
  packageRecord,
  inquiry,
  menuItems,
  handleMenuChange,
  toggleMenuRemoved,
  handleDeleteMenu,
  onReplaceSpecialOfferDish,
  onRemoveSpecialOfferDish,
  onSelectSpecialOfferDish,
  onResetSpecialOfferFood,
  catalogMenuItems = [],
  onAddCatalogDish,
  onAddCustomDish,
  addOns,
  handleAddOnChange,
  toggleAddOnRemoved,
  handleDeleteAddOn,
  catalogAddons = [],
  onAddCatalogAddon,
  onAddCustomAddon,
  transportationFee,
  setTransportationFee,
  additionalFees,
  handleFeeChange,
  handleRemoveFee,
  handleAddFee,
  errors = {},
  onProceedToReview,

  // Customer Notes Props from Earlier Booking Steps
  customerNotes = "",
  dietaryNotes = "",
  allergiesNotes = "",
  customNotes = "",
  deliveryNotes = "",

  // Live Summary Props
  totals,
  eventSpace,
  chargeableMenuItemsCount = 0,
  chargeableAddOnsCount = 0,

  // Payment & Terms Props
  depositPercent = 20,
  setDepositPercent,
  customDeposit,
  setCustomDeposit,
  paymentMethod = "cash",
  setPaymentMethod,
  depositPaidImmediately = true,
  setDepositPaidImmediately,
  balancePreference = "in_person",
  setBalancePreference,
  notes = "",
  setNotes,
  onResetToDefault,
}) {
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("pricing-package");

  // Counts & indicators for navigation
  const activeMenuItemsCount = useMemo(
    () => (Array.isArray(menuItems) ? menuItems.filter((m) => !m.removed).length : 0),
    [menuItems]
  );
  const activeAddOnsCount = useMemo(
    () => (Array.isArray(addOns) ? addOns.filter((a) => !a.removed).length : 0),
    [addOns]
  );
  const inclusionsCount = useMemo(
    () => (Array.isArray(inclusions) ? inclusions.filter((i) => !i.removed).length : 0),
    [inclusions]
  );
  const hasNotes = useMemo(
    () =>
      Boolean(
        customerNotes ||
          dietaryNotes ||
          allergiesNotes ||
          customNotes ||
          deliveryNotes ||
          inquiry?.special_requests ||
          inquiry?.dietary_restrictions ||
          inquiry?.allergies
      ),
    [customerNotes, dietaryNotes, allergiesNotes, customNotes, deliveryNotes, inquiry]
  );

  // Smooth scroll to section on sidebar click
  const handleScrollToSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Track active section as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop;
      for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTION_IDS[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 220) {
            setActiveSection(SECTION_IDS[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="space-y-5 font-sans">
      {/* ── Top Header Banner with Walk-in Quotation Indicator & Reset ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Quotation &amp; Pricing
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              <Sparkles size={11} className="text-blue-600" />
              Admin Quotation Builder
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure package base price, inclusions, dish pricing, extra services, client notes, and payment terms using the standard quotation builder.
          </p>
        </div>

        {onResetToDefault && (
          <button
            type="button"
            onClick={onResetToDefault}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            title="Reset quotation prices and items back to selections from previous steps"
          >
            <RotateCcw size={13} />
            <span>Reset to Step Selections</span>
          </button>
        )}
      </div>

      {/* ── Main Three-Column Quotation Workspace (Workflow Nav, Pricing Adjustments, Live Summary) ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Column: Workflow Navigation (~195px) */}
        <WalkInQuotationNavigation
          activeSection={activeSection}
          onSelectSection={handleScrollToSection}
          cateringIncluded={cateringIncluded}
          isSpecialOffer={isSpecialOffer}
          menuItemsCount={activeMenuItemsCount}
          addOnsCount={activeAddOnsCount}
          hasNotes={hasNotes}
          inclusionsCount={inclusionsCount}
          errors={errors}
          onProceedToReview={onProceedToReview}
        />

        {/* Center Column: Full Pricing Adjustments Step + Payment Terms */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          <PricingAdjustmentsStep
            packageName={packageName}
            startingPrice={startingPrice}
            setStartingPrice={setStartingPrice}
            inclusions={inclusions}
            setInclusions={setInclusions}
            handleInclusionQuantity={handleInclusionQuantity}
            handleInclusionUnitPrice={handleInclusionUnitPrice}
            handleInclusionDeduction={handleInclusionDeduction}
            toggleInclusionRemoved={toggleInclusionRemoved}
            scaffoldOptions={scaffoldOptions}
            selectedScaffoldId={selectedScaffoldId}
            handleScaffoldOptionChange={handleScaffoldOptionChange}
            isCustomScaffold={isCustomScaffold}
            scaffoldWidth={scaffoldWidth}
            scaffoldLength={scaffoldLength}
            handleCustomScaffoldChange={handleCustomScaffoldChange}
            isFoodOnly={isFoodOnly}
            isSetupOnly={isSetupOnly}
            cateringIncluded={cateringIncluded}
            isSpecialOffer={isSpecialOffer}
            offerContext={offerContext}
            packageRecord={packageRecord}
            inquiry={inquiry}
            menuItems={menuItems}
            handleMenuChange={handleMenuChange}
            toggleMenuRemoved={toggleMenuRemoved}
            handleDeleteMenu={handleDeleteMenu}
            onReplaceSpecialOfferDish={onReplaceSpecialOfferDish}
            onRemoveSpecialOfferDish={onRemoveSpecialOfferDish}
            onSelectSpecialOfferDish={onSelectSpecialOfferDish}
            onResetSpecialOfferFood={onResetSpecialOfferFood}
            catalogMenuItems={catalogMenuItems}
            onAddCatalogDish={onAddCatalogDish}
            onAddCustomDish={onAddCustomDish}
            addOns={addOns}
            handleAddOnChange={handleAddOnChange}
            toggleAddOnRemoved={toggleAddOnRemoved}
            handleDeleteAddOn={handleDeleteAddOn}
            catalogAddons={catalogAddons}
            onAddCatalogAddon={onAddCatalogAddon}
            onAddCustomAddon={onAddCustomAddon}
            transportationFee={transportationFee}
            setTransportationFee={setTransportationFee}
            additionalFees={additionalFees}
            handleFeeChange={handleFeeChange}
            handleRemoveFee={handleRemoveFee}
            handleAddFee={handleAddFee}
            errors={errors}
            onProceedToReview={onProceedToReview}
            customerNotes={customerNotes}
            dietaryNotes={dietaryNotes}
            allergiesNotes={allergiesNotes}
            customNotes={customNotes}
            deliveryNotes={deliveryNotes}
          />

          {/* ── Payment Terms & Status Settlement Card (Workflow Step 6) ── */}
          <div id="pricing-terms" className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt size={17} className="text-blue-600" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Payment Terms &amp; Booking Status Routing
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure deposit collection status. Controls whether this walk-in booking is held under Quotations or immediately confirmed into Reservations.
                </p>
              </div>
            </div>

            {/* 1. Deposit Settlement Status (Routing Decision) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Deposit Status &amp; Destination <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option A: Immediate Deposit Collected -> Goes to Reservations */}
                <button
                  type="button"
                  onClick={() => setDepositPaidImmediately(true)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                    depositPaidImmediately
                      ? "border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-600/10"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      Immediate Deposit Collected
                    </span>
                    <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                      → Moves to Reservations
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
                    Customer is paying the required deposit right now in person. Booking will automatically convert and appear as an active confirmed reservation.
                  </p>
                </button>

                {/* Option B: Pending Deposit Payment -> Stays in Quotations */}
                <button
                  type="button"
                  onClick={() => setDepositPaidImmediately(false)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                    !depositPaidImmediately
                      ? "border-amber-600 bg-amber-50/50 shadow-xs ring-2 ring-amber-600/10"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-amber-900">
                      <Clock size={15} className="text-amber-600 shrink-0" />
                      Pending Deposit Payment
                    </span>
                    <span className="rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">
                      → Stays in Quotations
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
                    Deposit has not been paid yet. The inquiry and quotation will be held under Quotations (Quotation Sent) and will not be confirmed on the active calendar yet.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Deposit Amount & Percentage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Deposit Percentage
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_PERCENTAGES.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDepositPercent(pct);
                        setCustomDeposit("");
                      }}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer",
                        depositPercent === pct && customDeposit === ""
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Standard deposit requirement is {depositPercent}%.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Deposit Amount (₱)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-400 font-medium">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={formatCurrency(totals?.depositAmount || 0).replace("₱", "").trim()}
                    value={customDeposit}
                    onChange={(e) => setCustomDeposit(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2.5 py-1.5 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Computed: {formatCurrency(totals?.depositAmount || 0)} · Override if collecting a specific custom deposit
                </span>
              </div>
            </div>

            {/* 3. Payment Method & Balance Preference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.value} value={pm.value}>
                      {pm.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  How client is settling payment or planned payment method
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Balance Payment Preference
                </label>
                <select
                  value={balancePreference}
                  onChange={(e) => setBalancePreference(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="in_person">In Person / On Event Day</option>
                  <option value="online">Online (GCash / Bank Transfer / PayMongo)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Remaining balance of {formatCurrency(totals?.remainingBalance || 0)}
                </span>
              </div>
            </div>

            {/* 4. Quotation Remarks / Notes */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Admin Quotation Remarks &amp; Special Stipulations
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add quotation remarks, payment reminders, or custom setup inclusions mentioned to customer..."
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Live Summary (~280px) matching QuotationBuilderModal */}
        <div className="w-full lg:w-[280px] shrink-0 lg:sticky lg:top-4">
          <div className="rounded-xl overflow-hidden shadow-lg border border-slate-800">
            <QuotationLiveSummary
              totals={totals}
              activeStep={2}
              cateringIncluded={cateringIncluded}
              chargeableMenuItemsCount={chargeableMenuItemsCount}
              chargeableAddOnsCount={chargeableAddOnsCount}
              transportationFee={transportationFee}
              additionalFees={additionalFees}
              eventSpace={eventSpace}
              isFoodOnly={isFoodOnly}
              isSetupOnly={isSetupOnly}
              offerContext={offerContext}
              isCollapsed={isSummaryCollapsed}
              setIsCollapsed={setIsSummaryCollapsed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
