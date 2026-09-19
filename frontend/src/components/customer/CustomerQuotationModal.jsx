import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import {
  CheckCircle2,
  RefreshCw,
  XCircle,
  Clock,
  AlertCircle,
  Truck,
  Package as PackageIcon,
  Sparkles,
  FileCheck2,
  Printer,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Users,
  UtensilsCrossed,
  MessageSquareQuote,
  Check,
  ArrowRight,
} from "lucide-react";
import InvoiceModal from "../common/invoice/InvoiceModal";
import useBusinessInfo from "../../hooks/useBusinessInfo";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { useConfirm } from "../feedback/confirmContext";
import InlineMessage from "../feedback/InlineMessage";
import { cn } from "@/lib/utils";
import StatusPill from "./portal/StatusPill";
import StateNotice from "./portal/StateNotice";
import { resolveServiceType } from "./portal/statusMeta";
import { formatCurrency, formatEventDate, formatShortDate, formatTime } from "../../utils/format";
import {
  MENU_PRICING,
  addOnLineTotal,
  addOnQuantityOf,
  menuLineTotal,
  menuQuantityOf,
} from "../../utils/quotationPricing";
import { diffQuotationVersions, previousVersionOf } from "../../utils/quotationDiff";
import { eventSpaceLabel, groupInclusions } from "../../lib/packageDisplay";

/** Customer-friendly status mapping */
const statusMeta = (status, isExpired) => {
  if (isExpired) return { tone: "neutral", label: "Quote Expired", icon: Clock };
  switch (status) {
    case "Accepted":
      return { tone: "success", label: "Accepted", icon: CheckCircle2 };
    case "Revision Requested":
      return { tone: "warning", label: "Change Requested", icon: RefreshCw };
    case "Rejected":
      return { tone: "danger", label: "Declined", icon: XCircle };
    default:
      return { tone: "info", label: "Ready for your review", icon: FileCheck2 };
  }
};

