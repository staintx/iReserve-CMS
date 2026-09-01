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
import AmountSummary from "./portal/AmountSummary";
import { ACTION_DANGER } from "./portal/actionStyles";
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
      <DialogContent className="customer-shell block w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-background p-0 text-foreground shadow-xl focus:outline-none">

        {/* Header — reads as an official document (brand rule, seal, gold
            hairline) while staying compact so the money stays above the fold.
            pr-12 keeps content clear of the dialog's own close button. */}
        <div className="relative border-b border-border bg-card px-5 py-5 pr-12 sm:px-7 sm:py-6 sm:pr-14">
          <span className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
              <span
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-powder text-primary ring-1 ring-accent/40"
                aria-hidden="true"
              >
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Official Catering Quotation
                </DialogTitle>
                {/* flex-wrap rather than inline spans: each segment is
                    whitespace-nowrap, and with no whitespace between them the
                    browser has no soft-wrap opportunity and the line overflows
                    on narrow screens. */}
                <DialogDescription className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 font-sans text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">
                    Quotation Ref:{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {quotation.quotation_number || "QTN-000001"}
                    </span>
                  </span>
                  <span className="opacity-40" aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">
                    Version{" "}
                    <span className="font-semibold tabular-nums text-foreground">{versionLabel}</span>
                  </span>
                  {inquiry?.reference && (
                    <>
                      <span className="opacity-40" aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">
                        Inquiry:{" "}
                        <span className="font-semibold tabular-nums text-foreground">{inquiry.reference}</span>
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
          {/* Champagne hairline — the one decorative flourish, kept to 1px. */}
          <span className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-accent/60 to-transparent sm:inset-x-7" aria-hidden="true" />
        </div>

        {/* Revised-quotation indicator + the switch between the clean
            quotation and the focused comparison. Only rendered when there is
            a real earlier version to compare against. */}
        {hasChanges && (
          <div className="flex flex-col gap-3 border-b border-border bg-amber-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-amber-900">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Quotation revised — Version {versionLabel}.</strong>{" "}
                <span className="tabular-nums">Updated {formatShortDate(quotation.updatedAt || quotation.createdAt)}</span>
              </span>
            </p>
            <div className="inline-flex shrink-0 rounded-lg bg-card p-1 ring-1 ring-amber-200">
              <button
                type="button"
                onClick={() => setPane("quotation")}
                aria-pressed={pane === "quotation"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pane === "quotation" ? "bg-muted font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                Current quotation
              </button>
              <button
                type="button"
                onClick={() => setPane("changes")}
                aria-pressed={pane === "changes"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pane === "changes" ? "bg-muted font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                View {changes.length} change{changes.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}

        {pane === "changes" && hasChanges ? (
          <div className="space-y-4 px-5 py-6 sm:px-7">
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                Changes since Version {previousVersionLabel}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="tabular-nums">{changes.length}</span> update
                {changes.length === 1 ? " was" : "s were"} made to your quotation.
              </p>
            </div>

            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {changes.map((change, idx) => (
                <li key={idx} className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 sm:px-5">
                  <span className="min-w-0 text-sm font-medium text-foreground">
                    {change.name ? `${change.label}: ${change.name}` : change.label}
                  </span>
                  {change.detail ? (
                    <span
                      className={cn(
                        "shrink-0 font-sans text-sm font-medium tabular-nums",
                        change.kind === "removed" ? "text-rose-700" : "text-emerald-700"
                      )}
                    >
                      {change.detail}
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-baseline gap-2 font-sans text-sm tabular-nums">
                      <span className="text-muted-foreground line-through">{change.from}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
                      <span className="font-semibold text-foreground">{change.to}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <p className="text-xs leading-relaxed text-muted-foreground">
              These are the changes your caterer applied to this version. Anything you asked for that
              isn't listed here was not carried into this quotation.
            </p>
          </div>
        ) : (
        <div className="space-y-6 px-5 py-6 sm:px-7">

          {/* Change request. Sits at the top of the quotation so it is the
              first thing in view once opened, rather than below every pricing
              section. It is a plain message to the team: nothing here edits the
              quotation, and no quotation field is exposed for a customer to
              change. The caterer reissues a version if they can accommodate it. */}
          {showRevisionForm && (
            <form
              onSubmit={handleRevisionSubmit}
              className="space-y-3 rounded-xl border-2 border-primary bg-card p-4 sm:p-5"
              aria-labelledby="revision-heading"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-powder text-primary"
                  aria-hidden="true"
                >
                  <RefreshCw className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 id="revision-heading" className="font-serif text-lg font-bold text-foreground">
                    What would you like to change?
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Describe it in your own words. You might mention guest count, menu or package,
                    add-ons, event details, or anything else.
                  </p>
                </div>
              </div>
              <textarea
                id="revision-note"
                ref={revisionInputRef}
                aria-label="Describe the change you would like"
                className="min-h-[130px] w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="For example: can we increase the guest count from 50 to 70 and add 2 cocktail tables?"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                required
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                This sends a request to our team. It does not change your quotation on its own.
                We'll review it and send you an updated version if we can accommodate it.
              </p>
              {/* Failure stays with the form, holding the text the customer
                  wrote, instead of closing it behind a toast. */}
              {revisionError && (
                <InlineMessage tone="error" assertive>
                  {revisionError}
                </InlineMessage>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowRevisionForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
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

          {/* A submitted request is pending until an admin acts on it — it is
              not itself a change to the quotation (§3). */}
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
          <section className="space-y-3">
            <h3 className="font-serif text-lg font-bold text-foreground">Your total</h3>
            <AmountSummary
              rows={[
                { label: "Total cost", value: formatCurrency(total), strong: true },
                {
                  label: "Deposit to reserve your date",
                  value: (
                    <span className="flex items-center gap-2">
                      <span>{formatCurrency(deposit)}</span>
                      {isDepositPaid && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
                        </span>
                      )}
                    </span>
                  ),
                  hint: isDepositPaid
                    ? "Deposit confirmed via PayMongo online payment."
                    : deposit > 0
                    ? null
                    : "Not required — the full amount is due on acceptance",
                },
                deposit > 0 && {
                  label: "Remaining balance after deposit",
                  value: formatCurrency(remaining),
                },
                {
                  label: "Quote valid until",
                  value: quotation.expiration_date
                    ? formatEventDate(quotation.expiration_date)
                    : "7 days from issue",
                  tone: isExpired ? "danger" : undefined,
                },
              ]}
              headline={headline}
            />
          </section>

          {/* 2. What we're quoting for */}
          <section className="space-y-3">
            <h3 className="font-serif text-lg font-bold text-foreground">Event details</h3>
            <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5">
              <DetailGrid
                title="Event"
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
                title="Location"
                className="border-t border-border pt-4"
                items={[
                  { label: "Address", value: fullAddress, wide: true },
                  eventDetail("venue_type") && { label: "Venue type", value: eventDetail("venue_type") },
                  // One row, not two: the event space and the scaffold are the
                  // same measurement under two names.
                  eventSpace && { label: "Event space / scaffold size", value: eventSpace },
                  eventDetail("landmark") && { label: "Landmark", value: eventDetail("landmark") },
                  eventDetail("delivery_method") && {
                    label: "Delivery",
                    value: <span className="capitalize">{eventDetail("delivery_method")}</span>,
                  },
                ]}
              />
              <DetailGrid
                title="Contact"
                className="border-t border-border pt-4"
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
                  title="Your notes"
                  className="border-t border-border pt-4"
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
          <section className="space-y-3">
            <h3 className="font-serif text-lg font-bold text-foreground">What's included</h3>
            <div className="overflow-hidden rounded-xl border border-border bg-card">

              {quotation.package_name && (
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground">{quotation.package_name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Event setup package
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {Number(quotation.package_price) > 0
                        ? formatCurrency(quotation.package_price)
                        : "Included"}
                    </span>
                  </div>

                  {/* How the package price was reached, whenever something was
                      taken out of it. Without this the customer sees a package
                      price that does not match the package they browsed. */}
                  {showPackageBreakdown && (
                    <dl className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-xs text-muted-foreground">Package starting price</dt>
                        <dd className="font-sans text-xs font-medium tabular-nums text-foreground">
                          {formatCurrency(startingPrice)}
                        </dd>
                      </div>
                      {removedInclusions.map((entry, idx) => (
                        <div key={idx} className="flex items-baseline justify-between gap-4">
                          <dt className="min-w-0 text-xs text-muted-foreground">
                            Removed: {entry.name}
                          </dt>
                          <dd className="font-sans text-xs font-medium tabular-nums text-emerald-700">
                            − {formatCurrency(entry.deduction)}
                          </dd>
                        </div>
                      ))}
                      {/* Said as the arithmetic the caterer did, not just its
                          result: a customer who asked for three tables instead
                          of six should be able to check the number themselves. */}
                      {inclusionAdjustments.map((entry, idx) => {
                        const amount = Number(entry.amount) || 0;
                        const difference = Math.abs(
                          (Number(entry.quantity) || 0) - (Number(entry.base_quantity) || 0)
                        );
                        return (
                          <div key={`adj-${idx}`} className="flex items-baseline justify-between gap-4">
                            <dt className="min-w-0 text-xs text-muted-foreground">
                              {entry.quantity} instead of {entry.base_quantity}: {entry.name}
                              {difference > 0 && Number(entry.unit_price) > 0 && (
                                <span className="block tabular-nums opacity-80">
                                  {difference} × {formatCurrency(entry.unit_price)}
                                </span>
                              )}
                            </dt>
                            <dd
                              className={`font-sans text-xs font-medium tabular-nums ${
                                amount < 0 ? "text-emerald-700" : "text-foreground"
                              }`}
                            >
                              {amount < 0 ? "− " : "+ "}
                              {formatCurrency(Math.abs(amount))}
                            </dd>
                          </div>
                        );
                      })}
                      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-1.5">
                        <dt className="text-xs font-semibold text-foreground">Adjusted package price</dt>
                        <dd className="font-sans text-xs font-semibold tabular-nums text-foreground">
                          {formatCurrency(quotation.package_price)}
                        </dd>
                      </div>
                    </dl>
                  )}

                  {inclusionGroups.length > 0 && (
                    <div className="mt-4 space-y-3.5">
                      {inclusionGroups.map((group, groupIdx) => (
                        <div key={group.category || groupIdx}>
                          {group.category && (
                            <h5 className="mb-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {group.category}
                            </h5>
                          )}
                          <ul className="grid grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-2">
                            {group.items.map((item, idx) => (
                              <li key={idx} className="flex items-baseline gap-2 text-sm text-foreground">
                                <span
                                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary"
                                  aria-hidden="true"
                                />
                                <span className="min-w-0">
                                  {item.name}
                                  {item.qty && (
                                    <span className="text-muted-foreground"> ({item.qty})</span>
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

              {quotation.menu_items?.length > 0 && (
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Menu
                  </h4>
                  <ul className="space-y-3">
                    {/* Every value the caterer priced the line on, in the
                        order their builder shows it: how many, at what rate,
                        for what total. A customer reading this and an admin
                        reading the builder see the same facts. */}
                    {quotation.menu_items.map((item, idx) => {
                      const units = menuQuantityOf(item, guestCount);
                      const byQuantity = item.pricing_type === MENU_PRICING.QUANTITY;
                      const unitLabel = String(item.unit || "").trim();
                      const lineTotal = menuLineTotal(item, guestCount);
                      const basis = byQuantity
                        ? `${units} ${unitLabel || (units === 1 ? "unit" : "units")} × ${formatCurrency(item.price)}`
                        : `${units} ${units === 1 ? "guest" : "guests"} × ${formatCurrency(item.price)} per guest`;
                      return (
                        <li key={idx} className="flex items-baseline justify-between gap-4">
                          <div className="min-w-0">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground">
                              <span>{item.name}</span>
                              {/* What the dish is, as a label. It is not a
                                  note about the order and never reads as one. */}
                              {item.category && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {item.category}
                                </span>
                              )}
                              {/* Same blue/violet split the builder uses, so
                                  "per unit" looks like "per unit" on both
                                  sides of the conversation. */}
                              <span
                                className={`rounded px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide ${
                                  byQuantity
                                    ? "bg-violet-50 text-violet-700"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {byQuantity
                                  ? `${units} ${unitLabel || (units === 1 ? "unit" : "units")}`
                                  : "Per guest"}
                              </span>
                            </span>
                            {Number(item.price) > 0 && (
                              <span className="mt-0.5 block font-sans text-xs tabular-nums text-muted-foreground">
                                {basis}
                              </span>
                            )}
                            {item.note && (
                              <span className="mt-1 block border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                                {item.note}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 font-sans text-sm font-medium tabular-nums text-foreground">
                            {lineTotal > 0 ? formatCurrency(lineTotal) : "Included"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {quotation.add_ons?.length > 0 && (
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Add-ons and rentals
                  </h4>
                  <ul className="space-y-2.5">
                    {quotation.add_ons.map((item, idx) => {
                      // Same rule the total was computed from, so what is
                      // shown and what is charged can never disagree.
                      const units = addOnQuantityOf(item);
                      const itemTotal = addOnLineTotal(item);
                      return (
                        <li key={idx} className="flex items-baseline justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-sm text-foreground">{item.name}</span>
                            <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                              {units} × {formatCurrency(item.price)}
                            </span>
                            {item.note && (
                              <span className="mt-1 block border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                                {item.note}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 font-sans text-sm font-medium tabular-nums text-foreground">
                            {formatCurrency(itemTotal)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {hasFees && (
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Service and logistics
                  </h4>
                  <ul className="space-y-2.5">
                    {quotation.transportation_fee > 0 && (
                      <li className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <Truck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Transportation and logistics
                        </span>
                        <span className="shrink-0 font-sans text-sm font-medium tabular-nums text-foreground">
                          {formatCurrency(quotation.transportation_fee)}
                        </span>
                      </li>
                    )}
                    {quotation.equipment_fee > 0 && (
                      <li className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <PackageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Equipment rental and setup
                        </span>
                        <span className="shrink-0 font-sans text-sm font-medium tabular-nums text-foreground">
                          {formatCurrency(quotation.equipment_fee)}
                        </span>
                      </li>
                    )}
                    {quotation.decoration_fee > 0 && (
                      <li className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Venue styling and decoration
                        </span>
                        <span className="shrink-0 font-sans text-sm font-medium tabular-nums text-foreground">
                          {formatCurrency(quotation.decoration_fee)}
                        </span>
                      </li>
                    )}
                    {additionalFees.map((fee, idx) => (
                      <li key={idx} className="flex items-baseline justify-between gap-4">
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <PackageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          {fee.name || "Additional fee"}
                        </span>
                        <span className="shrink-0 font-sans text-sm font-medium tabular-nums text-foreground">
                          {formatCurrency(fee.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Running totals */}
              <dl className="divide-y divide-border">
                {quotation.subtotal > 0 && (
                  <div className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-5">
                    <dt className="text-sm text-muted-foreground">Subtotal</dt>
                    <dd className="font-sans text-sm font-medium tabular-nums text-foreground">
                      {formatCurrency(quotation.subtotal)}
                    </dd>
                  </div>
                )}
                {quotation.discounts > 0 && (
                  <div className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-5">
                    <dt className="text-sm text-muted-foreground">Discount</dt>
                    <dd className="font-sans text-sm font-medium tabular-nums text-emerald-700">
                      − {formatCurrency(quotation.discounts)}
                    </dd>
                  </div>
                )}
                {quotation.taxes > 0 && (
                  <div className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-5">
                    <dt className="text-sm text-muted-foreground">Taxes and VAT</dt>
                    <dd className="font-sans text-sm font-medium tabular-nums text-foreground">
                      {formatCurrency(quotation.taxes)}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 bg-muted/40 px-4 py-4 sm:px-5">
                  <dt className="text-sm font-semibold text-foreground">Total cost</dt>
                  <dd className="font-sans text-xl font-bold tabular-nums text-foreground">
                    {formatCurrency(total)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* The stored total is authoritative and can include adjustments
                that aren't itemised, so say so rather than letting the numbers
                look like they don't add up. */}
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">About the final total:</span>{" "}
              The final total may include pricing adjustments, discounts, service fees, or other
              applicable charges that are not shown as separate line items.
            </p>
          </section>

        </div>
        )}

        {/* Decision bar. No Close action here by design — the dialog is
            dismissed with the top-right X or Escape, so the footer carries
            only the three decisions. On mobile they stack full-width in
            priority order rather than being squeezed onto one row. */}
        {canRespond && !showRevisionForm && (
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-7">
            <Button
              variant="ghost"
              onClick={handleReject}
              disabled={isSubmitting}
              className={cn("w-full sm:w-auto", ACTION_DANGER)}
            >
              <XCircle className="h-4 w-4" /> Decline
            </Button>
            {/* col-reverse puts Accept first on mobile (priority order top to
                bottom); the sm row restores DOM order so it sits rightmost. */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRevisionForm(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" /> Request a change
              </Button>
              <Button onClick={handleAccept} disabled={isSubmitting} className="w-full sm:w-auto">
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Processing…" : "Accept & Continue to Payment"}
              </Button>
            </div>
          </div>
        )}

        {/* Retry Payment bar if already accepted/awaiting confirmation but deposit is unpaid */}
        {!canRespond && canRetryPayment && !showRevisionForm && (
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-7">
            <Button
              variant="outline"
              onClick={() => setShowRevisionForm(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" /> Request a change
            </Button>
            <Button onClick={handleAccept} disabled={isSubmitting} className="w-full sm:w-auto">
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Processing…" : "Pay Deposit via PayMongo"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
