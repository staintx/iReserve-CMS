import { createPortal } from "react-dom";
import { getReceiptBusinessInfo } from "../../../utils/receiptHelpers";

export default function CustomerPrintReceipt({
  payment,
  booking,
  formatCurrency,
  businessInfo = {},
}) {
  if (!payment) return null;

  const fmt = (val) =>
    formatCurrency ? formatCurrency(val) : `₱${Number(val || 0).toLocaleString()}`;

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
    return "Online Payment";
  };

  const b = booking || payment.booking_id || {};
  const inquiryObj =
    typeof payment.inquiry_id === "object" && payment.inquiry_id !== null
      ? payment.inquiry_id
      : {};

  const bookingRef =
    b.reference ||
    (b._id ? `BK-${b._id.slice(-6).toUpperCase()}` : inquiryObj.reference || "N/A");
  const eventType = b.event_type || inquiryObj.event_type || "Catering Event";
  const packageName =
    b.package_name_snapshot ||
    b.package_id?.name ||
    inquiryObj.package_name_snapshot ||
    "";
  const eventDate = b.event_date || inquiryObj.event_date;
  const payerName =
    payment.customer_id?.full_name ||
    (b.contact_first_name
      ? `${b.contact_first_name} ${b.contact_last_name || ""}`.trim()
      : "Valued Customer");
  const payerEmail = payment.customer_id?.email || b.contact_email || "-";
  const payerPhone = payment.customer_id?.phone || b.contact_phone || null;
  const receiptNumber = `REC-${(payment._id || "").slice(-8).toUpperCase()}`;
  const transactionRef =
    payment.gateway_reference ||
    payment.gateway_checkout_id ||
    payment.reference_number ||
    null;
  const paidAt = payment.paid_at || payment.createdAt;
  const paymentStatus = payment.status || "approved";

  const biz = getReceiptBusinessInfo(businessInfo);

  return createPortal(
    <div id="caz-receipt-print-root" className="caz-receipt-print-container" aria-hidden="true">
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 4mm;
          }
        }
      `}</style>
      <div className="caz-thermal-receipt">
        {/* ── Business Header ── */}
        <div className="caz-receipt-header">
          <div className="caz-receipt-biz-name">{biz.name.toUpperCase()}</div>
          {biz.address && <div className="caz-receipt-biz-line">{biz.address}</div>}
          {biz.phone && <div className="caz-receipt-biz-line">Tel: {biz.phone}</div>}
          {biz.email && <div className="caz-receipt-biz-line">{biz.email}</div>}
        </div>

        {/* ── Receipt Title ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-title">PAYMENT RECEIPT</div>
        <div className="caz-receipt-divider" />

        {/* ── Receipt Metadata ── */}
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">RECEIPT NO:</span>
          <span className="caz-receipt-val caz-mono">{receiptNumber}</span>
        </div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">DATE &amp; TIME:</span>
          <span className="caz-receipt-val">{formatDateTime(paidAt)}</span>
        </div>

        {/* ── Customer / Billed To ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-section-label">BILLED TO:</div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">CUSTOMER:</span>
          <span className="caz-receipt-val caz-bold">{payerName}</span>
        </div>
        {payerEmail && payerEmail !== "-" && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">EMAIL:</span>
            <span className="caz-receipt-val">{payerEmail}</span>
          </div>
        )}
        {payerPhone && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">CONTACT:</span>
            <span className="caz-receipt-val">{payerPhone}</span>
          </div>
        )}

        {/* ── Event & Booking Details ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-section-label">EVENT &amp; RESERVATION:</div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">BOOKING REF:</span>
          <span className="caz-receipt-val caz-mono caz-bold">{bookingRef}</span>
        </div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">EVENT TYPE:</span>
          <span className="caz-receipt-val">{eventType}</span>
        </div>
        {packageName && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">PACKAGE:</span>
            <span className="caz-receipt-val">{packageName}</span>
          </div>
        )}
        {eventDate && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">EVENT DATE:</span>
            <span className="caz-receipt-val">{formatEventDate(eventDate)}</span>
          </div>
        )}

        {/* ── Line-Item / Payment Breakdown ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-section-label">PAYMENT BREAKDOWN:</div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">DESCRIPTION:</span>
          <span className="caz-receipt-val caz-bold">{getMilestoneLabel(payment.payment_type)}</span>
        </div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">METHOD:</span>
          <span className="caz-receipt-val">{getPaymentMethod(payment)}</span>
        </div>
        {transactionRef && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">TRANS REF:</span>
            <span className="caz-receipt-val caz-mono">{transactionRef}</span>
          </div>
        )}

        {/* ── Amount Paid Emphasized ── */}
        <div className="caz-receipt-double-divider" />
        <div className="caz-receipt-total-row">
          <span>AMOUNT PAID:</span>
          <span className="caz-total-amount">{fmt(payment.amount)}</span>
        </div>
        <div className="caz-receipt-double-divider" />
        <div className="caz-receipt-row caz-status-line">
          <span className="caz-receipt-label">PAYMENT STATUS:</span>
          <span className="caz-receipt-val caz-bold">
            {paymentStatus === "approved" || paymentStatus === "paid"
              ? "APPROVED / PAID"
              : paymentStatus.toUpperCase()}
          </span>
        </div>

        {/* ── Footer ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-footer">
          <div className="caz-footer-main">Thank you for choosing {biz.name}!</div>
          <div className="caz-footer-note">This serves as an official electronic payment acknowledgment.</div>
          <div className="caz-footer-end">*** KEEP THIS RECEIPT FOR YOUR RECORDS ***</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
