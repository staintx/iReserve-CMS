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
  FileText,
  ArrowRight,
} from "lucide-react";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { useConfirm } from "../feedback/confirmContext";
import InlineMessage from "../feedback/InlineMessage";
import { cn } from "@/lib/utils";
import StatusPill from "./portal/StatusPill";
import StateNotice from "./portal/StateNotice";
import DetailGrid from "./portal/DetailGrid";
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

/** Quotation status → the portal's shared semantic tones. */
const statusMeta = (status, isExpired) => {
  if (isExpired) return { tone: "neutral", label: "Expired", icon: Clock };
  switch (status) {
    case "Accepted":
      return { tone: "success", label: "Accepted", icon: CheckCircle2 };
    case "Revision Requested":
      return { tone: "warning", label: "Revision requested", icon: RefreshCw };
    case "Rejected":
      return { tone: "danger", label: "Declined", icon: XCircle };
    default:
      return { tone: "info", label: "Ready for your review", icon: FileCheck2 };
  }
};

export default function CustomerQuotationModal({ open, onClose, quotation, inquiry, versions = [], onUpdated }) {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pane, setPane] = useState("quotation");
  const revisionInputRef = useRef(null);

  // Opening the form used to look like nothing happened: it rendered at the
  // bottom of a long scrolling dialog while the button that opened it sat in
  // the footer. It now sits at the top of the quotation, and the cursor lands
  // in it, so the customer can start typing straight away.
  useEffect(() => {
    if (!showRevisionForm) return;
    const frame = requestAnimationFrame(() => {
      revisionInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      revisionInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [showRevisionForm]);

  // Asking for a change is about this quotation, so switch back to it if the
  // customer was reading the version comparison when they pressed the button.
  useEffect(() => {
    if (showRevisionForm) setPane("quotation");
  }, [showRevisionForm]);

  if (!quotation) return null;

  /**
   * Accepting is the customer's biggest commitment in this flow, so it asks
   * first. The wording is taken from what `acceptQuotation` actually does:
   * the quotation and the inquiry both move to "Awaiting Final Confirmation",
   * which is emphatically not a confirmed booking — the team still has to
   * confirm, and the deposit is what secures the date.
   */
  const handleAccept = async () => {
    const depositAmount = Number(quotation.deposit_amount || 0);
    const totalAmount = Number(quotation.total_cost || 0);
    const inquiryId = quotation.inquiry_id?._id || quotation.inquiry_id || inquiry?._id;
    const payable = depositAmount > 0 ? depositAmount : totalAmount;

    await confirm({
      tone: "confirm",
      title: "Accept Quotation & Pay Deposit?",
      description: `Accepting this quotation will proceed directly to the ${formatCurrency(
        payable,
      )} deposit payment via PayMongo (GCash, Maya, or Card). Once paid, our team will give final confirmation and lock your event date.`,
      confirmLabel: "Accept & Pay Deposit",
      cancelLabel: "Not yet",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          // 1. Accept quotation if not already accepted
          if (quotation.status !== "Awaiting Final Confirmation" && quotation.status !== "Accepted") {
            await CustomerAPI.acceptQuotation(quotation._id);
          }

          // 2. Open PayMongo checkout
          if (payable > 0 && inquiryId) {
            notify("Generating deposit payment checkout...", "info");
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

          notify("Quotation accepted", "success", {
            description:
              "Your request is now awaiting final deposit confirmation from our team.",
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
      setRevisionError("Tell us what you would like changed so our team knows what to adjust.");
      revisionInputRef.current?.focus();
      return;
    }
    try {
      setRevisionError("");
      setIsSubmitting(true);
      await CustomerAPI.requestQuotationRevision(quotation._id, revisionNote.trim());
      // The backend only records the request and flips the status — it does
      // not alter a single figure. Saying so is the difference between the
      // customer waiting calmly and the customer wondering what changed.
      notify("Change request sent", "success", {
        description:
          "Our team will review it. This quotation stays exactly as it is until they send a new version.",
      });
      setShowRevisionForm(false);
      setRevisionNote("");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      setRevisionError(
        err.response?.data?.message || "We could not send your change request. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    await confirm({
      tone: "destructive",
      title: "Decline this quotation?",
      description:
        "Our team will see that you have declined and will not proceed with it. If you only want something changed, ask for a change instead — that keeps the conversation open.",
      confirmLabel: "Decline quotation",
      cancelLabel: "Go back",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await CustomerAPI.rejectQuotation(quotation._id);
          notify("Quotation declined", "info", {
            description: "Message our team if you would like to pick this up again.",
          });
          if (onUpdated) onUpdated();
          onClose();
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

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

  const isDepositPaid = inquiry?.payment_status === "deposit_paid" || inquiry?.payment_status === "fully_paid" || Boolean(inquiry?.converted_booking_id) || quotation?.inquiry_payment_status === "deposit_paid" || quotation?.inquiry_payment_status === "fully_paid" || Boolean(quotation?.approved_payment);
  // A Draft is unfinished work the server no longer serves to customers, so it
  // is not something to accept, decline, or ask for changes to.
  const canRespond = quotation.status === "Sent" && !isExpired && !isDepositPaid;
  const canRetryPayment = (quotation.status === "Awaiting Final Confirmation" || quotation.status === "Accepted") && !isDepositPaid && !isExpired;

  /**
   * Every event detail on this page comes from the quotation that was sent.
   *
   * `event_snapshot` is frozen onto each version when the admin issues it, so
   * what the customer reads here is what they were quoted. The inquiry is only
   * consulted for quotations issued before snapshots existed: it is the live
   * booking record and will have moved on, which is exactly why it cannot be
   * the source for a document the customer is being asked to accept.
   */
  const snapshot = quotation.event_snapshot || null;
  const eventDetail = (key) => {
    const fromSnapshot = snapshot?.[key];
    if (fromSnapshot !== undefined && fromSnapshot !== null && fromSnapshot !== "") {
      return fromSnapshot;
    }
    return snapshot ? undefined : inquiry?.[key];
  };

  const fullAddress = [
    eventDetail("street"),
    eventDetail("barangay"),
    eventDetail("municipality"),
    eventDetail("province"),
    eventDetail("zip_code"),
  ].filter(Boolean).join(", ") || "Location details specified in booking inquiry";

  const guestCount = quotation.guest_count || inquiry?.guest_count || 1;

  /**
   * The footprint this quotation was built for, as one label.
   *
   * Taken from the version's own snapshot, where it was already resolved to a
   * single string. The live booking is only fallen back to for quotations
   * issued before the snapshot carried it, and combos have no footprint at all,
   * so an empty result means the row is not shown rather than shown blank.
   */
  const eventSpace =
    eventDetail("event_space_label") || eventSpaceLabel(inquiry, inquiry?.package_id) || "";

  const status = isDepositPaid 
    ? { tone: "success", label: "Deposit Paid & Confirmed", icon: CheckCircle2 } 
    : statusMeta(quotation.status, isExpired);
  const total = Number(quotation.total_cost || 0);
  const deposit = Number(quotation.deposit_amount || 0);
  const remaining = Number(
    quotation.remaining_balance ?? (quotation.total_cost - quotation.deposit_amount)
  );

  const versionLabel = `${Number(quotation.version_number) || 1}.0`;

  /**
   * We show the required deposit, but it is not charged immediately.
   * The customer pays this from their dashboard once the admin converts the inquiry to a booking.
   */
  const dueOnAcceptance = deposit > 0 ? deposit : total;
  const headline = isDepositPaid
    ? {
        label: "Deposit status: Paid & Confirmed",
        amount: deposit,
        note: "Your deposit payment was confirmed in real time. Your event date is secured.",
      }
    : {
        label: deposit > 0 ? "Deposit required to confirm booking" : "Amount due to confirm booking",
    value: formatCurrency(dueOnAcceptance),
    hint: deposit > 0
      ? "Pay this deposit to reserve your event date. Once paid, our team will provide final booking confirmation."
      : "Pay this amount to confirm your booking and secure your event date.",
    tone: "warning",
  };

  // Named charges the caterer added while quoting. The two fixed fee fields are
  // no longer issued, but quotations sent before custom fees existed still
  // carry them and must keep showing what the customer was charged.
  const additionalFees = (Array.isArray(quotation.additional_fees) ? quotation.additional_fees : [])
    .filter((fee) => Number(fee?.amount) > 0);
  const hasFees =
    quotation.transportation_fee > 0 ||
    quotation.equipment_fee > 0 ||
    quotation.decoration_fee > 0 ||
    additionalFees.length > 0;

  // What the package started at, and what came off it. Only shown when the
  // quotation actually records a deduction, so an untouched package still reads
  // as one simple price.
  const startingPrice = Number(quotation.package_starting_price || 0);
  const removedInclusions = (Array.isArray(quotation.removed_inclusions) ? quotation.removed_inclusions : [])
    .filter((entry) => entry?.name);
  const inclusionDeductions = removedInclusions.reduce(
    (sum, entry) => sum + (Number(entry?.deduction) || 0),
    0
  );
  // Inclusions quoted at a different quantity than the package states. Signed:
  // fewer than the package included comes off, more is added on.
  const inclusionAdjustments = (
    Array.isArray(quotation.inclusion_adjustments) ? quotation.inclusion_adjustments : []
  ).filter((entry) => entry?.name && Number(entry?.amount));
  const showPackageBreakdown =
    startingPrice > 0 && (inclusionDeductions > 0 || inclusionAdjustments.length > 0);
  // Inclusions are stored as "[Category] Name (qty)" strings by the package
  // admin form. Printed raw they repeat the same bracketed category on every
  // line, which is most of the noise in this section. groupInclusions parses
  // them back into real groups so the category is stated once and the items
  // read as a list under it. Nothing about the data changes.
  const inclusionGroups = groupInclusions(
    (Array.isArray(quotation.package_inclusions) ? quotation.package_inclusions : [])
      .map((entry) => (typeof entry === "string" ? entry : entry?.name))
      .filter(Boolean)
  );

  // What the caterer actually changed between the previous saved version and
  // this one. Derived from two real quotation documents — see quotationDiff.
  const previousVersion = previousVersionOf(versions, quotation);
  const changes = diffQuotationVersions(previousVersion, quotation);
  const hasChanges = changes.length > 0;
  const previousVersionLabel = previousVersion
    ? `${Number(previousVersion.version_number) || 1}.0`
    : null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      {/* `block w-full` overrides Radix's grid layout so the content flows
          vertically without horizontal scrollbars or squeezed panels.
          `customer-shell` re-applies the portal's slate/royal-blue tokens —
          Radix renders this in a body portal, outside the layout wrapper that
          normally scopes them, so without it the dialog inherits the warm
          boutique palette and renders body text in brown/gold. */}
      <DialogContent className="block w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl focus:outline-none [scrollbar-width:thin]">

        {/* Header Bar */}
        <div className="relative border-b border-slate-200 bg-slate-50/80 px-5 py-4.5 pr-14 sm:px-6 sm:py-5">
          <span className="absolute inset-x-0 top-0 h-1 bg-[#2C4B8A]" aria-hidden="true" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2C4B8A] border border-blue-200/80 shadow-2xs"
                aria-hidden="true"
              >
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="font-sans text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  Catering Quotation
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-baseline gap-x-1.5 font-sans text-xs text-slate-500">
                  <span className="whitespace-nowrap">
                    Quotation Ref:{" "}
                    <span className="font-semibold tabular-nums text-slate-800">
                      {quotation.quotation_number || "QTN-000001"}
                    </span>
                  </span>
                  <span className="opacity-40" aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">
                    Version{" "}
                    <span className="font-semibold tabular-nums text-slate-800">{versionLabel}</span>
                  </span>
                  {inquiry?.reference && (
                    <>
                      <span className="opacity-40" aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">
                        Inquiry:{" "}
                        <span className="font-semibold tabular-nums text-slate-800">{inquiry.reference}</span>
                      </span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="shrink-0">
              <StatusPill tone={status.tone} label={status.label} icon={status.icon} />
            </div>
          </div>
        </div>

        {/* Revised-quotation indicator */}
        {hasChanges && (
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-amber-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-amber-900">
              <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Quotation revised — Version {versionLabel}.</strong>{" "}
                <span className="tabular-nums opacity-90">Updated {formatShortDate(quotation.updatedAt || quotation.createdAt)}</span>
              </span>
            </p>
            <div className="inline-flex shrink-0 rounded-md bg-white p-0.5 border border-amber-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPane("quotation")}
                aria-pressed={pane === "quotation"}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors cursor-pointer",
                  pane === "quotation" ? "bg-slate-100 font-bold text-slate-900" : "font-medium text-slate-600 hover:text-slate-900"
                )}
              >
                Current quotation
              </button>
              <button
                type="button"
                onClick={() => setPane("changes")}
                aria-pressed={pane === "changes"}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors cursor-pointer",
                  pane === "changes" ? "bg-slate-100 font-bold text-slate-900" : "font-medium text-slate-600 hover:text-slate-900"
                )}
              >
                View {changes.length} change{changes.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}

        {pane === "changes" && hasChanges ? (
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div>
              <h3 className="font-sans text-base font-bold text-slate-900">
                Changes since Version {previousVersionLabel}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                <span className="tabular-nums font-semibold">{changes.length}</span> update
                {changes.length === 1 ? " was" : "s were"} made to your quotation.
              </p>
            </div>

            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              {changes.map((change, idx) => (
                <li key={idx} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 sm:px-5">
                  <span className="min-w-0 text-xs sm:text-sm font-medium text-slate-800">
                    {change.name ? `${change.label}: ${change.name}` : change.label}
                  </span>
                  {change.detail ? (
                    <span
                      className={cn(
                        "shrink-0 font-sans text-xs sm:text-sm font-medium tabular-nums",
                        change.kind === "removed" ? "text-rose-700" : "text-emerald-700"
                      )}
                    >
                      {change.detail}
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-baseline gap-2 font-sans text-xs sm:text-sm tabular-nums">
                      <span className="text-slate-400 line-through">{change.from}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 self-center text-slate-400" aria-hidden="true" />
                      <span className="font-semibold text-slate-900">{change.to}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
        <div className="space-y-5 px-5 py-5 sm:px-6">

          {/* Change request form */}
          {showRevisionForm && (
            <form
              onSubmit={handleRevisionSubmit}
              className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5 shadow-2xs"
              aria-labelledby="revision-heading"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#2C4B8A]"
                  aria-hidden="true"
                >
                  <RefreshCw className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 id="revision-heading" className="font-sans text-sm font-bold text-slate-900">
                    What would you like to change?
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Describe it in your own words (e.g. guest count, menu dishes, add-ons, event timing).
                  </p>
                </div>
              </div>
              <textarea
                id="revision-note"
                ref={revisionInputRef}
                aria-label="Describe the change you would like"
                className="min-h-[100px] w-full rounded-lg border border-slate-300 bg-white p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]/40 focus-visible:border-[#2C4B8A]"
                placeholder="For example: can we increase the guest count from 50 to 70 and add another appetizer?"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                required
              />
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                This sends a change request to our team. Your current quotation remains active until an updated version is issued.
              </p>
              {revisionError && (
                <InlineMessage tone="error" assertive>
                  {revisionError}
                </InlineMessage>
              )}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowRevisionForm(false)} className="text-xs h-8">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white text-xs h-8 font-semibold">
                  {isSubmitting ? "Sending…" : "Send change request"}
                </Button>
              </div>
            </form>
          )}

          {isExpired && (
            <StateNotice tone="neutral" icon={Clock} title="This quotation has expired.">
              To ensure high-quality catering and proper event arrangements, bookings must be confirmed at least 3 days before the event. Please message our team if you would like to request an updated quotation.
            </StateNotice>
          )}

          {quotation.admin_notes && (
            <StateNotice tone="warning" icon={AlertCircle} title="A note from our team:">
              {quotation.admin_notes}
            </StateNotice>
          )}

          {quotation.customer_response && (
            quotation.status === "Revision Requested" ? (
              <StateNotice tone="warning" icon={Clock} title="Your change request is with our team.">
                “{quotation.customer_response}” — we'll review it and send an updated quotation if we
                can accommodate it. This quotation is unchanged until then.
                {(quotation.revision_requested_at || quotation.updatedAt) && (
                  <span className="mt-1 block text-xs tabular-nums opacity-80">
                    Submitted {formatShortDate(quotation.revision_requested_at || quotation.updatedAt)}
                  </span>
                )}
              </StateNotice>
            ) : (
              <StateNotice tone="info" icon={RefreshCw} title="Your earlier change request:">
                {quotation.customer_response}
              </StateNotice>
            )
          )}

          {/* 1. What it costs and what to pay — the most prominent block */}
          <section className="space-y-2">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500">
              Quotation Summary
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <dl className="divide-y divide-slate-100 text-xs sm:text-sm">
                <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5 bg-slate-50/70">
                  <dt className="font-bold text-slate-900">Total Quoted Amount</dt>
                  <dd className="font-sans text-base sm:text-lg font-bold tabular-nums text-slate-900">
                    {formatCurrency(total)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5">
                  <dt className="text-slate-600 flex items-center gap-2">
                    <span>Deposit to reserve your date</span>
                    {isDepositPaid && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                      </span>
                    )}
                  </dt>
                  <dd className="font-sans font-semibold tabular-nums text-slate-800">
                    {formatCurrency(deposit)}
                  </dd>
                </div>
                {deposit > 0 && (
                  <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <dt className="text-slate-500">Remaining balance after deposit</dt>
                    <dd className="font-sans font-medium tabular-nums text-slate-600">
                      {formatCurrency(remaining)}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5">
                  <dt className="text-slate-500">Quote valid until</dt>
                  <dd className={cn(
                    "font-sans font-medium tabular-nums",
                    isExpired ? "font-bold text-rose-700" : "text-slate-600"
                  )}>
                    {quotation.expiration_date
                      ? `${isExpired ? "Expired " : ""}${formatShortDate(quotation.expiration_date)}`
                      : "7 days from issue"}
                  </dd>
                </div>
              </dl>

              {!isDepositPaid && deposit > 0 && canRespond && (
                <div className="border-t border-slate-100 bg-blue-50/60 px-4 py-2.5 sm:px-5 text-xs text-blue-900">
                  <span className="text-[11.5px] text-blue-800 leading-relaxed">
                    A deposit of <strong>{formatCurrency(deposit)}</strong> is required to confirm booking and lock in your date. The remaining balance of <strong>{formatCurrency(remaining)}</strong> is settled before the event.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* 2. What we're quoting for */}
          <section className="space-y-2">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500">
              Event Details
            </h3>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
              <DetailGrid
                title="Event Schedule"
                items={[
                  { label: "Event type", value: eventDetail("event_type") || "Catering event" },
                  { label: "Date", value: formatEventDate(eventDetail("event_date"), { fallback: "To be confirmed" }) },
                  { label: "Start time", value: formatTime(eventDetail("start_time")) || "To be confirmed" },
                  { label: "Guests", value: `${guestCount} guests` },
                  eventDetail("service_type") && {
                    label: "Service type",
                    value: eventDetail("service_type"),
                  },
                ]}
              />
              <DetailGrid
                title="Location & Logistics"
                className="border-t border-slate-100 pt-3.5"
                items={[
                  { label: "Address", value: fullAddress, wide: true },
                  eventDetail("venue_type") && { label: "Venue type", value: eventDetail("venue_type") },
                  eventSpace && { label: "Event space", value: eventSpace },
                  eventDetail("landmark") && { label: "Landmark", value: eventDetail("landmark") },
                  eventDetail("delivery_method") && {
                    label: "Delivery",
                    value: <span className="capitalize">{eventDetail("delivery_method")}</span>,
                  },
                ]}
              />
              <DetailGrid
                title="Contact Person"
                className="border-t border-slate-100 pt-3.5"
                items={[
                  {
                    label: "Name",
                    value: `${eventDetail("contact_first_name") || "Customer"} ${eventDetail("contact_last_name") || ""}`.trim(),
                  },
                  { label: "Email", value: eventDetail("contact_email") || "Not provided" },
                  { label: "Phone", value: eventDetail("contact_phone") || "Not provided" },
                ]}
              />
              {(eventDetail("special_requests") ||
                eventDetail("dietary_requirements") ||
                eventDetail("dietary_restrictions") ||
                eventDetail("allergies")) && (
                <DetailGrid
                  title="Special Notes & Dietary"
                  className="border-t border-slate-100 pt-3.5"
                  items={[
                    eventDetail("special_requests") && {
                      label: "Special instructions",
                      value: eventDetail("special_requests"),
                      wide: true,
                    },
                    (eventDetail("dietary_requirements") || eventDetail("dietary_restrictions")) && {
                      label: "Dietary requirements",
                      value: eventDetail("dietary_requirements") || eventDetail("dietary_restrictions"),
                      wide: true,
                    },
                    eventDetail("allergies") && {
                      label: "Allergies",
                      value: eventDetail("allergies"),
                      wide: true,
                    },
                  ]}
                />
              )}
            </div>
          </section>

          {/* 3. What's included and what costs extra */}
          <section className="space-y-2">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500">
              Quotation Breakdown
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">

              {quotation.package_name && (
                <div className="border-b border-slate-100 p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-slate-900">{quotation.package_name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Event Package
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {Number(quotation.package_price) > 0
                        ? formatCurrency(quotation.package_price)
                        : "Included"}
                    </span>
                  </div>

                  {/* Deduction breakdown */}
                  {showPackageBreakdown && (
                    <dl className="mt-3 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-xs text-slate-500">Package starting price</dt>
                        <dd className="font-sans text-xs font-medium tabular-nums text-slate-900">
                          {formatCurrency(startingPrice)}
                        </dd>
                      </div>
                      {removedInclusions.map((entry, idx) => (
                        <div key={idx} className="flex items-baseline justify-between gap-4">
                          <dt className="min-w-0 text-xs text-slate-500">
                            Removed: {entry.name}
                          </dt>
                          <dd className="font-sans text-xs font-semibold tabular-nums text-emerald-700">
                            − {formatCurrency(entry.deduction)}
                          </dd>
                        </div>
                      ))}
                      {inclusionAdjustments.map((entry, idx) => {
                        const amount = Number(entry.amount) || 0;
                        const difference = Math.abs(
                          (Number(entry.quantity) || 0) - (Number(entry.base_quantity) || 0)
                        );
                        return (
                          <div key={`adj-${idx}`} className="flex items-baseline justify-between gap-4">
                            <dt className="min-w-0 text-xs text-slate-500">
                              {entry.quantity} instead of {entry.base_quantity}: {entry.name}
                              {difference > 0 && Number(entry.unit_price) > 0 && (
                                <span className="block tabular-nums opacity-80">
                                  {difference} × {formatCurrency(entry.unit_price)}
                                </span>
                              )}
                            </dt>
                            <dd
                              className={`font-sans text-xs font-semibold tabular-nums ${
                                amount < 0 ? "text-emerald-700" : "text-slate-900"
                              }`}
                            >
                              {amount < 0 ? "− " : "+ "}
                              {formatCurrency(Math.abs(amount))}
                            </dd>
                          </div>
                        );
                      })}
                      <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-1.5">
                        <dt className="text-xs font-bold text-slate-900">Adjusted package price</dt>
                        <dd className="font-sans text-xs font-bold tabular-nums text-slate-900">
                          {formatCurrency(quotation.package_price)}
                        </dd>
                      </div>
                    </dl>
                  )}

                  {inclusionGroups.length > 0 && (
                    <div className="mt-3.5 space-y-3">
                      {inclusionGroups.map((group, groupIdx) => (
                        <div key={group.category || groupIdx}>
                          {group.category && (
                            <h5 className="mb-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              {group.category}
                            </h5>
                          )}
                          <ul className="grid grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-2">
                            {group.items.map((item, idx) => (
                              <li key={idx} className="flex items-baseline gap-2 text-xs text-slate-800">
                                <span
                                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2C4B8A]"
                                  aria-hidden="true"
                                />
                                <span className="min-w-0">
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
                  )}
                </div>
              )}

              {/* Menu items */}
              {quotation.menu_items?.length > 0 && (
                <div className="border-b border-slate-100 p-4 sm:p-5 space-y-3">
                  <h4 className="font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Menu Dishes ({quotation.menu_items.length})
                  </h4>
                  <ul className="space-y-2.5">
                    {quotation.menu_items.map((item, idx) => {
                      const units = menuQuantityOf(item, guestCount);
                      const byQuantity = item.pricing_type === MENU_PRICING.QUANTITY;
                      const unitLabel = String(item.unit || "").trim();
                      const lineTotal = menuLineTotal(item, guestCount);
                      const basis = byQuantity
                        ? `${units} ${unitLabel || (units === 1 ? "unit" : "units")} × ${formatCurrency(item.price)}`
                        : `${units} guests × ${formatCurrency(item.price)} per guest`;
                      return (
                        <li key={idx} className="flex items-baseline justify-between gap-4">
                          <div className="min-w-0">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm font-semibold text-slate-900">
                              <span>{item.name}</span>
                              {item.category && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-600 border border-slate-200/60">
                                  {item.category}
                                </span>
                              )}
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide",
                                  byQuantity ? "bg-violet-50 text-violet-700 border border-violet-200/60" : "bg-blue-50 text-blue-700 border border-blue-200/60"
                                )}
                              >
                                {byQuantity ? `${units} ${unitLabel || (units === 1 ? "unit" : "units")}` : "Per guest"}
                              </span>
                            </span>
                            {Number(item.price) > 0 && (
                              <span className="mt-0.5 block font-sans text-[11px] tabular-nums text-slate-500">
                                {basis}
                              </span>
                            )}
                            {item.note && (
                              <span className="mt-1 block border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">
                                {item.note}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 font-sans text-xs sm:text-sm font-semibold tabular-nums text-slate-900">
                            {lineTotal > 0 ? formatCurrency(lineTotal) : "Included"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Add-ons */}
              {quotation.add_ons?.length > 0 && (
                <div className="border-b border-slate-100 p-4 sm:p-5 space-y-3">
                  <h4 className="font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Add-ons &amp; Rentals
                  </h4>
                  <ul className="space-y-2.5">
                    {quotation.add_ons.map((item, idx) => {
                      const units = addOnQuantityOf(item);
                      const itemTotal = addOnLineTotal(item);
                      return (
                        <li key={idx} className="flex items-baseline justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-semibold text-slate-900">{item.name}</span>
                            <span className="mt-0.5 block text-[11px] tabular-nums text-slate-500">
                              {units} × {formatCurrency(item.price)}
                            </span>
                            {item.note && (
                              <span className="mt-1 block border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">
                                {item.note}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 font-sans text-xs sm:text-sm font-semibold tabular-nums text-slate-900">
                            {formatCurrency(itemTotal)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Logistics & Service Fees */}
              {hasFees && (
                <div className="border-b border-slate-100 p-4 sm:p-5 space-y-3">
                  <h4 className="font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Service &amp; Logistics
                  </h4>
                  <ul className="space-y-2.5">
                    {quotation.transportation_fee > 0 && (
                      <li className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800">
                          <Truck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          Transportation and logistics
                        </span>
                        <span className="shrink-0 font-sans text-xs sm:text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(quotation.transportation_fee)}
                        </span>
                      </li>
                    )}
                    {quotation.equipment_fee > 0 && (
                      <li className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800">
                          <PackageIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          Equipment rental and setup
                        </span>
                        <span className="shrink-0 font-sans text-xs sm:text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(quotation.equipment_fee)}
                        </span>
                      </li>
                    )}
                    {quotation.decoration_fee > 0 && (
                      <li className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800">
                          <Sparkles className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          Venue styling and decoration
                        </span>
                        <span className="shrink-0 font-sans text-xs sm:text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(quotation.decoration_fee)}
                        </span>
                      </li>
                    )}
                    {additionalFees.map((fee, idx) => (
                      <li key={idx} className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800">
                          <PackageIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          {fee.name || "Additional fee"}
                        </span>
                        <span className="shrink-0 font-sans text-xs sm:text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(fee.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Running totals */}
              <dl className="divide-y divide-slate-100">
                {quotation.subtotal > 0 && (
                  <div className="flex items-baseline justify-between gap-4 px-4 py-2.5 sm:px-5">
                    <dt className="text-xs sm:text-sm text-slate-500">Subtotal</dt>
                    <dd className="font-sans text-xs sm:text-sm font-semibold tabular-nums text-slate-800">
                      {formatCurrency(quotation.subtotal)}
                    </dd>
                  </div>
                )}
                {quotation.discounts > 0 && (
                  <div className="flex items-baseline justify-between gap-4 px-4 py-2.5 sm:px-5">
                    <dt className="text-xs sm:text-sm text-slate-500">Discount</dt>
                    <dd className="font-sans text-xs sm:text-sm font-semibold tabular-nums text-emerald-700">
                      − {formatCurrency(quotation.discounts)}
                    </dd>
                  </div>
                )}
                {quotation.taxes > 0 && (
                  <div className="flex items-baseline justify-between gap-4 px-4 py-2.5 sm:px-5">
                    <dt className="text-xs sm:text-sm text-slate-500">Taxes &amp; VAT</dt>
                    <dd className="font-sans text-xs sm:text-sm font-semibold tabular-nums text-slate-800">
                      {formatCurrency(quotation.taxes)}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 bg-slate-50/80 px-4 py-3.5 sm:px-5 border-t border-slate-200">
                  <dt className="text-sm font-bold text-slate-900">Final Total</dt>
                  <dd className="font-sans text-base sm:text-lg font-bold tabular-nums text-slate-900">
                    {formatCurrency(total)}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="px-1 text-[11px] leading-relaxed text-slate-400">
              <span className="font-medium text-slate-600">Note:</span> The final total includes all quoted items, package adjustments, and confirmed fees.
            </p>
          </section>

        </div>
        )}

        {/* Decision bar */}
        {canRespond && !showRevisionForm && (
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
            <Button
              variant="ghost"
              onClick={handleReject}
              disabled={isSubmitting}
              className="text-slate-500 hover:text-rose-700 hover:bg-rose-50 font-semibold text-xs h-9 px-3 rounded-md cursor-pointer"
            >
              <XCircle className="h-4 w-4 mr-1 text-slate-400" /> Decline
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-2.5">
              <Button
                variant="outline"
                onClick={() => setShowRevisionForm(true)}
                disabled={isSubmitting}
                className="border-slate-300 text-slate-700 hover:bg-white font-semibold text-xs h-9 px-4 rounded-md cursor-pointer shadow-2xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Request a change
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isSubmitting}
                className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs h-9 px-5 rounded-md cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {isSubmitting ? "Processing…" : `Accept & Pay Deposit (${formatCurrency(dueOnAcceptance)})`}
              </Button>
            </div>
          </div>
        )}

        {/* Retry Payment bar if already accepted but unpaid */}
        {!canRespond && canRetryPayment && !showRevisionForm && (
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
            <Button
              variant="outline"
              onClick={() => setShowRevisionForm(true)}
              disabled={isSubmitting}
              className="border-slate-300 text-slate-700 hover:bg-white font-semibold text-xs h-9 px-4 rounded-md cursor-pointer shadow-2xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Request a change
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isSubmitting}
              className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs h-9 px-5 rounded-md cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {isSubmitting ? "Processing…" : `Pay Deposit via PayMongo (${formatCurrency(dueOnAcceptance)})`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
