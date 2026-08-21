import { useEffect, useState } from "react";
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
  Truck, Check, ShieldAlert, HeartPulse, ChevronRight
} from "lucide-react";
import Badge from "../../components/admin/ui/Badge";
import { pendingChangeRequestOf } from "../../utils/quotationDiff";
import { priceLabel, capacityLabel } from "../../lib/packageDisplay";
import { formatCurrency, formatShortDate } from "../../utils/format";
import { menuAmountLabel, menuLineTotal, addOnLineTotal } from "../../utils/quotationPricing";
import { eventSpaceLabel } from "../../lib/packageDisplay";

/* --- Compact Reusable Card Component --- */
const CompactCard = ({ title, icon: Icon, children, headerRight, className = "" }) => (
  <div className={`bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden ${className}`}>
    <div className="bg-slate-50/70 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 bg-white rounded-md shadow-2xs border border-slate-200/80 text-primary shrink-0">
          <Icon size={14} />
        </div>
        <h3 className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight truncate">{title}</h3>
      </div>
      {headerRight && <div className="shrink-0">{headerRight}</div>}
    </div>
    <div className="p-3.5 sm:p-4">
      {children}
    </div>
  </div>
);

/* --- Compact Info Grid Field --- */
const CompactField = ({ icon: Icon, label, value, children, span = "col-span-1" }) => (
  <div className={`bg-slate-50/60 rounded-lg p-2 sm:p-2.5 border border-slate-100/90 flex flex-col justify-between ${span}`}>
    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
      {Icon && <Icon size={12} className="shrink-0 text-slate-400" />}
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 truncate">{label}</span>
    </div>
    <div className="text-xs sm:text-[13px] font-semibold text-slate-800 break-words leading-snug">
      {children || value || <span className="text-slate-300 font-normal italic">Not specified</span>}
    </div>
  </div>
);

