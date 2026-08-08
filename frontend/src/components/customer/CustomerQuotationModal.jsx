import { useState } from "react";
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
} from "lucide-react";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { cn } from "@/lib/utils";
import StatusPill from "./portal/StatusPill";
import StateNotice from "./portal/StateNotice";
import DetailGrid from "./portal/DetailGrid";
import AmountSummary from "./portal/AmountSummary";
import { ACTION_DANGER } from "./portal/actionStyles";
import { formatCurrency, formatEventDate, formatTime } from "../../utils/format";

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

export default function CustomerQuotationModal({ open, onClose, quotation, inquiry, onUpdated }) {
  const { notify } = useToast();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!quotation) return null;

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      await CustomerAPI.acceptQuotation(quotation._id);
      notify("Quotation accepted! Generating deposit payment checkout...", "success");

      const depositVal = Number(quotation.deposit_amount) > 0
        ? Number(quotation.deposit_amount)
        : Number(quotation.total_cost || 0);

      const targetInquiryId = inquiry?._id || quotation.inquiry_id?._id || quotation.inquiry_id;

      if (depositVal > 0 && targetInquiryId) {
        const checkoutRes = await CustomerAPI.createPaymentCheckout({
          inquiry_id: targetInquiryId,
          amount: depositVal,
          payment_type: "deposit"
        });

        if (checkoutRes.data?.checkout_url) {
          notify("Redirecting to payment checkout...", "success");
          window.location.assign(checkoutRes.data.checkout_url);
          return;
        }
      }

      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to accept quotation or start checkout.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      notify("Please provide details for your revision request.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await CustomerAPI.requestQuotationRevision(quotation._id, revisionNote.trim());
      notify("Revision request sent to the admin team.", "success");
      setShowRevisionForm(false);
      setRevisionNote("");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to send revision request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Are you sure you want to decline this quotation?")) return;
    try {
      setIsSubmitting(true);
      await CustomerAPI.rejectQuotation(quotation._id);
      notify("Quotation declined.", "info");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to decline quotation.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpired = quotation.expiration_date && new Date(quotation.expiration_date) < new Date();
  const canRespond = (quotation.status === "Sent" || quotation.status === "Draft") && !isExpired;

  // Build full address string
  const fullAddress = [
    inquiry?.street,
    inquiry?.barangay,
    inquiry?.municipality,
    inquiry?.province,
    inquiry?.zip_code
  ].filter(Boolean).join(", ") || "Location details specified in booking inquiry";

  const guestCount = quotation.guest_count || inquiry?.guest_count || 1;

  const status = statusMeta(quotation.status, isExpired);
  const total = Number(quotation.total_cost || 0);
  const deposit = Number(quotation.deposit_amount || 0);
  const remaining = Number(
    quotation.remaining_balance ?? (quotation.total_cost - quotation.deposit_amount)
  );

  const versionLabel = `${Number(quotation.version_number) || 1}.0`;

  /**
   * What accepting will actually charge. handleAccept falls back to the full
   * total when deposit_amount is 0, so a ₱0 deposit does NOT mean "pay later" —
   * it means the whole amount is due on acceptance. The wording has to match
   * that, or the summary contradicts the checkout the customer lands on.
   */
  const dueOnAcceptance = deposit > 0 ? deposit : total;
  const headline = {
    label: deposit > 0 ? "Due now to reserve your date" : "Due on acceptance",
    value: formatCurrency(dueOnAcceptance),
    hint: deposit > 0
      ? `The remaining ${formatCurrency(remaining)} is due before your event.`
      : "No separate deposit for this quote — the full amount is payable when you accept.",
    tone: "warning",
  };

  const hasFees =
    quotation.transportation_fee > 0 || quotation.equipment_fee > 0 || quotation.decoration_fee > 0;

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
          <div className="flex items-start justify-between gap-4">
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
                <DialogDescription className="mt-1.5 font-sans text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">
                    Quotation Ref:{" "}
                    <span className="font-semibold text-foreground">
                      {quotation.quotation_number || "QTN-000001"}
                    </span>
                  </span>
                  <span className="px-1.5 opacity-40" aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">
                    Version <span className="font-semibold text-foreground">{versionLabel}</span>
                  </span>
                  {inquiry?.reference && (
                    <>
                      <span className="px-1.5 opacity-40" aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">
                        Inquiry: <span className="font-semibold text-foreground">{inquiry.reference}</span>
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

        <div className="space-y-6 px-5 py-6 sm:px-7">

          {isExpired && (
            <StateNotice tone="neutral" icon={Clock} title="This quote has expired.">
              Message our team and we'll send you an updated quotation.
            </StateNotice>
          )}

          {quotation.admin_notes && (
            <StateNotice tone="warning" icon={AlertCircle} title="A note from our team:">
              {quotation.admin_notes}
            </StateNotice>
          )}

          {quotation.customer_response && (
            <StateNotice tone="info" icon={RefreshCw} title="Your revision request:">
              {quotation.customer_response}
            </StateNotice>
          )}

          {/* 1. What it costs and what to pay — the most prominent block */}
          <section className="space-y-3">
            <h3 className="font-serif text-lg font-bold text-foreground">Your total</h3>
            <AmountSummary
              rows={[
                { label: "Total cost", value: formatCurrency(total), strong: true },
                {
                  label: "Deposit to reserve your date",
                  value: formatCurrency(deposit),
                  hint: deposit > 0 ? null : "Not required — the full amount is due on acceptance",
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
                  { label: "Event type", value: inquiry?.event_type || "Catering event" },
                  { label: "Date", value: formatEventDate(inquiry?.event_date, { fallback: "To be confirmed" }) },
                  { label: "Start time", value: formatTime(inquiry?.start_time) || "To be confirmed" },
                  { label: "Guests", value: `${guestCount} guests` },
                ]}
              />
              <DetailGrid
                title="Location"
                className="border-t border-border pt-4"
                items={[
                  { label: "Address", value: fullAddress, wide: true },
                  inquiry?.landmark && { label: "Landmark", value: inquiry.landmark },
                  inquiry?.delivery_method && {
                    label: "Service type",
                    value: <span className="capitalize">{inquiry.delivery_method}</span>,
                  },
                ]}
              />
              <DetailGrid
                title="Contact"
                className="border-t border-border pt-4"
                items={[
                  {
                    label: "Name",
                    value: `${inquiry?.contact_first_name || "Customer"} ${inquiry?.contact_last_name || ""}`.trim(),
                  },
                  { label: "Email", value: inquiry?.contact_email || "—" },
                  { label: "Phone", value: inquiry?.contact_phone || "—" },
                ]}
              />
              {(inquiry?.special_requests || inquiry?.dietary_requirements) && (
                <DetailGrid
                  title="Your notes"
                  className="border-t border-border pt-4"
                  items={[
                    inquiry.special_requests && {
                      label: "Special instructions",
                      value: inquiry.special_requests,
                      wide: true,
                    },
                    inquiry.dietary_requirements && {
                      label: "Dietary requirements",
                      value: inquiry.dietary_requirements,
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
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground">{quotation.package_name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Catering package for {guestCount} guests
                    </span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Included with your package</span>
                </div>
              )}

              {quotation.menu_items?.length > 0 && (
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Menu
                  </h4>
                  <ul className="space-y-2.5">
                    {quotation.menu_items.map((item, idx) => (
                      <li key={idx} className="flex items-baseline justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-sm text-foreground">{item.name}</span>
                          {item.note && (
                            <span className="mt-0.5 block text-xs text-muted-foreground">{item.note}</span>
                          )}
                        </div>
                        <span className="shrink-0 font-sans text-sm font-medium tabular-nums text-foreground">
                          {Number(item.price) > 0 ? formatCurrency(item.price) : "Included"}
                        </span>
                      </li>
                    ))}
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
                      const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                      return (
                        <li key={idx} className="flex items-baseline justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-sm text-foreground">{item.name}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {item.quantity || 1} × {formatCurrency(item.price)}
                            </span>
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

          {/* Revision form */}
          {showRevisionForm && (
            <form
              onSubmit={handleRevisionSubmit}
              className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <label htmlFor="revision-note" className="block text-sm font-semibold text-foreground">
                What would you like changed?
              </label>
              <textarea
                id="revision-note"
                className="min-h-[110px] w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="For example: please change the guest count to 80, swap one dish, or move the setup time earlier."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                required
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowRevisionForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send revision request"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Actions — one obvious next step */}
        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-card px-5 py-4 sm:flex-row-reverse sm:items-center sm:justify-between sm:px-7">
          {canRespond && !showRevisionForm ? (
            <>
              <Button onClick={handleAccept} disabled={isSubmitting} className="w-full sm:w-auto">
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Processing…" : "Accept & Continue to Payment"}
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => setShowRevisionForm(true)} disabled={isSubmitting}>
                  <RefreshCw className="h-4 w-4" /> Request a change
                </Button>
                <Button variant="ghost" onClick={handleReject} disabled={isSubmitting} className={cn(ACTION_DANGER)}>
                  <XCircle className="h-4 w-4" /> Decline
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
