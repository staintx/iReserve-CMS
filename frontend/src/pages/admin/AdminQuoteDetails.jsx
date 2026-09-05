import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import QuotationBuilderModal from "../../components/admin/quotation/QuotationBuilderModal";
import ConvertBookingModal from "../../components/admin/quotation/ConvertBookingModal";
import ZelleQuoteDraft from "../../components/admin/ui/ZelleQuoteDraft";
import { 
  User, Mail, Phone, Calendar, Clock, MapPin, 
  DollarSign, Info, ArrowLeft, CheckCircle2,
  FileText, Activity, Utensils, Send, RefreshCw, Ruler,
  Package as PackageIcon, Users, AlertTriangle, Layers,
  Truck, Check, ShieldAlert, HeartPulse, ChevronDown,
  ChevronUp, Sparkles
} from "lucide-react";
import Badge from "../../components/admin/ui/Badge";
import { pendingChangeRequestOf } from "../../utils/quotationDiff";
import { 
  priceLabel, 
  capacityLabel, 
  eventSpaceLabel, 
  groupInclusions,
  parseInclusion 
} from "../../lib/packageDisplay";
import {
  BOOKING_TYPES,
  OFFER_TYPES,
  bookingIdentity,
  offerFoodByCategory,
  offerFoodForDisplay,
  offerInclusions,
  offerPricePerPax,
  offerBaseFoodPrice,
} from "../../lib/specialOffers";
import { formatCurrency, formatShortDate, formatTime } from "../../utils/format";
import { menuAmountLabel, menuLineTotal, addOnLineTotal } from "../../utils/quotationPricing";

/* --- Refined Section Container --- */
const SectionContainer = ({ title, icon: Icon, badge, headerRight, children, className = "" }) => (
  <section className={`bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden ${className}`}>
    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <Icon size={15} className="text-slate-400 shrink-0" />}
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 truncate">{title}</h2>
        {badge && <div className="ml-1">{badge}</div>}
      </div>
      {headerRight && <div className="shrink-0 flex items-center gap-2">{headerRight}</div>}
    </div>
    <div className="p-5">
      {children}
    </div>
  </section>
);

/* --- Key-Value Data Field --- */
const DataField = ({ label, value, children, subtext, icon: Icon, span = "col-span-1", hideWhenEmpty = false, emphasized = false }) => {
  if (hideWhenEmpty && !children && !value) return null;
  return (
    <div className={`min-w-0 space-y-1 ${span}`}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} className="shrink-0 text-slate-400" />}
        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 truncate">{label}</span>
      </div>
      <div className={`text-xs break-words leading-snug ${emphasized ? "font-bold text-slate-900 text-sm" : "font-medium text-slate-800"}`}>
        {children || value || <span className="text-slate-300 font-normal italic">Not specified</span>}
      </div>
      {subtext && <p className="text-[11px] text-slate-400 font-normal leading-tight">{subtext}</p>}
    </div>
  );
};

