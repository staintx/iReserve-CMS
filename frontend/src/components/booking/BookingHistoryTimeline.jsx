import { useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  CreditCard,
  CalendarRange,
  MessageSquare,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_ACCENT, TONE_TEXT } from "../customer/portal/tones";
import { formatCurrency } from "../../utils/format";

/**
 * The booking's lifecycle: what happened to the booking, in order.
 *
 * Every entry is derived from data the app already stores — booking.createdAt,
 * booking.change_request, booking.ocular_visit, booking.completed_at and the
 * customer's payments. Nothing here is synthesised: if a field is absent the
 * entry is simply not produced, so an empty timeline means an empty history.
 *
 * Quotation/version events deliberately live in BookingVersionHistory instead,
 * so this stays a lifecycle feed rather than an undifferentiated activity log.
 */

const fmtDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function BookingHistoryTimeline({ booking, payments = [] }) {
  const events = useMemo(() => {
    if (!booking) return [];
    const list = [];

    if (booking.createdAt) {
      list.push({
        at: booking.createdAt,
        icon: FileText,
        tone: "info",
        title: "Booking created",
        detail: booking.reference ? `Reference ${booking.reference}` : null,
      });
    }

    if (booking.change_request?.requested_at) {
      const cr = booking.change_request;
      list.push({
        at: cr.requested_at,
        icon: MessageSquare,
        tone: cr.status === "approved" ? "success" : cr.status === "rejected" ? "danger" : "info",
        title:
          cr.status === "approved"
            ? "Change request approved"
            : cr.status === "rejected"
              ? "Change request declined"
              : "Change request submitted",
        detail: cr.message,
      });
    }

    const ocular = booking.ocular_visit;
    if (ocular?.scheduled_date || ocular?.completed_at) {
      if (ocular.scheduled_date) {
        list.push({
          at: ocular.scheduled_date,
          icon: CalendarRange,
          tone: ocular.status === "completed" ? "success" : "info",
          title: ocular.status === "requested" ? "Site visit requested" : "Site visit scheduled",
          detail: ocular.notes,
          meta: [ocular.scheduled_time ? `Time ${ocular.scheduled_time}` : null].filter(Boolean),
        });
      }
      if (ocular.completed_at) {
        list.push({
          at: ocular.completed_at,
          icon: CheckCircle2,
          tone: "success",
          title: "Site visit completed",
          detail: ocular.outcome ? `Outcome: ${ocular.outcome}` : null,
        });
      }
    }

    // Payments the customer has actually made against this booking.
    payments.forEach((p) => {
      const at = p.paid_at || p.createdAt;
      if (!at) return;
      const declined = p.status === "rejected" || p.status === "failed";
      list.push({
        at,
        icon: CreditCard,
        tone: p.status === "approved" ? "success" : declined ? "danger" : "warning",
        title: `${p.payment_type === "deposit" ? "Deposit" : "Payment"} ${
          p.status === "approved" ? "received" : declined ? "declined" : "pending"
        } — ${formatCurrency(p.amount)}`,
        meta: [p.payment_method || p.method || null].filter(Boolean),
      });
    });

    if (booking.completed_at) {
      list.push({
        at: booking.completed_at,
        icon: PartyPopper,
        tone: "success",
        title: "Event completed",
      });
    }

    return list
      .filter((e) => e.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [booking, payments]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
        <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
        <p className="font-sans text-sm font-semibold text-foreground">No history yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Payments, site visits and status updates will appear here as they happen.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {events.map((event, idx) => (
        <li key={idx} className="relative">
          <span
            className={cn(
              "absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card",
              TONE_ACCENT[event.tone] || TONE_ACCENT.neutral
            )}
            aria-hidden="true"
          >
            <event.icon className="h-3.5 w-3.5" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <h4 className={cn("font-sans text-sm font-semibold", TONE_TEXT[event.tone] || "text-foreground")}>
                {event.title}
              </h4>
              <time className="font-sans text-xs tabular-nums text-muted-foreground">
                {fmtDateTime(event.at)}
              </time>
            </div>

            {event.detail && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{event.detail}</p>
            )}

            {event.meta?.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {event.meta.map((m, i) => (
                  <span key={i}>
                    {i > 0 && <span className="px-1.5 opacity-40" aria-hidden="true">·</span>}
                    {m}
                  </span>
                ))}
              </p>
            )}

          </div>
        </li>
      ))}
    </ol>
  );
}