export default function CustomerQuotationModal({
  open,
  onClose,
  quotation,
  inquiry,
  versions = [],
  onUpdated,
}) {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pane, setPane] = useState("quotation");
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Progressive disclosure states - collapsed by default for scannability
  const [packageOpen, setPackageOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const businessInfo = useBusinessInfo();
  const revisionInputRef = useRef(null);

  useEffect(() => {
    if (!showRevisionForm) return;
    const frame = requestAnimationFrame(() => {
      revisionInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      revisionInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [showRevisionForm]);

  useEffect(() => {
    if (showRevisionForm) setPane("quotation");
  }, [showRevisionForm]);

  if (!quotation) return null;

  const handleAccept = async () => {
    const depositAmount = Number(quotation.deposit_amount || 0);
    const totalAmount = Number(quotation.total_cost || 0);
    const inquiryId = quotation.inquiry_id?._id || quotation.inquiry_id || inquiry?._id;
    const payable = depositAmount > 0 ? depositAmount : totalAmount;

    await confirm({
      tone: "confirm",
      title: "Accept Quote & Pay Deposit?",
      description: `Accepting this quote proceeds directly to the ${formatCurrency(
        payable
      )} deposit payment via PayMongo (GCash, Maya, or Card). Once paid, your event date is secured and moves to final confirmation.`,
      confirmLabel: "Accept & Pay Deposit",
      cancelLabel: "Not yet",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          if (quotation.status !== "Awaiting Final Confirmation" && quotation.status !== "Accepted") {
            await CustomerAPI.acceptQuotation(quotation._id);
          }

          if (payable > 0 && inquiryId) {
            notify("Preparing deposit payment checkout...", "info");
            const checkoutRes = await CustomerAPI.createPaymentCheckout({
              inquiry_id: inquiryId,
              amount: payable,
              payment_type: "deposit",
            });

            if (checkoutRes.data?.checkout_url) {
              notify("Redirecting to PayMongo payment checkout...", "success");
              window.location.assign(checkoutRes.data.checkout_url);
              return;
            }
          }

          notify("Quote accepted", "success", {
            description: "Your booking is now awaiting final deposit confirmation from our team.",
          });
          if (onUpdated) onUpdated();
          onClose();
        } catch (err) {
          notify(err.response?.data?.message || "Failed to proceed to payment.", "error");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      setRevisionError("Please tell us what you would like adjusted so our team can update your quote.");
      revisionInputRef.current?.focus();
      return;
    }
    try {
      setRevisionError("");
      setIsSubmitting(true);
      await CustomerAPI.requestQuotationRevision(quotation._id, revisionNote.trim());
      notify("Change request sent", "success", {
        description: "Our catering team will review your adjustments and issue an updated quote.",
      });
      setShowRevisionForm(false);
      setRevisionNote("");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      setRevisionError(
        err.response?.data?.message || "We could not send your change request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    await confirm({
      tone: "destructive",
      title: "Decline this quote?",
      description:
        "If you decline, our team will close this quote. If you simply want changes to the menu, guests, or price, click 'Request a Change' instead so we can adjust it for you.",
      confirmLabel: "Decline Quote",
      cancelLabel: "Keep Reviewing",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await CustomerAPI.rejectQuotation(quotation._id);
          notify("Quote declined", "info", {
            description: "You can message our team anytime if you would like to revisit your booking.",
          });
          if (onUpdated) onUpdated();
          onClose();
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const snapshot = quotation.event_snapshot || null;

  const isPastExpiry = Boolean(
    quotation.expiration_date &&
      new Date(quotation.expiration_date).setHours(23, 59, 59, 999) < Date.now()
  );
  const eventDateVal = snapshot?.event_date || inquiry?.event_date;
  const isWithinLockout = Boolean(
    eventDateVal &&
      new Date(eventDateVal).getTime() - Date.now() <= 3 * 24 * 60 * 60 * 1000
  );
  const isExpired = isPastExpiry || isWithinLockout;

  const isDepositPaid =
    inquiry?.payment_status === "deposit_paid" ||
    inquiry?.payment_status === "fully_paid" ||
    Boolean(inquiry?.converted_booking_id) ||
    quotation?.inquiry_payment_status === "deposit_paid" ||
    quotation?.inquiry_payment_status === "fully_paid" ||
    Boolean(quotation?.approved_payment);

  const canRespond = quotation.status === "Sent" && !isExpired && !isDepositPaid;
  const canRetryPayment =
    (quotation.status === "Awaiting Final Confirmation" || quotation.status === "Accepted") &&
    !isDepositPaid &&
    !isExpired;

  const eventDetail = (key) => {
    const fromSnapshot = snapshot?.[key];
    if (fromSnapshot !== undefined && fromSnapshot !== null && fromSnapshot !== "") {
      return fromSnapshot;
    }
    return snapshot ? undefined : inquiry?.[key];
  };

  const fullAddress =
    [
      eventDetail("street"),
      eventDetail("barangay"),
      eventDetail("municipality"),
      eventDetail("province"),
      eventDetail("zip_code"),
    ]
      .filter(Boolean)
      .join(", ") || "Venue address specified in booking inquiry";

  const guestCount = quotation.guest_count || inquiry?.guest_count || 1;
  const eventSpace =
    eventDetail("event_space_label") || eventSpaceLabel(inquiry, inquiry?.package_id) || "";

  const resolvedService = resolveServiceType({
    ...inquiry,
    ...snapshot,
    package_id: quotation.package_id || inquiry?.package_id,
    package_name:
      quotation.package_name || inquiry?.package_name_snapshot || inquiry?.package_name,
    menu_items: quotation.menu_items || inquiry?.selected_menu,
    service_type: eventDetail("service_type") || inquiry?.service_type,
    include_food:
      eventDetail("include_food") !== undefined
        ? eventDetail("include_food")
        : inquiry?.include_food,
  });

  const status = isDepositPaid
    ? { tone: "success", label: "Deposit Paid & Confirmed", icon: CheckCircle2 }
    : statusMeta(quotation.status, isExpired);

  const total = Number(quotation.total_cost || 0);
  const deposit = Number(quotation.deposit_amount || 0);
  const remaining = Number(
    quotation.remaining_balance ?? (quotation.total_cost - quotation.deposit_amount)
  );
  const dueOnAcceptance = deposit > 0 ? deposit : total;

  const versionNumber = Number(quotation.version_number) || 1;
  const isRevised = versionNumber > 1;

  // Custom fees & extras
  const additionalFees = (
    Array.isArray(quotation.additional_fees) ? quotation.additional_fees : []
  ).filter((fee) => Number(fee?.amount) > 0);

  const hasLogisticsFees =
    Number(quotation.transportation_fee) > 0 ||
    Number(quotation.equipment_fee) > 0 ||
    Number(quotation.decoration_fee) > 0 ||
    additionalFees.length > 0;

  const hasAddOns = Array.isArray(quotation.add_ons) && quotation.add_ons.length > 0;
  const hasExtraServices = hasAddOns || hasLogisticsFees;

  // Package inclusions & adjustments
  const startingPrice = Number(quotation.package_starting_price || 0);
  const removedInclusions = (
    Array.isArray(quotation.removed_inclusions) ? quotation.removed_inclusions : []
  ).filter((entry) => entry?.name);
  const inclusionAdjustments = (
    Array.isArray(quotation.inclusion_adjustments) ? quotation.inclusion_adjustments : []
  ).filter((entry) => entry?.name && Number(entry?.amount));
  const hasPackageAdjustments =
    startingPrice > 0 && (removedInclusions.length > 0 || inclusionAdjustments.length > 0);

  const rawInclusions = (
    Array.isArray(quotation.package_inclusions) ? quotation.package_inclusions : []
  )
    .map((entry) => (typeof entry === "string" ? entry : entry?.name))
    .filter(Boolean);
  const inclusionGroups = groupInclusions(rawInclusions);
  const totalInclusionsCount = rawInclusions.length;

  // Special requests & dietary preferences
  const specialRequests = eventDetail("special_requests");
  const dietaryRequirements =
    eventDetail("dietary_requirements") || eventDetail("dietary_restrictions");
  const allergies = eventDetail("allergies");
  const hasSpecialNotes = Boolean(specialRequests || dietaryRequirements || allergies);

  // Version diffing
  const previousVersion = previousVersionOf(versions, quotation);
  const changes = diffQuotationVersions(previousVersion, quotation);
  const hasChanges = changes.length > 0;

  // Menu preview summary
  const menuItems = Array.isArray(quotation.menu_items) ? quotation.menu_items : [];
  const menuPreviewText =
    menuItems.length > 0
      ? `${menuItems.slice(0, 3).map((item) => item.name).join(", ")}${
          menuItems.length > 3 ? `, and ${menuItems.length - 3} more` : ""
        }`
      : "No dishes specified";

  // Extra services preview summary
  const extrasCount = (quotation.add_ons?.length || 0) + (hasLogisticsFees ? 1 : 0);

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent
          hideClose
          className="customer-shell block w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl focus:outline-none [scrollbar-width:thin] print:hidden"
        >
          {/* ── Modal Header ────────────────────────────────────────── */}
          <div className="relative border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
            <span className="absolute inset-x-0 top-0 h-1 bg-[#2C4B8A]" aria-hidden="true" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close quote"
              title="Close"
              className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2C4B8A]"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>

            <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-center sm:justify-between sm:pr-12">
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  Your Catering Quote
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    Quote #{quotation.quotation_number || "QTN-000001"}
                  </span>
                  {isRevised && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.2 font-semibold text-amber-800 text-[11px]">
                      Updated quote
                    </span>
                  )}
                  {inquiry?.reference && (
                    <>
                      <span className="opacity-40" aria-hidden="true">·</span>
                      <span>For Inquiry {inquiry.reference}</span>
                    </>
                  )}
                </DialogDescription>
              </div>

              {/* Supporting Print Quote & Status */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer transition-colors"
                  title="Download or print a copy of this quote"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Quote</span>
                </button>
                <StatusPill tone={status.tone} label={status.label} icon={status.icon} />
              </div>
            </div>
          </div>

          {/* ── Revised Quote Switcher (if updated) ────────────────── */}
          {hasChanges && (
            <div className="flex flex-col gap-2.5 border-b border-amber-200/80 bg-amber-50/70 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="flex items-center gap-2 text-xs font-medium text-amber-900">
                <RefreshCw className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <span>
                  This quote was updated on{" "}
                  <span className="font-semibold">
                    {formatShortDate(quotation.updatedAt || quotation.createdAt)}
                  </span>
                  .
                </span>
              </p>
              <div className="inline-flex shrink-0 rounded-md bg-white p-0.5 border border-amber-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPane("quotation")}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs transition-colors cursor-pointer",
                    pane === "quotation"
                      ? "bg-slate-100 font-bold text-slate-900"
                      : "font-medium text-slate-600 hover:text-slate-900"
                  )}
                >
                  Your Quote
                </button>
                <button
                  type="button"
                  onClick={() => setPane("changes")}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs transition-colors cursor-pointer",
                    pane === "changes"
                      ? "bg-slate-100 font-bold text-slate-900"
                      : "font-medium text-slate-600 hover:text-slate-900"
                  )}
                >
                  View {changes.length} change{changes.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          )}

          {/* ── Changes Pane ────────────────────────────────────────── */}
          {pane === "changes" && hasChanges ? (
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Adjustments made in this quote
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Review the adjustments made based on your conversation or request.
                </p>
              </div>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {changes.map((change, idx) => (
                  <li
                    key={idx}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 sm:px-5"
                  >
                    <span className="text-xs sm:text-sm font-medium text-slate-800">
                      {change.name ? `${change.label}: ${change.name}` : change.label}
                    </span>
                    {change.detail ? (
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium",
                          change.kind === "removed" ? "text-rose-700" : "text-emerald-700"
                        )}
                      >
                        {change.detail}
                      </span>
                    ) : (
                      <span className="flex items-baseline gap-2 text-xs sm:text-sm">
                        <span className="text-slate-400 line-through">{change.from}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">{change.to}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-5 px-5 py-5 sm:px-6">
              {/* ── Change Request Form (Inline) ───────────────────── */}
              {showRevisionForm && (
                <form
                  onSubmit={handleRevisionSubmit}
                  className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5"
                  aria-labelledby="revision-heading"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#2C4B8A]"
                      aria-hidden="true"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 id="revision-heading" className="text-sm font-bold text-slate-900">
                        What would you like adjusted?
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Let us know what you would like to change (such as guest count, dishes, event time, or extra services).
                      </p>
                    </div>
                  </div>
                  <textarea
                    id="revision-note"
                    ref={revisionInputRef}
                    className="min-h-[90px] w-full rounded-lg border border-slate-300 bg-white p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]/40 focus-visible:border-[#2C4B8A]"
                    placeholder="For example: Could we increase guests from 50 to 65 and add an extra beef dish?"
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    required
                  />
                  {revisionError && (
                    <InlineMessage tone="error" assertive>
                      {revisionError}
                    </InlineMessage>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRevisionForm(false)}
                      className="text-xs h-8 text-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white text-xs h-8 font-semibold"
                    >
                      {isSubmitting ? "Sending…" : "Send Change Request"}
                    </Button>
                  </div>
                </form>
              )}

              {/* ── Status Notices ─────────────────────────────────── */}
              {isExpired && (
                <StateNotice tone="neutral" icon={Clock} title="This quote has expired.">
                  To ensure quality catering preparation and staffing, bookings must be confirmed at
                  least 3 days prior to your event. Message our team if you would like an updated quote.
                </StateNotice>
              )}

              {quotation.admin_notes && (
                <StateNotice tone="warning" icon={AlertCircle} title="Note from our catering team:">
                  {quotation.admin_notes}
                </StateNotice>
              )}

              {quotation.customer_response && (
                quotation.status === "Revision Requested" ? (
                  <StateNotice tone="warning" icon={Clock} title="Your change request is with our team.">
                    “{quotation.customer_response}” — Our team will review this and send an updated
                    quote shortly.
                    {(quotation.revision_requested_at || quotation.updatedAt) && (
                      <span className="mt-1 block text-xs opacity-75">
                        Submitted {formatShortDate(quotation.revision_requested_at || quotation.updatedAt)}
                      </span>
                    )}
                  </StateNotice>
                ) : (
                  <StateNotice tone="info" icon={RefreshCw} title="Your earlier request:">
                    {quotation.customer_response}
                  </StateNotice>
                )
              )}

              {/* ── 1. Event Details (At-a-Glance) ─────────────────── */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Event Details
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-[#2C4B8A]" /> Date &amp; Time
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatEventDate(eventDateVal, { fallback: "To be confirmed" })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTime(eventDetail("start_time")) || "Time to be confirmed"}
                    </p>
                  </div>

                  <div className="space-y-1 sm:border-l sm:border-slate-100 sm:pl-4">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <Users className="h-3.5 w-3.5 text-[#2C4B8A]" /> Guests &amp; Service
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{guestCount} guests</p>
                    <p className="text-xs text-slate-500">{resolvedService}</p>
                  </div>

                  <div className="space-y-1 sm:border-l sm:border-slate-100 sm:pl-4">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-[#2C4B8A]" /> Venue Location
                    </span>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                      {fullAddress}
                    </p>
                    {eventSpace && (
                      <p className="text-[11px] text-slate-500">{eventSpace}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* ── 2. Package & Inclusions (Collapsed by default) ─── */}
              {quotation.package_name && (
                <section className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setPackageOpen(!packageOpen)}
                    aria-expanded={packageOpen}
                    className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2C4B8A]">
                        <PackageIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {quotation.package_name}
                          </h4>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Includes event setup, dinnerware &amp; staffing ({totalInclusionsCount} items included)
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#2C4B8A] hidden sm:inline">
                        {packageOpen ? "Hide details" : "View inclusions"}
                      </span>
                      {packageOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Inclusions & Customizations */}
                  {packageOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5 space-y-4">
                      {hasPackageAdjustments && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Package Adjustments
                          </h5>
                          {removedInclusions.map((entry, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs text-slate-600"
                            >
                              <span>Removed: {entry.name}</span>
                              <span className="font-semibold text-emerald-700">
                                − {formatCurrency(entry.deduction)}
                              </span>
                            </div>
                          ))}
                          {inclusionAdjustments.map((entry, idx) => {
                            const amount = Number(entry.amount) || 0;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs text-slate-600"
                              >
                                <span>
                                  {entry.name} ({entry.quantity} instead of {entry.base_quantity})
                                </span>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    amount < 0 ? "text-emerald-700" : "text-slate-800"
                                  )}
                                >
                                  {amount < 0 ? "− " : "+ "}
                                  {formatCurrency(Math.abs(amount))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {inclusionGroups.length > 0 ? (
                        <div className="space-y-3">
                          {inclusionGroups.map((group, gIdx) => (
                            <div key={group.category || gIdx}>
                              {group.category && (
                                <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  {group.category}
                                </h5>
                              )}
                              <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                                {group.items.map((item, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-baseline gap-2 text-xs text-slate-800"
                                  >
                                    <Check className="mt-1 h-3 w-3 shrink-0 text-[#2C4B8A]" />
                                    <span>
                                      {item.name}
                                      {item.qty && (
                                        <span className="text-slate-500 font-medium"> ({item.qty})</span>
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Standard package inclusions included.</p>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ── 3. Menu Selection (Collapsed by default) ───────── */}
              {menuItems.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-expanded={menuOpen}
                    className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2C4B8A]">
                        <UtensilsCrossed className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900">
                          Menu Selection ({menuItems.length} dishes chosen)
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500 truncate max-w-lg">
                          {menuPreviewText}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#2C4B8A] hidden sm:inline">
                        {menuOpen ? "Hide dishes" : "View dishes"}
                      </span>
                      {menuOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Menu Dishes */}
                  {menuOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5">
                      <ul className="divide-y divide-slate-100">
                        {menuItems.map((item, idx) => {
                          const units = menuQuantityOf(item, guestCount);
                          const byQuantity = item.pricing_type === MENU_PRICING.QUANTITY;
                          const unitLabel = String(item.unit || "").trim();
                          const lineTotal = menuLineTotal(item, guestCount);
                          return (
                            <li
                              key={idx}
                              className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-xs sm:text-sm font-semibold text-slate-900">
                                    {item.name}
                                  </span>
                                  {item.category && (
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                      {item.category}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-500">
                                    ({byQuantity ? `${units} ${unitLabel || "units"}` : "Per guest"})
                                  </span>
                                </div>
                                {item.note && (
                                  <p className="mt-0.5 text-xs italic text-slate-500">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-slate-700">
                                {lineTotal > 0 ? formatCurrency(lineTotal) : "Included"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {/* ── 4. Extra Services (Only if add-ons/fees exist) ─── */}
              {hasExtraServices && (
                <section className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setExtrasOpen(!extrasOpen)}
                    aria-expanded={extrasOpen}
                    className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2C4B8A]">
                        <Truck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900">
                          Extra Services &amp; Delivery
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {extrasCount} additional service{extrasCount === 1 ? "" : "s"} &amp; rental items
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#2C4B8A] hidden sm:inline">
                        {extrasOpen ? "Hide services" : "View services"}
                      </span>
                      {extrasOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Extra Services */}
                  {extrasOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5 space-y-3">
                      {quotation.add_ons?.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Add-ons &amp; Rentals
                          </h5>
                          <ul className="divide-y divide-slate-100">
                            {quotation.add_ons.map((addon, idx) => {
                              const units = addOnQuantityOf(addon);
                              const total = addOnLineTotal(addon);
                              return (
                                <li
                                  key={idx}
                                  className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                                >
                                  <div>
                                    <span className="text-xs font-semibold text-slate-900">
                                      {addon.name}
                                    </span>
                                    <span className="ml-2 text-[11px] text-slate-500">
                                      ({units} × {formatCurrency(addon.price)})
                                    </span>
                                    {addon.note && (
                                      <p className="text-xs italic text-slate-500">{addon.note}</p>
                                    )}
                                  </div>
                                  <span className="text-xs font-semibold text-slate-800">
                                    {formatCurrency(total)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {hasLogisticsFees && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Logistics &amp; Setup Fees
                          </h5>
                          <ul className="space-y-1.5 text-xs">
                            {Number(quotation.transportation_fee) > 0 && (
                              <li className="flex justify-between text-slate-700">
                                <span>Transportation &amp; delivery</span>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrency(quotation.transportation_fee)}
                                </span>
                              </li>
                            )}
                            {Number(quotation.equipment_fee) > 0 && (
                              <li className="flex justify-between text-slate-700">
                                <span>Equipment rental &amp; handling</span>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrency(quotation.equipment_fee)}
                                </span>
                              </li>
                            )}
                            {Number(quotation.decoration_fee) > 0 && (
                              <li className="flex justify-between text-slate-700">
                                <span>Venue styling &amp; decoration</span>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrency(quotation.decoration_fee)}
                                </span>
                              </li>
                            )}
                            {additionalFees.map((fee, idx) => (
                              <li key={idx} className="flex justify-between text-slate-700">
                                <span>{fee.name || "Additional service"}</span>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrency(fee.amount)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ── 5. Special Requests (Shown only if present) ───── */}
              {hasSpecialNotes && (
                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <MessageSquareQuote className="h-4 w-4 text-[#2C4B8A]" />
                    <span>Special Requests &amp; Dietary Preferences</span>
                  </div>
                  <div className="space-y-2 rounded-lg bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-700">
                    {specialRequests && (
                      <p>
                        <strong className="text-slate-900">Your Instructions:</strong>{" "}
                        {specialRequests}
                      </p>
                    )}
                    {dietaryRequirements && (
                      <p>
                        <strong className="text-slate-900">Dietary Needs:</strong>{" "}
                        {dietaryRequirements}
                      </p>
                    )}
                    {allergies && (
                      <p>
                        <strong className="text-slate-900">Allergies:</strong> {allergies}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* ── 6. Payment Summary (Single Financial Source of Truth) ─ */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Payment Summary
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-baseline justify-between gap-3 px-4 py-3.5 sm:px-5 bg-slate-50/80 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Total Quoted Amount
                      </span>
                      <p className="text-lg sm:text-xl font-bold text-slate-900">
                        {formatCurrency(total)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500">Quote valid until</span>
                      <p
                        className={cn(
                          "text-xs sm:text-sm font-semibold",
                          isExpired ? "text-rose-700 font-bold" : "text-slate-700"
                        )}
                      >
                        {quotation.expiration_date
                          ? `${isExpired ? "Expired " : ""}${formatShortDate(
                              quotation.expiration_date
                            )}`
                          : "7 days from issue"}
                      </p>
                    </div>
                  </div>

                  <dl className="divide-y divide-slate-100 text-xs sm:text-sm">
                    <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
                      <div>
                        <dt className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>Deposit Required to Confirm Booking</span>
                          {isDepositPaid && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                            </span>
                          )}
                        </dt>
                        <dd className="text-xs text-slate-500 font-normal mt-0.5">
                          Secures your event date and moves your booking to confirmation.
                        </dd>
                      </div>
                      <dd className="text-sm sm:text-base font-bold text-[#2C4B8A] shrink-0">
                        {formatCurrency(deposit)}
                      </dd>
                    </div>

                    {deposit > 0 && (
                      <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5 bg-slate-50/40">
                        <dt className="text-slate-600 text-xs">Remaining balance before event</dt>
                        <dd className="text-xs sm:text-sm font-semibold text-slate-700">
                          {formatCurrency(remaining)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </section>

              {/* ── 7. Price Breakdown (Calculation Details) ───────── */}
              <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBreakdownOpen(!breakdownOpen)}
                  aria-expanded={breakdownOpen}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-semibold text-slate-700">
                    How your price was calculated
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>{breakdownOpen ? "Hide details" : "View calculation"}</span>
                    {breakdownOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                </button>

                {breakdownOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3.5 sm:px-5 space-y-2 text-xs">
                    {Number(quotation.package_price) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Event Package Base</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(quotation.package_price)}
                        </span>
                      </div>
                    )}

                    {quotation.add_ons?.length > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Extra Add-ons &amp; Rentals</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(
                            quotation.add_ons.reduce(
                              (sum, item) => sum + addOnLineTotal(item),
                              0
                            )
                          )}
                        </span>
                      </div>
                    )}

                    {hasLogisticsFees && (
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery &amp; Logistics Fees</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(
                            (Number(quotation.transportation_fee) || 0) +
                              (Number(quotation.equipment_fee) || 0) +
                              (Number(quotation.decoration_fee) || 0) +
                              additionalFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
                          )}
                        </span>
                      </div>
                    )}

                    {quotation.discounts > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount Applied</span>
                        <span className="font-semibold">
                          − {formatCurrency(quotation.discounts)}
                        </span>
                      </div>
                    )}

                    {quotation.taxes > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Taxes &amp; VAT</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(quotation.taxes)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500 font-medium text-[11.5px]">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> Matches your quoted total
                      </span>
                      <span className="text-slate-700 font-semibold">{formatCurrency(total)}</span>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── 8. Decision Bar (Sticky Footer) ───────────────────── */}
          {canRespond && !showRevisionForm && (
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
              <Button
                onClick={handleReject}
                disabled={isSubmitting}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-xs h-9 px-4 rounded-md cursor-pointer shadow-xs transition-colors"
              >
                <XCircle className="h-4 w-4 mr-1.5" /> Decline Quote
              </Button>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setShowRevisionForm(true)}
                  disabled={isSubmitting}
                  className="border-slate-300 text-slate-700 hover:bg-white font-semibold text-xs h-9 px-4 rounded-md cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Request a Change
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs h-9 px-5 rounded-md cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {isSubmitting
                    ? "Processing…"
                    : `Accept & Pay Deposit (${formatCurrency(dueOnAcceptance)})`}
                </Button>
              </div>
            </div>
          )}

          {/* Retry payment bar if already accepted but unpaid */}
          {!canRespond && canRetryPayment && !showRevisionForm && (
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
              <Button
                variant="outline"
                onClick={() => setShowRevisionForm(true)}
                disabled={isSubmitting}
                className="border-slate-300 text-slate-700 hover:bg-white font-semibold text-xs h-9 px-4 rounded-md cursor-pointer shadow-2xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Request a Change
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isSubmitting}
                className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs h-9 px-5 rounded-md cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {isSubmitting
                  ? "Processing…"
                  : `Pay Deposit (${formatCurrency(dueOnAcceptance)})`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Optional Supporting Printable Quotation Document */}
      <InvoiceModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        quotation={quotation}
        inquiry={inquiry}
        businessInfo={businessInfo}
        context="customer"
        onPay={canRespond || canRetryPayment ? handleAccept : null}
        isPaying={isSubmitting}
      />
    </>
  );
}