/* --- Money Line Helper for Quotation Summary --- */
const MoneyLine = ({ label, detail, value, strong, deduct }) => (
  <div className="flex items-baseline justify-between gap-4 text-xs">
    <span className={`min-w-0 ${strong ? "font-bold text-slate-900" : "text-slate-600"}`}>
      {label}
      {detail && <span className="ml-1 text-slate-400 font-normal">{detail}</span>}
    </span>
    <span
      className={`shrink-0 tabular-nums ${
        deduct ? "text-emerald-700 font-semibold" : strong ? "font-bold text-slate-900 text-[13px]" : "font-medium text-slate-800"
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * Current Quotation Card (When a quote has already been issued)
 */
function CurrentQuotationCard({ quotation, versionCount, hasDraft, isDepositPaid }) {
  const [showDetails, setShowDetails] = useState(false);
  const expiry = quotation.expiration_date ? new Date(quotation.expiration_date) : null;
  const expired =
    expiry &&
    !Number.isNaN(expiry.getTime()) &&
    new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()) <
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const expiryChipTone = expired
    ? "bg-red-50 text-red-700 border-red-200/80"
    : "bg-slate-100 text-slate-600 border-slate-200/60";

  const guests = Number(quotation.guest_count) || 1;
  const dishes = Array.isArray(quotation.menu_items) ? quotation.menu_items : [];
  const addOns = Array.isArray(quotation.add_ons) ? quotation.add_ons : [];
  const fees = Array.isArray(quotation.additional_fees) ? quotation.additional_fees : [];
  const adjustments = (
    Array.isArray(quotation.inclusion_adjustments) ? quotation.inclusion_adjustments : []
  ).filter((entry) => entry?.name && Number(entry?.amount));
  const menuSubtotal = dishes.reduce((sum, item) => sum + menuLineTotal(item, guests), 0);
  const addOnsSubtotal = addOns.reduce((sum, item) => sum + addOnLineTotal(item), 0);

  return (
    <SectionContainer
      title="Current Quotation"
      icon={FileText}
      badge={
        <span className="rounded font-mono bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
          v{Number(quotation.version_number) || 1} {versionCount > 1 && `of ${versionCount}`}
        </span>
      }
      headerRight={
        <div className="flex items-center gap-2">
          {isDepositPaid && (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
              <Check size={11} className="text-emerald-700" /> Deposit Paid
            </span>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
          >
            {showDetails ? "Hide breakdown" : "View breakdown"}
            {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono">
            <span className="font-bold text-slate-800">
              {quotation.quotation_number || "QTN"}
            </span>
            <span>Issued {formatShortDate(quotation.createdAt)}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium border ${expiryChipTone}`}>
              {expiry
                ? `${expired ? "Expired" : "Valid until"} ${formatShortDate(quotation.expiration_date)}`
                : "No expiry set"}
            </span>
            {hasDraft && (
              <span className="rounded bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-800">
                Newer unsent draft exists
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Total</span>
            <span className="text-base font-bold font-mono text-slate-900">{formatCurrency(quotation.total_cost)}</span>
          </div>
        </div>

        {/* Condensed Summary Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-1">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Package Base</span>
            <span className="text-xs font-semibold text-slate-800 font-mono">{formatCurrency(quotation.package_price)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Menu ({dishes.length})</span>
            <span className="text-xs font-semibold text-slate-800 font-mono">{formatCurrency(menuSubtotal)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Add-ons ({addOns.length})</span>
            <span className="text-xs font-semibold text-slate-800 font-mono">{formatCurrency(addOnsSubtotal)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Deposit</span>
            <span className="text-xs font-bold text-slate-900 font-mono">{formatCurrency(quotation.deposit_amount)}</span>
          </div>
        </div>

        {/* Expandable Full Breakdown */}
        {showDetails && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50/50 p-4">
              <MoneyLine
                label={quotation.package_name || "Package"}
                detail={
                  adjustments.length > 0
                    ? `(${adjustments.length} quantity ${adjustments.length === 1 ? "adjustment" : "adjustments"})`
                    : undefined
                }
                value={formatCurrency(quotation.package_price)}
              />
              {dishes.length > 0 && (
                <MoneyLine
                  label="Menu"
                  detail={`(${dishes.length} ${dishes.length === 1 ? "dish" : "dishes"})`}
                  value={formatCurrency(menuSubtotal)}
                />
              )}
              {addOns.length > 0 && (
                <MoneyLine
                  label="Add-ons"
                  detail={`(${addOns.length} ${addOns.length === 1 ? "item" : "items"})`}
                  value={formatCurrency(addOnsSubtotal)}
                />
              )}
              {Number(quotation.transportation_fee) > 0 && (
                <MoneyLine label="Transportation" value={formatCurrency(quotation.transportation_fee)} />
              )}
              {fees.map((fee, i) => (
                <MoneyLine key={i} label={fee.name || "Additional fee"} value={formatCurrency(fee.amount)} />
              ))}
              {Number(quotation.taxes) > 0 && (
                <MoneyLine label="Taxes" value={`+ ${formatCurrency(quotation.taxes)}`} />
              )}
              {Number(quotation.discounts) > 0 && (
                <MoneyLine label="Discount" value={`− ${formatCurrency(quotation.discounts)}`} deduct />
              )}
              <div className="mt-2.5 border-t border-slate-200/80 pt-2.5 space-y-1.5">
                <MoneyLine label="Total" value={formatCurrency(quotation.total_cost)} strong />
                <MoneyLine label="Deposit" value={formatCurrency(quotation.deposit_amount)} />
                <MoneyLine label="Balance" value={formatCurrency(quotation.remaining_balance)} />
              </div>
            </div>

            {dishes.length > 0 && (
              <div>
                <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Dishes ({dishes.length})
                </span>
                <div className="divide-y divide-slate-100 rounded-md border border-slate-100 overflow-hidden text-xs">
                  {dishes.map((dish, i) => {
                    const byQuantity = dish.pricing_type === "quantity";
                    const units = byQuantity ? Math.max(1, Number(dish.quantity) || 1) : guests;
                    const basis = byQuantity
                      ? `${units} × ${formatCurrency(dish.price)}`
                      : `${units} guests × ${formatCurrency(dish.price)}/pax`;
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white hover:bg-slate-50/50 transition-colors">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800">{dish.name}</span>
                          {dish.category && (
                            <span className="ml-2 rounded font-mono bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-slate-500">
                              {dish.category}
                            </span>
                          )}
                          <span className="ml-2 text-[11px] text-slate-400 tabular-nums">{basis}</span>
                        </div>
                        <span className="shrink-0 font-mono font-semibold text-slate-700">
                          {formatCurrency(menuLineTotal(dish, guests))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {quotation.admin_notes && (
              <div className="rounded-md border border-slate-100 bg-slate-50/60 p-3.5 text-xs">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notes
                </span>
                <p className="whitespace-pre-line text-slate-700 leading-relaxed font-normal">
                  {quotation.admin_notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionContainer>
  );
}

export default function AdminQuoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Progressive disclosure toggles
  const [showAllInclusions, setShowAllInclusions] = useState(false);
  const [showAllMenu, setShowAllMenu] = useState(false);

  // Sticky header observation
  const headerRef = useRef(null);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await AdminAPI.getInquiry(id);
        if (isMounted) setQuote(res.data);

        try {
          const qRes = await AdminAPI.getQuotationsByInquiry(id);
          if (isMounted) setQuotations(qRes.data || []);
        } catch {
          if (isMounted) setQuotations([]);
        }
      } catch (err) {
        notify(err.response?.data?.message || "Could not load inquiry details.", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [id, notify]);

  // Track scroll position for sticky action summary header
  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        setIsStickyVisible(rect.bottom < 40);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-medium">Loading inquiry...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!quote) {
    return (
      <AdminLayout>
        <div className="p-8 max-w-md mx-auto text-center bg-white rounded-lg border border-slate-200 shadow-sm my-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
            <Info size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">Inquiry Not Found</h2>
          <p className="text-xs text-slate-500 mb-5">The inquiry record does not exist or has been deleted.</p>
          <button 
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer" 
            onClick={() => navigate("/admin/bookings/inquiries")}
          >
            Return to Inquiries
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Derived states
  const hasDraft = quotations.some((q) => q.status === "Draft");
  const issuedVersions = quotations
    .filter((q) => q.status !== "Draft")
    .sort((a, b) => (Number(b.version_number) || 1) - (Number(a.version_number) || 1));
  const currentQuotation = issuedVersions[0] || null;

  const isPendingReview = ["Pending Review", "Under Review"].includes(quote.status);
  const isRevisionRequested = quote.status === "Revision Requested";
  const isQuotationSent = quote.status === "Quotation Sent";
  const isAccepted = ["Quote Accepted", "Awaiting Final Confirmation", "Accepted"].includes(quote.status);
  const isDepositPaid = quote.payment_status === "deposit_paid" || 
                        quote.payment_status === "fully_paid" || 
                        quotations.some(q => q.inquiry_payment_status === "deposit_paid" || q.inquiry_payment_status === "fully_paid" || q.approved_payment || q.is_paid);
  const isConverted = quote.status === "Converted to Booking";

  const identity = bookingIdentity(quote);
  const isOffer =
    identity.type === BOOKING_TYPES.SPECIAL ||
    quote.package_id?.offer_type === OFFER_TYPES.SPECIAL ||
    (Array.isArray(quote.package_id?.offer_food_items) && quote.package_id.offer_food_items.length > 0) ||
    (Array.isArray(quote.offer_food_snapshot) && quote.offer_food_snapshot.length > 0);
  const isFoodOnly = quote.service_type === "Food Only";
  const offerPackage = quote.package_id && typeof quote.package_id === "object" ? quote.package_id : null;
  const offerCourses = isOffer ? offerFoodByCategory(offerFoodForDisplay(quote, offerPackage)) : [];
  const offerExtras = isOffer ? offerInclusions(offerPackage) : [];
  const offerPerPax = isOffer ? offerPricePerPax(offerPackage) : 0;
  const offerBase = Number(quote.offer_base_price) || (isOffer ? offerBaseFoodPrice(offerPackage, Number(quote.guest_count)) : 0);

  // Primary action label based on current status
  const primaryActionLabel = hasDraft
    ? "Resume Draft"
    : isRevisionRequested
    ? "Revise Quotation"
    : isQuotationSent
    ? "Edit Quotation"
    : isAccepted
    ? "Confirm & Convert"
    : "Prepare Quotation";

  // Package inclusions grouped cleanly
  const rawInclusions = Array.isArray(quote.package_id?.inclusions) ? quote.package_id.inclusions : [];
  const groupedInclusions = groupInclusions(rawInclusions);
  const totalInclusionsCount = rawInclusions.length;

  return (
    <AdminLayout>
      {/* --- Sticky Summary & Action Bar --- */}
      <div 
        className={`fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 sm:px-6 py-2.5 transition-all duration-200 ${
          isStickyVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-bold text-slate-900 shrink-0">
              {quote.reference || `INQ-${String(quote._id).slice(-6).toUpperCase()}`}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-slate-800 truncate">
              {quote.contact_first_name} {quote.contact_last_name}
            </span>
            <span className="hidden md:inline text-xs text-slate-500 font-mono">
              • {quote.guest_count || "—"} Pax • {quote.event_type || "Event"}
            </span>
            <Badge status={quote.status} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isConverted && (
              <button 
                onClick={() => setShowConvertModal(true)}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Activity size={13} />
                <span>{primaryActionLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4 pb-14">
        
        {/* --- Top Header & Inquiry Identity --- */}
        <div ref={headerRef} className="bg-white rounded-lg border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          {/* Back Navigation & Main Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <button 
                onClick={() => navigate("/admin/bookings/inquiries")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Back to Inquiries</span>
              </button>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Inquiry Details
                </h1>
                <Badge status={quote.status} />
                {isDepositPaid && (
                  <span className="px-2 py-0.5 text-[10.5px] font-mono font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-700" /> Deposit Paid
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:pt-0">
              {!isConverted && (
                <ZelleQuoteDraft
                  inquiryId={quote._id}
                  currentPackageName={quote.package_id?.name || quote.package_name_snapshot}
                  guestCount={quote.guest_count}
                  onApplyRecommendation={() => setShowConvertModal(true)}
                />
              )}
              {!isConverted && (
                <button 
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  onClick={() => setShowConvertModal(true)}
                >
                  <Activity size={14} className="text-primary-400" />
                  <span>{primaryActionLabel}</span>
                </button>
              )}
              {quote.converted_booking_id && (
                <button 
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/bookings/${quote.converted_booking_id}/details`)}
                >
                  <CheckCircle2 size={14} />
                  <span>View Confirmed Booking</span>
                </button>
              )}
            </div>
          </div>

          {/* Key Scannable Request Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">Reference</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {quote.reference || `INQ-${String(quote._id).slice(-6).toUpperCase()}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">Customer</span>
              <span className="text-xs font-semibold text-slate-800 truncate block" title={`${quote.contact_first_name} ${quote.contact_last_name}`}>
                {quote.contact_first_name} {quote.contact_last_name}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">Event &amp; Service</span>
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {quote.event_type || "Event"} · {quote.service_type || "Setup"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">Date</span>
              <span className="text-xs font-semibold text-slate-800">
                {quote.event_date ? formatShortDate(quote.event_date) : "To be confirmed"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">Headcount</span>
              <span className="text-xs font-bold text-slate-900 font-mono">
                {quote.guest_count ? `${quote.guest_count} Pax` : "Not specified"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">Estimate</span>
              <span className="text-xs font-bold font-mono text-slate-900">
                {quote.estimated_total > 0 ? formatCurrency(quote.estimated_total) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* --- Contextual Status Banners (Only when actionable) --- */}
        {isRevisionRequested && (() => {
          const request = pendingChangeRequestOf(quotations);
          const nextVersion = (quotations.reduce(
            (max, q) => Math.max(max, Number(q.version_number) || 1), 0
          ) || 1) + 1;

          return (
            <div className="p-4 bg-orange-50/90 border border-orange-200/90 rounded-lg shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 bg-orange-500 text-white rounded shrink-0">
                    <RefreshCw size={14} />
                  </div>
                  <h3 className="font-bold text-orange-950 text-xs sm:text-sm">
                    Revision Requested &middot; Next is v{nextVersion}
                  </h3>
                </div>
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Revise Quotation
                </button>
              </div>

              {request?.customer_response ? (
                <blockquote className="rounded-md border border-orange-200/80 bg-white/95 px-3.5 py-2.5 text-xs text-slate-800 leading-relaxed shadow-xs">
                  <span className="font-bold text-orange-900 block text-[11px] uppercase tracking-wider mb-0.5">Message:</span>
                  “{request.customer_response}”
                </blockquote>
              ) : (
                <p className="text-[11.5px] text-orange-700 italic">
                  Changes were requested without an additional message.
                </p>
              )}
            </div>
          );
        })()}

        {hasDraft && (
          <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 bg-amber-500 text-white rounded shrink-0">
                <FileText size={14} />
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm leading-tight">Unsent Draft</h4>
                <p className="text-[11.5px] text-amber-800 mt-0.5">
                  A draft quotation was saved but has not yet been issued.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConvertModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Resume Draft
            </button>
          </div>
        )}

        {isAccepted && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 bg-emerald-600 text-white rounded shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-xs sm:text-sm leading-tight">
                  {isDepositPaid ? "Accepted & Deposit Paid" : "Accepted (Awaiting Deposit)"}
                </h4>
                <p className="text-[11.5px] text-emerald-800 mt-0.5">
                  {isDepositPaid
                    ? "Quotation accepted and deposit payment confirmed. Ready to convert to booking."
                    : "Quotation accepted. Awaiting deposit payment."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConfirmConvert(true)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={13} /> Convert to Booking
            </button>
          </div>
        )}

        {/* --- Main 2-Column Operational Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left / Primary Column (8 cols) */}
          <div className="lg:col-span-8 space-y-4">

            {/* Issued Quotation Card (When present) */}
            {currentQuotation && (
              <CurrentQuotationCard
                quotation={currentQuotation}
                versionCount={issuedVersions.length}
                hasDraft={hasDraft}
                isDepositPaid={isDepositPaid}
              />
            )}

            {currentQuotation && (
              <div className="flex items-center gap-2 px-1 text-slate-400 text-xs">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  Original Request
                </span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
            )}

            {/* 1. Event Details */}
            <SectionContainer title="Event Details" icon={Calendar}>
              <div className="space-y-4">
                
                {/* Group 1: Requirements */}
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                    Requirements
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-5">
                    <DataField 
                      icon={Layers} 
                      label="Service" 
                      value={quote.service_type || (quote.include_food === false ? "Event Setup Only" : "Food and Event Setup")} 
                      emphasized
                    />
                    
                    <DataField 
                      icon={Utensils} 
                      label="Event Type" 
                      value={quote.event_type} 
                      emphasized
                    />
                    
                    <DataField 
                      icon={Users} 
                      label="Headcount" 
                      value={quote.guest_count ? `${quote.guest_count} Pax` : null} 
                      emphasized
                    />
                  </div>
                </div>

                {/* Group 2: Schedule */}
                <div className="pt-3.5 border-t border-slate-100">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                    Schedule
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-5">
                    <DataField 
                      icon={Calendar} 
                      label="Date"
                    >
                      {(() => {
                        const d = quote.event_date ? new Date(quote.event_date) : null;
                        if (d && !isNaN(d.getTime())) {
                          return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                        }
                        return null;
                      })()}
                    </DataField>

                    <DataField
                      icon={Clock}
                      label="Time"
                      value={quote.start_time ? formatTime(quote.start_time) : null}
                    />

                    <DataField 
                      icon={User} 
                      label="Celebrant" 
                      value={quote.celebrant_name} 
                    />

                    <DataField icon={Calendar} label="Theme">
                      {quote.event_theme ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{quote.event_theme}</span>
                          {(Array.isArray(quote.event_palette) ? quote.event_palette : []).map((colour) => (
                            <span key={colour} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.2 text-[10px] font-normal text-slate-600">
                              {colour}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </DataField>
                  </div>
                </div>

                {/* Group 3: Venue & Location */}
                <div className="pt-3.5 border-t border-slate-100">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                    Venue
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-5">
                    <DataField 
                      icon={MapPin} 
                      label="Venue Type" 
                      value={quote.venue_type} 
                    />

                    <DataField
                      icon={Ruler}
                      label="Space Size"
                      value={eventSpaceLabel(quote, quote.package_id) || null}
                      hideWhenEmpty={isOffer || isFoodOnly}
                    />

                    {/* Contextual Delivery Method: shown when Food Only or non-standard */}
                    {(isFoodOnly || (quote.delivery_method && quote.delivery_method.toLowerCase() !== "setup")) && (
                      <DataField 
                        icon={Truck} 
                        label="Delivery Method" 
                        value={quote.delivery_method ? quote.delivery_method.toUpperCase() : null}
                        subtext={isFoodOnly ? "Drop-off catering" : undefined}
                      />
                    )}

                    <div className="col-span-2 sm:col-span-3">
                      <DataField 
                        icon={MapPin} 
                        label="Address" 
                      >
                        {quote.street || quote.barangay || quote.municipality || quote.province ? (
                          <span className="leading-snug text-slate-800">
                            {[quote.street, quote.barangay, quote.municipality, quote.province].filter(Boolean).join(", ")}
                            {quote.zip_code && ` (${quote.zip_code})`}
                            {quote.landmark && (
                              <span className="text-slate-500 font-normal"> · Landmark: {quote.landmark}</span>
                            )}
                          </span>
                        ) : null}
                      </DataField>
                    </div>
                  </div>
                </div>

              </div>
            </SectionContainer>

            {/* 2. Package & Inclusions */}
            <SectionContainer 
              title="Package &amp; Inclusions" 
              icon={PackageIcon}
              badge={
                quote.package_id && totalInclusionsCount > 0 && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10.5px] font-mono font-semibold text-slate-600 border border-slate-200/60">
                    {totalInclusionsCount} items
                  </span>
                )
              }
            >
              {quote.package_id && typeof quote.package_id === "object" ? (
                <div className="space-y-4">
                  {/* Package Core Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {quote.package_id.image_url ? (
                        <img
                          src={quote.package_id.image_url}
                          alt={quote.package_id.name}
                          className="w-12 h-12 rounded-md object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20">
                          <PackageIcon size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                          {quote.package_id.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {isOffer ? (
                            <span className="px-2 py-0.5 rounded font-mono bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200/80">
                              {identity.label}
                            </span>
                          ) : (
                            quote.package_id.package_type && (
                              <span className="px-2 py-0.5 rounded font-mono bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20">
                                {quote.package_id.package_type}
                              </span>
                            )
                          )}
                          {capacityLabel(quote.package_id) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200/80 font-medium">
                              <Users size={11} className="text-slate-400" />
                              {capacityLabel(quote.package_id)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 shrink-0">
                      <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold block">
                        Base Price
                      </span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                        {priceLabel(quote.package_id)}
                      </span>
                    </div>
                  </div>

                  {quote.package_id.description && (
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {quote.package_id.description}
                    </p>
                  )}

                  {/* Clean Inclusions Summary & Progressive Disclosure */}
                  {totalInclusionsCount > 0 && (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">
                          Inclusions ({totalInclusionsCount})
                        </span>
                        <button
                          onClick={() => setShowAllInclusions(!showAllInclusions)}
                          className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                        >
                          {showAllInclusions ? "Hide all" : `View all (${totalInclusionsCount})`}
                          {showAllInclusions ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>

                      {/* Default: Category Summary Cards (Compact & Scannable) */}
                      {!showAllInclusions && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupedInclusions.map((group, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setShowAllInclusions(true)}
                              className="p-3 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 rounded-md cursor-pointer transition-colors flex items-center justify-between gap-2"
                            >
                              <span className="text-xs font-medium text-slate-700 truncate">
                                {group.category || "Inclusions"}
                              </span>
                              <span className="text-[11px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/80 shrink-0">
                                {group.items.length} items
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expanded: Clean Grouped Inclusions without brackets */}
                      {showAllInclusions && (
                        <div className="space-y-3.5 pt-1">
                          {groupedInclusions.map((group, idx) => (
                            <div key={idx} className="space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                {group.category || "Inclusions"} ({group.items.length})
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {group.items.map((item, itemIdx) => (
                                   <div key={itemIdx} className="flex items-center justify-between gap-2 bg-slate-50/60 border border-slate-100/80 rounded px-3 py-1.5 text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Check size={11} className="text-emerald-600 shrink-0" />
                                      <span className="font-medium text-slate-800 truncate">{item.name}</span>
                                    </div>
                                    {item.qty && (
                                      <span className="text-[10.5px] font-mono font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200/60 shrink-0">
                                        Qty: {item.qty}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : quote.had_package_selection ? (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-md flex items-center gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                  <span>The selected package is no longer active in the catalog.</span>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-md flex items-center gap-2.5 text-slate-600 text-xs">
                  <PackageIcon className="text-slate-400 shrink-0" size={16} />
                  <div>
                    <span className="font-bold text-slate-800">Custom Request</span>
                    <span className="text-slate-500 ml-1">— No package selected.</span>
                  </div>
                </div>
              )}
            </SectionContainer>

            {/* 3. Food & Services */}
            <SectionContainer 
              title={
                quote.service_type === "Event Setup Only"
                  ? "Add-ons & Equipment"
                  : "Food & Services"
              }
              icon={quote.service_type === "Event Setup Only" ? Layers : Utensils}
            >
              <div className="space-y-4">
                {/* Special Offer / Combo Meal courses if present */}
                {isOffer && offerCourses.length > 0 && (
                  <div className="space-y-2 pb-3.5 border-b border-slate-100">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">
                        Combo Courses
                      </span>
                      {offerPerPax > 0 && (
                        <span className="text-xs font-semibold text-slate-600 font-mono">
                          {formatCurrency(offerPerPax)}/pax {offerBase > 0 && `(Total: ${formatCurrency(offerBase)})`}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {offerCourses.map((course, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 bg-slate-50/70 border border-slate-100 rounded px-3 py-1.5 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:w-36 shrink-0">
                            {course.category}
                          </span>
                          <span className="font-medium text-slate-800">
                            {course.items.join(", ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Selected Menu */}
                {quote.service_type !== "Event Setup Only" && Array.isArray(quote.selected_menu) && quote.selected_menu.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">
                        Menu ({quote.selected_menu.length})
                      </span>
                      {quote.selected_menu.length > 6 && (
                        <button
                          onClick={() => setShowAllMenu(!showAllMenu)}
                          className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                        >
                          {showAllMenu ? "Show less" : `View all (${quote.selected_menu.length})`}
                          {showAllMenu ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(showAllMenu ? quote.selected_menu : quote.selected_menu.slice(0, 6)).map((menu, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded px-3 py-2 text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">
                            {menu?.name || (typeof menu === 'string' ? menu : "Menu Item")}
                          </span>
                          {menu?.price > 0 && (
                            <span className="font-mono font-semibold text-slate-600 shrink-0">
                              ₱{menu.price}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add-ons & Extra Services */}
                {((Array.isArray(quote.service_items) && quote.service_items.length > 0) || (Array.isArray(quote.additional_services) && quote.additional_services.length > 0)) && (
                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block">
                      Add-ons
                    </span>
                    <div className="space-y-1.5">
                      {Array.isArray(quote.service_items) && quote.service_items.map((svc, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded px-3 py-2 text-xs">
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-slate-800 block truncate">{svc?.name || "Add-on"}</span>
                            {svc?.description && <span className="text-[11px] text-slate-400 block truncate">{svc.description}</span>}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-semibold text-slate-700">
                              {svc?.price > 0 ? `₱${svc.price}` : "Selected"} 
                              {svc?.quantity > 1 && <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">x{svc.quantity}</span>}
                            </span>
                          </div>
                        </div>
                      ))}
                      {Array.isArray(quote.additional_services) && quote.additional_services.map((svcName, i) => (
                        <div key={`add-${i}`} className="flex justify-between items-center bg-slate-50/80 border border-slate-100 rounded px-2.5 py-1.5 text-xs">
                          <span className="font-medium text-slate-800">{svcName}</span>
                          <span className="text-[10px] font-mono font-semibold text-slate-500 px-2 py-0.5 bg-white rounded border border-slate-200">Selected Service</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipment & Inventory Items */}
                {Array.isArray(quote.inventory_items) && quote.inventory_items.length > 0 && (
                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block">
                      Equipment
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {quote.inventory_items.map((inv, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded px-3 py-2 text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">{inv?.name || "Inventory Item"}</span>
                          <span className="font-mono font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">Qty: {inv?.quantity || 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {offerCourses.length === 0 &&
                 (!Array.isArray(quote.selected_menu) || quote.selected_menu.length === 0) &&
                 (!Array.isArray(quote.service_items) || quote.service_items.length === 0) &&
                 (!Array.isArray(quote.additional_services) || quote.additional_services.length === 0) &&
                 (!Array.isArray(quote.inventory_items) || quote.inventory_items.length === 0) && (
                  <p className="text-xs text-slate-400 italic">
                    {quote.service_type === "Event Setup Only"
                      ? "No add-ons selected."
                      : "No menu items selected."}
                  </p>
                )}
              </div>
            </SectionContainer>

            {/* 4. Preferences */}
            <SectionContainer title="Preferences" icon={HeartPulse}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <DataField icon={DollarSign} label="Budget">
                    {quote.budget_range ? (
                      <span className="text-emerald-800 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        {quote.budget_range}
                      </span>
                    ) : null}
                  </DataField>

                  <DataField icon={ShieldAlert} label="Allergies">
                    {quote.allergies ? (
                      <span className="text-red-800 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200 text-xs">
                        {quote.allergies}
                      </span>
                    ) : null}
                  </DataField>

                  <DataField icon={Info} label="Dietary">
                    {(quote.dietary_restrictions || quote.dietary_requirements) ? (
                      <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                        {quote.dietary_restrictions || quote.dietary_requirements}
                      </span>
                    ) : null}
                  </DataField>
                </div>

                {quote.delivery_instructions && (
                  <div className="bg-slate-50/60 p-3.5 rounded-md border border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                      Delivery Notes
                    </span>
                    <p className="text-slate-700 leading-snug font-normal">{quote.delivery_instructions}</p>
                  </div>
                )}

                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Special Requests
                  </span>
                  {quote.special_requests ? (
                    <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {quote.special_requests}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">None provided.</p>
                  )}
                </div>
              </div>
            </SectionContainer>

          </div>

          {/* Right / Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Customer Card */}
            <SectionContainer title="Customer" icon={User}>
              <div className="space-y-3.5">
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-primary/20">
                    {(quote.contact_first_name?.[0] || "").toUpperCase()}
                    {(quote.contact_last_name?.[0] || "").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">
                      {quote.contact_first_name} {quote.contact_last_name}
                    </h3>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <a 
                      href={`mailto:${quote.contact_email}`} 
                      className="text-primary hover:underline font-medium truncate"
                      title={quote.contact_email}
                    >
                      {quote.contact_email}
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <a 
                      href={`tel:${quote.contact_phone}`} 
                      className="hover:text-slate-900 font-medium"
                    >
                      {quote.contact_phone}
                    </a>
                  </div>

                  {quote.contact_alt_phone && (
                    <div className="flex items-center gap-2.5 text-slate-500 min-w-0">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{quote.contact_alt_phone} (Alt)</span>
                    </div>
                  )}
                </div>
              </div>
            </SectionContainer>

            {/* Next Steps Card */}
            <div className="bg-slate-900 rounded-lg p-5 text-white shadow-sm border border-slate-800 space-y-4">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                  <Activity size={13} className="text-primary-400" /> Next Steps
                </h3>
                <p className="text-[11.5px] text-slate-400 leading-normal">
                  Review request and prepare quotation.
                </p>
              </div>

              {/* Linear Stepper */}
              <div className="space-y-3 text-xs pt-1">
                {/* Step 1: Review Request */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isPendingReview
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-500 text-white"
                  }`}>
                    {isPendingReview ? "1" : <Check size={10} />}
                  </div>
                  <span className={isPendingReview ? "font-semibold text-white" : "text-slate-300"}>
                    Review Request
                  </span>
                </div>

                {/* Step 2: Generate Quote */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isRevisionRequested
                      ? "bg-orange-500 text-white"
                      : isQuotationSent || isAccepted || isConverted
                      ? "bg-emerald-500 text-white"
                      : isPendingReview
                      ? "bg-slate-800 text-slate-400 border border-slate-700"
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {isQuotationSent || isAccepted || isConverted ? <Check size={10} /> : "2"}
                  </div>
                  <span className={isRevisionRequested ? "font-semibold text-orange-200" : isQuotationSent ? "text-slate-300" : "text-slate-400"}>
                    Issue Quotation
                  </span>
                </div>

                {/* Step 3: Await Acceptance / Booking */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isConverted
                      ? "bg-emerald-500 text-white"
                      : isAccepted
                      ? "bg-purple-500 text-white"
                      : isQuotationSent
                      ? "bg-blue-500 text-white"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    {isConverted ? <Check size={10} /> : "3"}
                  </div>
                  <span className={isAccepted ? "font-semibold text-purple-200" : isQuotationSent ? "font-semibold text-blue-200" : "text-slate-400"}>
                    Convert Booking
                  </span>
                </div>
              </div>

              {!isConverted && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="w-full mt-2 py-2 px-3 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white text-xs font-semibold rounded-md shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Activity size={13} />
                  <span>{primaryActionLabel}</span>
                </button>
              )}
            </div>

            {/* Quick Record Details Card */}
            <div className="bg-slate-50/70 rounded-lg p-4 border border-slate-200/80 text-xs space-y-2.5 text-slate-600">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Timeline
              </span>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-400">Received:</span>
                <span className="font-mono font-medium text-slate-700">{formatShortDate(quote.createdAt)}</span>
              </div>
              {quote.updatedAt && quote.updatedAt !== quote.createdAt && (
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-slate-400">Updated:</span>
                  <span className="font-mono font-medium text-slate-700">{formatShortDate(quote.updatedAt)}</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      {showConvertModal && quote && (
        <QuotationBuilderModal 
          inquiry={quote} 
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => {
            setShowConvertModal(false);
            window.location.reload();
          }}
        />
      )}

      {showConfirmConvert && (
        <ConvertBookingModal
          quote={quote}
          isDepositPaidProp={isDepositPaid}
          submitting={submitting}
          onClose={() => setShowConfirmConvert(false)}
          onConfirm={(managerId, bypassDeposit = false) => {
            setSubmitting(true);
            AdminAPI.createBookingFromInquiry(quote._id, {
              event_manager_id: managerId,
              bypass_deposit: bypassDeposit,
            })
              .then(() => {
                notify("Quotation converted to booking successfully with assigned manager!", "success");
                setShowConfirmConvert(false);
                navigate("/admin/bookings/reservations");
              })
              .catch((err) => {
                notify(err.response?.data?.message || "Failed to convert booking.", "error");
              })
              .finally(() => setSubmitting(false));
          }}
        />
      )}

    </AdminLayout>
  );
}
