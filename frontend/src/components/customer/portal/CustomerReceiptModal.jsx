import { Printer, X, CheckCircle2, Calendar, FileText, CreditCard } from "lucide-react";
import { Button } from "../../ui/button";

export default function CustomerReceiptModal({ payment, booking, onClose, formatCurrency }) {
  if (!payment) return null;

  const fmt = (val) => (formatCurrency ? formatCurrency(val) : `₱${Number(val || 0).toLocaleString()}`);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "-"
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "-"
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  const getMilestoneLabel = (type) => {
    const t = String(type || "").toLowerCase();
    if (t === "deposit") return "Initial Deposit Payment";
    if (t === "balance") return "Final Balance Payment";
    if (t === "full") return "Full Payment (100%)";
    return "Event Payment";
  };

  const getPaymentMethod = (p) => {
    const m = (p.method || p.payment_method || "PayMongo").toLowerCase();
    if (m.includes("gcash")) return "GCash";
    if (m.includes("maya") || m.includes("paymaya")) return "Maya";
    if (m.includes("card")) return "Credit / Debit Card";
    if (m.includes("cash")) return "Cash Payment";
    if (m.includes("bank")) return "Bank Transfer";
    return "PayMongo Online Payment";
  };

  const b = booking || payment.booking_id || {};
  const bookingRef = b.reference || (b._id ? `BK-${b._id.slice(-6).toUpperCase()}` : payment.inquiry_id?.reference || "N/A");
  const eventType = b.event_type || payment.inquiry_id?.event_type || "Catering Event";
  const packageName = b.package_name_snapshot || b.package_id?.name || payment.inquiry_id?.package_name_snapshot || "";
  const eventDate = b.event_date || payment.inquiry_id?.event_date;
  const payerName = payment.customer_id?.full_name || (b.contact_first_name ? `${b.contact_first_name} ${b.contact_last_name || ""}`.trim() : "Valued Customer");
  const payerEmail = payment.customer_id?.email || b.contact_email || "-";
  const receiptNumber = `REC-${(payment._id || "").slice(-8).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-card text-card-foreground border border-border rounded-xl max-w-xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-6">
        {/* Receipt Action Header (Hidden in print) */}
        <div className="flex items-center justify-between border-b border-border pb-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Official Payment Receipt
              </span>
              <span className="text-xs text-muted-foreground font-mono">{receiptNumber}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 h-8 text-xs font-medium">
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              aria-label="Close receipt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Canvas */}
        <div className="space-y-5 print:p-0 print:m-0" id="receipt-print-area">
          {/* Brand Header */}
          <div className="text-center border-b border-border/80 pb-4">
            <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground">
              Caezelle's Catering
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official Payment Voucher & E-Receipt
            </p>
          </div>

          {/* Receipt Numbers & Dates */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-muted/20 p-3 rounded-lg border border-border/50">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                Receipt Number
              </span>
              <span className="font-mono font-bold text-sm text-foreground">{receiptNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                Date & Time Paid
              </span>
              <span className="font-semibold text-foreground">
                {formatDateTime(payment.paid_at || payment.createdAt)}
              </span>
            </div>
          </div>

          {/* Event & Customer Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                Event Details
              </span>
              <div className="font-bold text-sm text-foreground">{eventType}</div>
              {packageName && (
                <div className="text-xs text-muted-foreground">
                  Package: <span className="text-foreground font-medium">{packageName}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
                <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                <span>Event Date: {formatEventDate(eventDate)}</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                Ref: <span className="font-semibold text-foreground">{bookingRef}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                Billed To
              </span>
              <div className="font-bold text-sm text-foreground">{payerName}</div>
              <div className="text-xs text-muted-foreground">{payerEmail}</div>
              {b.contact_phone && (
                <div className="text-xs text-muted-foreground font-mono">{b.contact_phone}</div>
              )}
            </div>
          </div>

          {/* Transaction Table Breakdown */}
          <div className="border border-border/80 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-foreground">
                      {getMilestoneLabel(payment.payment_type)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Payment for {eventType} ({bookingRef})
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <CreditCard className="w-3 h-3 text-muted-foreground" />
                      {getPaymentMethod(payment)}
                    </span>
                    {(payment.gateway_reference || payment.gateway_checkout_id) && (
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate max-w-[140px]">
                        {payment.gateway_reference || payment.gateway_checkout_id}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {fmt(payment.amount)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Status & Confirmation Footer */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                Payment Status
              </span>
              <span className="font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {payment.status === "approved" ? "Approved / Paid" : payment.status}
              </span>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <span>Electronic Receipt Generated</span>
              <p className="text-[10px] text-muted-foreground/70">Thank you for choosing Caezelle's Catering!</p>
            </div>
          </div>
        </div>

        {/* Footer close button (hidden in print) */}
        <div className="pt-1 flex justify-end print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