/* --- One money line in the quotation summary --- */
const MoneyLine = ({ label, detail, value, strong, deduct }) => (
  <div className="flex items-baseline justify-between gap-4 text-xs">
    <span className={`min-w-0 ${strong ? "font-semibold text-slate-900" : "text-slate-600"}`}>
      {label}
      {detail && <span className="ml-1 text-slate-400">{detail}</span>}
    </span>
    <span
      className={`shrink-0 tabular-nums ${
        deduct ? "text-emerald-700" : strong ? "font-bold text-slate-900" : "font-semibold text-slate-800"
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * The quotation as it stands right now.
 *
 * The page used to describe the inquiry and nothing else, which made the
 * original request look like the current state of the deal: an admin
 * reading it after two revisions saw the dishes and the estimate the
 * customer submitted weeks ago, with no sign of what had actually been
 * quoted since. The inquiry is still below, unchanged and labelled as the
 * original — this card is what is true today.
 */
function CurrentQuotationCard({ quotation, versionCount, hasDraft }) {
  const expiry = quotation.expiration_date ? new Date(quotation.expiration_date) : null;
  const expired =
    expiry &&
    !Number.isNaN(expiry.getTime()) &&
    new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()) <
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  // An expired quotation reads red because it is the one state on this chip
  // that needs acting on; a live one stays a neutral date stamp.
  const expiryChipTone = expired
    ? "bg-red-50 text-red-800"
    : "bg-slate-100 text-slate-700";

  const guests = Number(quotation.guest_count) || 1;
  const dishes = Array.isArray(quotation.menu_items) ? quotation.menu_items : [];
  const addOns = Array.isArray(quotation.add_ons) ? quotation.add_ons : [];
  const fees = Array.isArray(quotation.additional_fees) ? quotation.additional_fees : [];
  // Inclusions quoted at a different quantity than the package states. Only
  // the ones that actually moved money are worth naming.
  const adjustments = (
    Array.isArray(quotation.inclusion_adjustments) ? quotation.inclusion_adjustments : []
  ).filter((entry) => entry?.name && Number(entry?.amount));
  const menuSubtotal = dishes.reduce((sum, item) => sum + menuLineTotal(item, guests), 0);
  const addOnsSubtotal = addOns.reduce((sum, item) => sum + addOnLineTotal(item), 0);

  return (
    <CompactCard
      title="Current quotation"
      icon={FileText}
      headerRight={
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-primary">
            v{Number(quotation.version_number) || 1}
          </span>
          {versionCount > 1 && (
            <span className="text-[10.5px] font-medium text-slate-400">of {versionCount}</span>
          )}
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="font-mono font-semibold text-slate-700">
            {quotation.quotation_number || "QTN"}
          </span>
          <span>Issued {formatShortDate(quotation.createdAt)}</span>
          <span className={`rounded px-1.5 py-0.5 font-semibold ${expiryChipTone}`}>
            {expiry
              ? `${expired ? "Expired" : "Valid until"} ${formatShortDate(quotation.expiration_date)}`
              : "No expiry set"}
          </span>
          {hasDraft && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
              Newer draft not sent
            </span>
          )}
        </div>

        {/* What is being charged, in the order the builder priced it. */}
        <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <MoneyLine
            label={quotation.package_name || "Package"}
            detail={
              adjustments.length > 0
                ? `(${adjustments.length} quantity ${adjustments.length === 1 ? "change" : "changes"})`
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
              label="Add-ons and services"
              detail={`(${addOns.length})`}
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
          <div className="mt-1 border-t border-slate-200 pt-1.5">
            <MoneyLine label="Quoted total" value={formatCurrency(quotation.total_cost)} strong />
            <MoneyLine label="Deposit to confirm" value={formatCurrency(quotation.deposit_amount)} />
            <MoneyLine label="Balance before event" value={formatCurrency(quotation.remaining_balance)} />
          </div>
        </div>

        {adjustments.length > 0 && (
          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Inclusion quantity changes ({adjustments.length})
            </span>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {adjustments.map((entry, i) => {
                const amount = Number(entry.amount) || 0;
                return (
                  <li key={i} className="flex items-baseline justify-between gap-3 px-2.5 py-2">
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-800">{entry.name}</span>
                      <span className="mt-0.5 block text-[11px] tabular-nums text-slate-500">
                        {entry.quantity} instead of {entry.base_quantity} · at{" "}
                        {formatCurrency(entry.unit_price)} each
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold tabular-nums ${
                        amount < 0 ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {amount < 0 ? "− " : "+ "}
                      {formatCurrency(Math.abs(amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* The quoted dishes, showing exactly what the customer's copy shows:
            quantity and unit, the rate, the line total and the dish's note. */}
        {dishes.length > 0 && (
          <div>
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quoted dishes ({dishes.length})
            </span>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {dishes.map((dish, i) => {
                const byQuantity = dish.pricing_type === "quantity";
                const units = byQuantity ? Math.max(1, Number(dish.quantity) || 1) : guests;
                const basis = byQuantity
                  ? `${units} × ${formatCurrency(dish.price)}`
                  : `${units} guests × ${formatCurrency(dish.price)} per guest`;
                return (
                  <li key={i} className="flex items-baseline justify-between gap-3 px-2.5 py-2">
                    <div className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="text-xs font-semibold text-slate-800">{dish.name}</span>
                        {dish.category && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {dish.category}
                          </span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            byQuantity
                              ? "bg-violet-50 text-violet-700"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {byQuantity ? menuAmountLabel(dish) : "Per guest"}
                        </span>
                      </span>
                      {Number(dish.price) > 0 && (
                        <span className="mt-0.5 block text-[11px] tabular-nums text-slate-500">
                          {basis}
                        </span>
                      )}
                      {dish.note && (
                        <span className="mt-1 block border-l-2 border-slate-200 pl-2 text-[11px] italic text-slate-500">
                          {dish.note}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
                      {formatCurrency(menuLineTotal(dish, guests))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {quotation.admin_notes && (
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Notes sent to the customer
            </span>
            <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-slate-700">
              {quotation.admin_notes}
            </p>
          </div>
        )}
      </div>
    </CompactCard>
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
  
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await AdminAPI.getInquiry(id);
        if (isMounted) setQuote(res.data);

        // The customer's change request is stored on the quotation
        // (customer_response), not the inquiry — load the versions so the
        // admin can read what was actually asked for.
        try {
          const qRes = await AdminAPI.getQuotationsByInquiry(id);
          if (isMounted) setQuotations(qRes.data || []);
        } catch {
          if (isMounted) setQuotations([]);
        }
      } catch (err) {
        notify(err.response?.data?.message || "Could not load quote details.", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [id, notify]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-medium animate-pulse">Loading inquiry details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!quote) {
    return (
      <AdminLayout>
        <div className="p-8 max-w-md mx-auto text-center bg-white rounded-xl border border-slate-200 shadow-xs my-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
            <Info size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Inquiry Not Found</h2>
          <p className="text-xs text-slate-500 mb-5">The inquiry you are looking for does not exist or has been deleted.</p>
          <button 
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-xs font-semibold shadow-xs transition-colors" 
            onClick={() => navigate("/admin/bookings/inquiries")}
          >
            Return to Inquiries
          </button>
        </div>
      </AdminLayout>
    );
  }

  // A saved draft leaves the inquiry's status untouched, so without this the
  // only way to discover unfinished work would be to open the builder.
  const hasDraft = quotations.some((q) => q.status === "Draft");

  /**
   * The version the customer is holding: the newest one actually issued.
   *
   * A draft is excluded because nobody outside this office has seen it, so
   * it cannot be what the deal currently is. The existing revision records
   * are used as they stand — no parallel "current quotation" is stored
   * anywhere, this is just the newest row read back.
   */
  const issuedVersions = quotations
    .filter((q) => q.status !== "Draft")
    .sort((a, b) => (Number(b.version_number) || 1) - (Number(a.version_number) || 1));
  const currentQuotation = issuedVersions[0] || null;
  const isPendingReview = ["Pending Review", "Under Review", "Waiting for Customer"].includes(quote.status);
  const isRevisionRequested = quote.status === "Revision Requested";
  const isQuotationSent = quote.status === "Quotation Sent";
  const isAccepted = ["Quote Accepted", "Awaiting Final Confirmation"].includes(quote.status);
  const isConverted = quote.status === "Converted to Booking";

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-4 pb-8">
        
        {/* --- Header Section --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div>
            <button 
              onClick={() => navigate("/admin/bookings/inquiries")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1.5 transition-colors"
            >
              <ArrowLeft size={13} />
              Back to Inquiries
            </button>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Named after what the record has become. Before a quotation
                  exists this page really is just the inquiry; once one has
                  been issued, the quotation is the live document and the
                  inquiry below it is the archived original. */}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {currentQuotation ? "Quotation" : "Inquiry Details"}
              </h1>
              <Badge status={quote.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono mt-1">
              <span className="flex items-center gap-1">
                <FileText size={12} className="text-slate-400" /> REF: {quote.reference || quote._id}
              </span>
              {quote.createdAt && (
                <span className="text-slate-400">
                  • {new Date(quote.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {quote.service_type && (
                <span className="font-sans font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {quote.service_type}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all cursor-pointer"
                onClick={() => setShowConvertModal(true)}
              >
                <Activity size={14} className="text-primary-400" />
                {hasDraft
                  ? "Resume Draft Quotation"
                  : isPendingReview
                  ? "Create Quotation"
                  : isRevisionRequested
                  ? "Revise Quotation"
                  : isQuotationSent
                  ? "Edit Quotation"
                  : "Create Quotation"}
              </button>
            )}
            {quote.converted_booking_id && (
              <button 
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
                onClick={() => navigate(`/admin/bookings/${quote.converted_booking_id}/details`)}
              >
                <CheckCircle2 size={14} />
                View Confirmed Booking
              </button>
            )}
          </div>
        </div>

        {/* --- Contextual Status Banners (Compact) --- */}
        {hasDraft && (
          <div className="p-3 sm:p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-amber-500 text-white rounded-md shrink-0">
                <FileText size={15} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm leading-tight">Unfinished Quotation Draft</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Someone started this quotation and saved it without sending. The customer has not seen it.
                </p>
              </div>
            </div>
          </div>
        )}

        {isQuotationSent && (
          <div className="p-3 sm:p-3.5 bg-blue-50/90 border border-blue-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-blue-600 text-white rounded-md shrink-0">
                <Send size={15} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-blue-950 text-xs sm:text-sm leading-tight">Formal Quotation Sent to Customer</h4>
                <p className="text-[11px] text-blue-700 mt-0.5">Quotation issued to {quote.contact_first_name} {quote.contact_last_name}. Awaiting customer response.</p>
              </div>
            </div>
          </div>
        )}

        {isPendingReview && (
          <div className="p-3 sm:p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-amber-500 text-white rounded-md shrink-0">
                <Clock size={15} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm leading-tight">Action Needed: Quotation Pending</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">This customer inquiry is awaiting pricing calculations and a formal quotation.</p>
              </div>
            </div>
          </div>
        )}

        {isRevisionRequested && (() => {
          const request = pendingChangeRequestOf(quotations);
          const nextVersion = (quotations.reduce(
            (max, q) => Math.max(max, Number(q.version_number) || 1), 0
          ) || 1) + 1;

          return (
            <div className="p-3 sm:p-3.5 bg-orange-50/90 border border-orange-200/90 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-orange-500 text-white rounded-md shrink-0">
                    <RefreshCw size={15} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-orange-950 text-xs sm:text-sm leading-tight">
                      Pending Change Request &middot; next is v{nextVersion}
                    </h4>
                    <p className="text-[11px] text-orange-700 mt-0.5">
                      {request?.version_number
                        ? `Requested against quotation v${request.version_number}`
                        : "Requested against the issued quotation"}
                      {(() => {
                        const dateStr = request?.revision_requested_at || request?.updatedAt;
                        if (!dateStr) return null;
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return null;
                        return (
                          <> · {d.toLocaleString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "numeric", minute: "2-digit",
                          })}</>
                        );
                      })()}
                    </p>
                  </div>
              </div>

              {request?.customer_response ? (
                <blockquote className="mt-2.5 rounded-lg border border-orange-200/80 bg-white/80 px-3 py-2 text-xs text-slate-800 leading-relaxed">
                  <span className="font-semibold text-orange-900">Customer message: </span>“{request.customer_response}”
                </blockquote>
              ) : (
                <p className="mt-2 text-[11px] text-orange-700 italic">
                  The customer did not include a written message with this request.
                </p>
              )}
            </div>
          );
        })()}

        {isAccepted && (
          <div className="p-3 sm:p-3.5 bg-purple-50/90 border border-purple-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-purple-600 text-white rounded-md shrink-0">
                <CheckCircle2 size={15} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-purple-950 text-xs sm:text-sm leading-tight">Customer Accepted & Awaiting Final Confirmation</h4>
                <p className="text-[11px] text-purple-700 mt-0.5">The customer accepted this quotation. Convert it to a confirmed reservation.</p>
              </div>
            </div>
            <button
              onClick={() => setShowConfirmConvert(true)}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <CheckCircle2 size={13} /> Confirm & Convert to Booking
            </button>
          </div>
        )}

        {/* --- Two-Column Layout Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Main Column (8 of 12) */}
          <div className="lg:col-span-8 space-y-4">

            {currentQuotation && (
              <CurrentQuotationCard
                quotation={currentQuotation}
                versionCount={issuedVersions.length}
                hasDraft={hasDraft}
              />
            )}

            {/* Everything below is the inquiry: the request exactly as the
                customer submitted it. It is deliberately never rewritten
                when a quotation is revised, so the two can be compared —
                which only works if the reader is told which is which. */}
            {currentQuotation && (
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
                <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <p className="text-[11.5px] leading-relaxed text-slate-600">
                  <span className="font-bold text-slate-800">Original customer request.</span>{" "}
                  What was submitted with this booking, kept for reference. The quotation above is
                  the current quoted version — where they differ, the quotation is what stands.
                </p>
              </div>
            )}

            {/* Selected Package Card */}
            <CompactCard title="Selected Package" icon={PackageIcon}>
              {quote.package_id && typeof quote.package_id === "object" ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200/70">
                    <div className="flex items-center gap-3 min-w-0">
                      {quote.package_id.image_url ? (
                        <img
                          src={quote.package_id.image_url}
                          alt={quote.package_id.name}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20">
                          <PackageIcon size={22} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                          {quote.package_id.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {quote.package_id.package_type && (
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10.5px] font-semibold">
                              {quote.package_id.package_type}
                            </span>
                          )}
                          {quote.package_id.event_type && (
                            <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10.5px] font-medium">
                              {quote.package_id.event_type}
                            </span>
                          )}
                          {capacityLabel(quote.package_id) && (
                            <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                              <Users size={11} className="text-slate-400" />
                              {capacityLabel(quote.package_id)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/80 shrink-0">
                      <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold block">
                        Base Pricing
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {priceLabel(quote.package_id)}
                      </span>
                    </div>
                  </div>

                  {quote.package_id.description && (
                    <p className="text-xs text-slate-600 leading-relaxed px-1">
                      {quote.package_id.description}
                    </p>
                  )}

                  {Array.isArray(quote.package_id.inclusions) && quote.package_id.inclusions.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">
                        Inclusions ({quote.package_id.inclusions.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {quote.package_id.inclusions.map((inc, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md text-slate-700 border border-slate-200/60 text-xs font-medium">
                            <Check size={11} className="text-emerald-600 shrink-0" />
                            <span>{inc}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : quote.had_package_selection ? (
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg flex items-center gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                  <span>The selected package is no longer active or available in the catalog.</span>
                </div>
              ) : (
                <div className="p-2.5 sm:p-3 bg-slate-50/70 border border-slate-200/70 rounded-lg flex items-center gap-2.5 text-slate-600">
                  <PackageIcon className="text-slate-400 shrink-0" size={16} />
                  <div className="text-xs leading-tight">
                    <span className="font-bold text-slate-800">Custom Inquiry (No Preset Package Chosen)</span>
                    <span className="text-slate-500 block sm:inline sm:ml-1">— Client requested custom event pricing.</span>
                  </div>
                </div>
              )}
            </CompactCard>

            {/* Event Specifics Card */}
            <CompactCard title="Event Specifics" icon={Calendar}>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
                <CompactField 
                  icon={Layers} 
                  label="Service Type" 
                  value={quote.service_type || (quote.include_food === false ? "Event Setup Only" : "Food and Event Setup")} 
                />
                
                <CompactField 
                  icon={Utensils} 
                  label="Event Type" 
                  value={quote.event_type} 
                />
                
                <CompactField 
                  icon={Users} 
                  label="Guest Count" 
                  value={quote.guest_count ? `${quote.guest_count} Pax` : null} 
                />
                
                <CompactField 
                  icon={Calendar} 
                  label="Event Date"
                >
                  {(() => {
                    const d = quote.event_date ? new Date(quote.event_date) : null;
                    if (d && !isNaN(d.getTime())) {
                      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                    }
                    return null;
                  })()}
                </CompactField>

                <CompactField
                  icon={Clock}
                  label="Time & Duration"
                  value={
                    quote.start_time
                      ? `${quote.start_time}${quote.duration_hours ? ` (${quote.duration_hours} hrs)` : ""}`
                      : null
                  }
                />

                <CompactField icon={Calendar} label="Theme / Motif">
                  {quote.event_theme ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{quote.event_theme}</span>
                      {(Array.isArray(quote.event_palette) ? quote.event_palette : []).map((colour) => (
                        <span key={colour} className="rounded border border-slate-200 bg-white px-1.5 py-0.2 text-[10px] font-normal text-slate-600">
                          {colour}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </CompactField>

                <CompactField icon={DollarSign} label="Customer Estimate">
                  {quote.estimated_total > 0 ? (
                    <span>
                      ₱{Number(quote.estimated_total).toLocaleString("en-PH")}
                    </span>
                  ) : null}
                </CompactField>

                <CompactField 
                  icon={Truck} 
                  label="Delivery Method" 
                  value={quote.delivery_method ? quote.delivery_method.toUpperCase() : null} 
                />

                <CompactField 
                  icon={MapPin} 
                  label="Venue Type" 
                  value={quote.venue_type} 
                />

                {/* One field, not two: "event space size" and "scaffold size"
                    are the same measurement under two names. */}
                <CompactField
                  icon={Ruler}
                  label="Event Space / Scaffold Size"
                  value={eventSpaceLabel(quote, quote.package_id) || null}
                />

                <CompactField 
                  icon={MapPin} 
                  label="Full Address" 
                  span="col-span-2 sm:col-span-2 xl:col-span-3"
                >
                  {quote.street || quote.barangay || quote.municipality || quote.province ? (
                    <span className="leading-snug">
                      {[quote.street, quote.barangay, quote.municipality, quote.province].filter(Boolean).join(", ")}
                      {quote.zip_code && ` (${quote.zip_code})`}
                      {quote.landmark && ` • Landmark: ${quote.landmark}`}
                    </span>
                  ) : null}
                </CompactField>
              </div>
            </CompactCard>

            {/* Food & Service Order Details Card */}
            {/* "Requested" once a quotation exists, because by then this list
                and the quoted dishes above are two different things and the
                title is the only place to say so. */}
            <CompactCard
              title={`${currentQuotation ? "Requested " : ""}${
                quote.service_type === "Event Setup Only"
                  ? "Add-ons & Equipment Services"
                  : "Food & Service Order"
              }`}
              icon={quote.service_type === "Event Setup Only" ? Layers : Utensils}
            >
              <div className="space-y-3">
                {quote.service_type !== "Event Setup Only" && Array.isArray(quote.selected_menu) && quote.selected_menu.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                      Selected Menu ({quote.selected_menu.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {quote.selected_menu.map((menu, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/80 border border-slate-100 rounded-md px-2.5 py-1.5 text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">
                            {menu?.name || (typeof menu === 'string' ? menu : "Menu Item")}
                          </span>
                          {menu?.price > 0 && <span className="font-semibold text-slate-600 shrink-0">₱{menu.price}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {((Array.isArray(quote.service_items) && quote.service_items.length > 0) || (Array.isArray(quote.additional_services) && quote.additional_services.length > 0)) && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                      Add-ons &amp; Additional Services
                    </span>
                    <div className="space-y-1.5">
                      {Array.isArray(quote.service_items) && quote.service_items.map((svc, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/80 border border-slate-100 rounded-md px-2.5 py-1.5 text-xs">
                          <div className="min-w-0 pr-2">
                            <span className="font-medium text-slate-800 block truncate">{svc?.name || "Add-on"}</span>
                            {svc?.description && <span className="text-[11px] text-slate-400 block truncate">{svc.description}</span>}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-semibold text-slate-700">
                              {svc?.price > 0 ? `₱${svc.price}` : "Selected"} 
                              {svc?.quantity > 1 && <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">x{svc.quantity}</span>}
                            </span>
                          </div>
                        </div>
                      ))}
                      {Array.isArray(quote.additional_services) && quote.additional_services.map((svcName, i) => (
                        <div key={`add-${i}`} className="flex justify-between items-center bg-slate-50/80 border border-slate-100 rounded-md px-2.5 py-1.5 text-xs">
                          <span className="font-medium text-slate-800">{svcName}</span>
                          <span className="text-[10px] font-semibold text-slate-500 px-2 py-0.5 bg-white rounded border border-slate-200">Selected Service</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(quote.inventory_items) && quote.inventory_items.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                      Equipment &amp; Inventory Allocation
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {quote.inventory_items.map((inv, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/80 border border-slate-100 rounded-md px-2.5 py-1.5 text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">{inv?.name || "Inventory Item"}</span>
                          <span className="font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">Qty: {inv?.quantity || 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!Array.isArray(quote.selected_menu) || quote.selected_menu.length === 0) &&
                 (!Array.isArray(quote.service_items) || quote.service_items.length === 0) &&
                 (!Array.isArray(quote.additional_services) || quote.additional_services.length === 0) &&
                 (!Array.isArray(quote.inventory_items) || quote.inventory_items.length === 0) && (
                  <p className="text-xs text-slate-400 italic">
                    {quote.service_type === "Event Setup Only"
                      ? "No custom add-ons requested beyond package setup inclusions."
                      : "No specific menu items or add-ons selected."}
                  </p>
                )}
              </div>
            </CompactCard>

            {/* Preferences & Special Requests Card */}
            <CompactCard title="Preferences & Special Requests" icon={HeartPulse}>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <CompactField icon={DollarSign} label="Budget Range">
                    {quote.budget_range ? (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-xs">
                        {quote.budget_range}
                      </span>
                    ) : null}
                  </CompactField>

                  <CompactField icon={ShieldAlert} label="Allergies">
                    {quote.allergies ? (
                      <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-100 text-xs">
                        {quote.allergies}
                      </span>
                    ) : null}
                  </CompactField>

                  <CompactField icon={Info} label="Dietary Restrictions">
                    {(quote.dietary_restrictions || quote.dietary_requirements) ? (
                      <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-xs">
                        {quote.dietary_restrictions || quote.dietary_requirements}
                      </span>
                    ) : null}
                  </CompactField>
                </div>

                {quote.delivery_instructions && (
                  <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                      Delivery Instructions
                    </span>
                    <span className="text-slate-700 leading-snug">{quote.delivery_instructions}</span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Additional Notes &amp; Special Requests
                  </span>
                  {quote.special_requests ? (
                    <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {quote.special_requests}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No special requests provided.</p>
                  )}
                </div>
              </div>
            </CompactCard>

          </div>

          {/* Sidebar Column (4 of 12) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Customer Profile Card */}
            <CompactCard title="Customer Profile" icon={User}>
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-primary/20">
                    {(quote.contact_first_name?.[0] || "").toUpperCase()}
                    {(quote.contact_last_name?.[0] || "").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
                      {quote.contact_first_name} {quote.contact_last_name}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">Primary Contact</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
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

                  {quote.contact_method && (
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Preferred Contact:</span>
                      <span className="font-semibold text-slate-700 capitalize">{quote.contact_method}</span>
                    </div>
                  )}
                </div>
              </div>
            </CompactCard>

            {/* Next Steps & Workflow Sidebar Card */}
            <div className="bg-slate-900 rounded-xl p-4 text-white shadow-xs border border-slate-800 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/20 rounded-full blur-xl pointer-events-none"></div>
              
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Activity size={13} className="text-primary-400" /> Next Steps
              </h3>
              <p className="text-[11.5px] text-slate-400 mb-3.5 leading-normal">
                Review requirements and proceed with quotation calculation.
              </p>
              
              <div className="space-y-2.5 text-xs">
                {/* Step 1 */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isPendingReview
                      ? "bg-amber-500 text-white animate-pulse"
                      : "bg-emerald-500 text-white"
                  }`}>
                    {isPendingReview ? "1" : <Check size={10} />}
                  </div>
                  <span className={isPendingReview ? "font-semibold text-white" : "text-slate-300"}>
                    Review Request
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isRevisionRequested
                      ? "bg-orange-500 text-white animate-pulse"
                      : isQuotationSent || isAccepted || isConverted
                      ? "bg-emerald-500 text-white"
                      : isPendingReview
                      ? "bg-slate-800 text-slate-400 border border-slate-700"
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {isQuotationSent || isAccepted || isConverted ? <Check size={10} /> : "2"}
                  </div>
                  <span className={isRevisionRequested ? "font-semibold text-orange-200" : isQuotationSent ? "text-slate-300" : "text-slate-400"}>
                    Generate Quote
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isConverted
                      ? "bg-emerald-500 text-white"
                      : isAccepted
                      ? "bg-purple-500 text-white animate-pulse"
                      : isQuotationSent
                      ? "bg-blue-500 text-white animate-pulse"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    {isConverted ? <Check size={10} /> : "3"}
                  </div>
                  <span className={isAccepted ? "font-semibold text-purple-200" : isQuotationSent ? "font-semibold text-blue-200" : "text-slate-400"}>
                    Await Acceptance / Confirm
                  </span>
                </div>
              </div>

              {!isConverted && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="w-full mt-3.5 py-1.5 px-3 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Activity size={13} />
                  {isRevisionRequested ? "Revise Quotation" : "Open Quotation Builder"}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

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
          submitting={submitting}
          onClose={() => setShowConfirmConvert(false)}
          onConfirm={(managerId) => {
            setSubmitting(true);
            AdminAPI.createBookingFromInquiry(quote._id, { event_manager_id: managerId })
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

