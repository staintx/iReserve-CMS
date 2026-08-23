import { useMemo, useState } from "react";
import { Clock, RefreshCw, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "../../utils/format";
import { diffQuotationVersions, previousVersionOf } from "../../utils/quotationDiff";

/**
 * Version-oriented view of what changed between booking versions.
 *
 * Booking.revisions[] stores a real field-level diff per revision
 * (`changes: { field: { from, to } }`), so every before → after shown here is
 * read straight from saved data. Nothing is inferred: a revision without a
 * `changes` payload simply renders its message and metadata.
 *
 * This deliberately holds only version/revision events — booking and payment
 * lifecycle events live in Status & Timeline.
 */

const MONEY_FIELDS = new Set(["total_price", "price_difference", "deposit_amount"]);

const EXCLUDED_FIELDS = new Set([
  "event_manager_id",
  "staff_ids",
  "staff_assignments",
  "equipment_assignments",
  "equipment_returned",
  "_id",
]);

const prettyField = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const prettyValue = (key, value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (MONEY_FIELDS.has(key)) return formatCurrency(value);
  if (key === "event_date") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  if (key === "guest_count") return `${value} pax`;
  return String(value);
};

const actorLabel = (who) => {
  if (!who) return null;
  const n = String(who).toLowerCase();
  if (n === "admin") return "Caterer";
  if (n === "customer") return "You";
  return who;
};

export default function BookingVersionHistory({ booking, sourceQuotation = null }) {
  const pending = booking?.pending_revision;
  const hasPending =
    pending && ["pending_customer_approval", "pending_admin_approval"].includes(pending.status);

  /** Newest version first; version 1.0 is the original booking. */
  const versions = useMemo(() => {
    const revisions = Array.isArray(booking?.revisions) ? [...booking.revisions] : [];
    const mapped = revisions
      .map((rev) => ({
        key: `rev-${rev.revision_number}`,
        number: Number(rev.revision_number) || 0,
        label: `v${Number(rev.revision_number) || 0}.0`,
        at: rev.customer_confirmed_at || rev.admin_confirmed_at || rev.created_at,
        status: rev.status === "rejected" ? "Declined" : "Confirmed & applied",
        tone: rev.status === "rejected" ? "danger" : "success",
        message: rev.message,
        proposedBy: actorLabel(rev.proposed_by),
        confirmedBy: actorLabel(rev.confirmed_by),
        priceDifference: Number(rev.price_difference) || 0,
        changes: rev.changes || {},
      }))
      .sort((a, b) => b.number - a.number);

    // The original is only meaningful once at least one revision exists.
    if (mapped.length > 0 && booking?.createdAt) {
      mapped.push({
        key: "original",
        number: 0,
        label: "Original",
        at: booking.createdAt,
        status: "Original",
        tone: "neutral",
        message: "The booking as originally confirmed.",
        changes: {},
        isOriginal: true,
      });
    }
    return mapped;
  }, [booking]);

  /**
   * The quotation evolution that produced this booking.
   *
   * Real saved Quotation documents reached via Booking → Inquiry
   * (converted_booking_id) → quotation versions. Each entry's diff is computed
   * against its immediate predecessor with the same helper Quote Details uses,
   * so nothing is reconstructed or invented. Versions with no detectable change
   * are still listed (they exist) but simply report that.
   */
  const quotationVersions = useMemo(() => {
    const all = Array.isArray(sourceQuotation?.versions) ? [...sourceQuotation.versions] : [];
    if (all.length === 0) return [];

    const ordered = all.sort(
      (a, b) => (Number(b.version_number) || 1) - (Number(a.version_number) || 1)
    );
    const sourceId = String(sourceQuotation?.quotation?._id || "");

    return ordered.map((q) => {
      const previous = previousVersionOf(ordered, q);
      const number = Number(q.version_number) || 1;
      return {
        key: `quote-${q._id || number}`,
        label: `v${number}.0`,
        at: q.updatedAt || q.createdAt,
        isSource: String(q._id || "") === sourceId,
        isOriginal: !previous,
        changes: previous ? diffQuotationVersions(previous, q) : [],
        previousLabel: previous ? `v${Number(previous.version_number) || 1}.0` : null,
        quotationNumber: q.quotation_number,
      };
    });
  }, [sourceQuotation]);

  const [selectedQuoteKey, setSelectedQuoteKey] = useState(null);
  const selectedQuote =
    quotationVersions.find((v) => v.key === selectedQuoteKey) || quotationVersions[0] || null;

  const [selectedKey, setSelectedKey] = useState(versions[0]?.key || null);
  const selected = versions.find((v) => v.key === selectedKey) || versions[0] || null;

  // One empty state, chosen from what actually exists: nothing at all, or a
  // booking that came from a quotation which was never revised.
  const hasQuotationHistory = quotationVersions.some((v) => v.changes.length > 0);
  if (versions.length === 0 && !hasPending && !hasQuotationHistory) {
    const cameFromQuotation = Boolean(sourceQuotation?.quotation);
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
        <RefreshCw className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
        <p className="font-sans text-sm font-semibold text-foreground">No changes recorded</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {cameFromQuotation
            ? `This booking was created from ${
                sourceQuotation.quotation.quotation_number || "the original quotation"
              } (Version ${Number(sourceQuotation.quotation.version_number) || 1}.0) and hasn't changed since.`
            : "This booking still matches the details you originally confirmed."}
        </p>
      </div>
    );
  }

  const changeEntries = Object.entries(selected?.changes || {}).filter(([k]) => !EXCLUDED_FIELDS.has(k));
  const pendingChangeEntries = Object.entries(pending?.proposed_changes || {}).filter(([k]) => !EXCLUDED_FIELDS.has(k));

  return (
    <div className="space-y-5">
      {/* §6 — only shown while a revision is genuinely awaiting a decision. */}
      {hasPending && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="flex items-start gap-2.5 text-sm text-amber-900">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              <strong className="font-semibold">
                {pending.status === "pending_customer_approval"
                  ? "Revision awaiting your confirmation"
                  : "Revision request pending review"}
              </strong>
              {pending.requested_at && (
                <span className="ml-1.5 tabular-nums">
                  · Submitted {formatShortDate(pending.requested_at)}
                </span>
              )}
            </span>
          </p>
          {pending.message && (
            <p className="pl-[26px] text-sm leading-relaxed text-amber-900/90 font-medium">{pending.message}</p>
          )}
          {pendingChangeEntries.length > 0 && (
            <div className="pl-[26px] pt-2 border-t border-amber-200/60 mt-1">
              <p className="text-xs font-semibold text-amber-900 mb-1.5">Proposed Modifications:</p>
              <ul className="space-y-1 text-xs text-amber-950">
                {pendingChangeEntries.map(([key, val]) => (
                  <li key={key} className="flex items-center gap-2">
                    <span className="font-medium">{prettyField(key)}:</span>
                    <span className="text-muted-foreground line-through">{prettyValue(key, val?.from)}</span>
                    <ArrowRight className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="font-bold">{prettyValue(key, val?.to)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quotation lineage — how this booking came to be. Labelled as
          pre-booking so it is never mistaken for a post-conversion change. */}
      {hasQuotationHistory && (
        <section className="space-y-3">
          <div>
            <h4 className="font-sans text-sm font-semibold text-foreground">
              Quotation history that led to this booking
            </h4>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Changes agreed before your booking was created.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[13rem_1fr]">
            <div className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:overflow-visible lg:px-0">
              <ul className="flex gap-2 lg:flex-col">
                {quotationVersions.map((v) => {
                  const isActive = v.key === selectedQuote?.key;
                  return (
                    <li key={v.key} className="shrink-0 lg:shrink">
                      <button
                        type="button"
                        onClick={() => setSelectedQuoteKey(v.key)}
                        aria-pressed={isActive}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isActive ? "border-primary/40 bg-powder" : "border-border bg-card hover:bg-muted"
                        )}
                      >
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-sans text-sm font-semibold tabular-nums text-foreground">
                            {v.label}
                          </span>
                          {v.isSource && (
                            <span className="text-xs font-medium text-emerald-700">Accepted</span>
                          )}
                          {v.isOriginal && !v.isSource && (
                            <span className="text-xs text-muted-foreground">Original</span>
                          )}
                        </span>
                        <span className="mt-0.5 block font-sans text-xs tabular-nums text-muted-foreground">
                          {formatShortDate(v.at)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h5 className="font-sans text-sm font-semibold text-foreground">
                  {selectedQuote?.isOriginal
                    ? `Version ${selectedQuote.label.slice(1)} — first quotation`
                    : `Changes since Version ${selectedQuote?.previousLabel?.slice(1)}`}
                </h5>
                {selectedQuote?.isSource && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Booking created from this version
                  </span>
                )}
              </div>

              {selectedQuote?.isOriginal ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  The first quotation we sent you
                  {selectedQuote.quotationNumber ? ` (${selectedQuote.quotationNumber})` : ""}.
                </p>
              ) : selectedQuote?.changes.length > 0 ? (
                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {selectedQuote.changes.map((change, idx) => (
                    <li
                      key={idx}
                      className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                    >
                      <span className="text-sm font-medium text-foreground">
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
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No changes were recorded between this version and the previous one.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {versions.length > 0 && (
        <div className="space-y-3">
          {hasQuotationHistory && (
            <div className="border-t border-border pt-5">
              <h4 className="font-sans text-sm font-semibold text-foreground">
                Changes after your booking was created
              </h4>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Booking changes agreed since conversion.
              </p>
            </div>
          )}
        <div className="grid gap-5 lg:grid-cols-[13rem_1fr]">
          {/* Version selector */}
          <div className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:overflow-visible lg:px-0">
            <ul className="flex gap-2 lg:flex-col">
              {versions.map((v) => {
                const isActive = v.key === selected?.key;
                return (
                  <li key={v.key} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => setSelectedKey(v.key)}
                      aria-pressed={isActive}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "border-primary/40 bg-powder"
                          : "border-border bg-card hover:bg-muted"
                      )}
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="font-sans text-sm font-semibold tabular-nums text-foreground">
                          {v.label}
                        </span>
                        {v.number === versions[0].number && !v.isOriginal && (
                          <span className="text-xs font-medium text-primary">Current</span>
                        )}
                        {v.isOriginal && (
                          <span className="text-xs text-muted-foreground">As booked</span>
                        )}
                      </span>
                      <span className="mt-0.5 block font-sans text-xs tabular-nums text-muted-foreground">
                        {formatShortDate(v.at)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Changes in the selected version */}
          <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h4 className="font-sans text-sm font-semibold text-foreground">
                {selected?.isOriginal
                  ? "Original booking"
                  : `Changes in Version ${selected?.label.slice(1)}`}
              </h4>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-semibold",
                  selected?.tone === "danger"
                    ? "text-rose-700"
                    : selected?.tone === "success"
                      ? "text-emerald-700"
                      : "text-muted-foreground"
                )}
              >
                {selected?.tone === "danger" ? (
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : selected?.tone === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
                {selected?.status}
              </span>
            </div>

            {selected?.message && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selected.message}</p>
            )}

            {(selected?.proposedBy || selected?.confirmedBy || selected?.priceDifference) && (
              <p className="mt-1.5 font-sans text-xs text-muted-foreground">
                {[
                  selected.proposedBy ? `Requested by ${selected.proposedBy}` : null,
                  selected.confirmedBy ? `Approved by ${selected.confirmedBy}` : null,
                  selected.priceDifference
                    ? `Price ${selected.priceDifference > 0 ? "+" : "−"}${formatCurrency(Math.abs(selected.priceDifference))}`
                    : null,
                ]
                  .filter(Boolean)
                  .map((part, i) => (
                    <span key={i}>
                      {i > 0 && <span className="px-1.5 opacity-40" aria-hidden="true">·</span>}
                      <span className="tabular-nums">{part}</span>
                    </span>
                  ))}
              </p>
            )}

            {changeEntries.length > 0 ? (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {changeEntries.map(([key, val]) => (
                  <li
                    key={key}
                    className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <span className="text-sm font-medium text-foreground">{prettyField(key)}</span>
                    <span className="flex shrink-0 items-baseline gap-2 font-sans text-sm tabular-nums">
                      <span className="text-muted-foreground line-through">
                        {prettyValue(key, val?.from)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
                      <span className="font-semibold text-foreground">{prettyValue(key, val?.to)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              !selected?.isOriginal && (
                <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
                  No field-level changes were recorded for this revision.
                </p>
              )
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
