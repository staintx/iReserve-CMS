import React from "react";
import { createPortal } from "react-dom";
import {
  formatReceiptCurrency,
  formatReceiptDateTime,
  formatReceiptEventDate,
  getReceiptNumber,
  getReceiptMilestoneLabel,
  getReceiptPaymentMethod,
  getReceiptCustomerDetails,
  getReceiptBookingDetails,
  getReceiptBusinessInfo,
  getReceiptSignatory,
} from "../../../utils/receiptHelpers";

export default function AdminPrintReceipt({
  payment,
  booking = null,
  businessInfo = {},
  formatCurrency = null,
}) {
  if (!payment) return null;

  const isRefund = String(payment.payment_type || "").toLowerCase() === "refund";
  const receiptNumber = getReceiptNumber(payment);
  const paidAt = payment.paid_at || payment.createdAt;
  const paymentStatus = payment.status || "approved";

  const customer = getReceiptCustomerDetails(payment, booking);
  const bookingDetails = getReceiptBookingDetails(payment, booking);
  const biz = getReceiptBusinessInfo(businessInfo);
  const signatory = getReceiptSignatory(payment, booking);

  const fmt = (val) =>
    formatCurrency ? formatCurrency(val) : formatReceiptCurrency(val, { isRefund });

  // Clean customer-facing transaction reference (avoid exposing internal developer IDs)
  const customerRef =
    payment.gateway_reference ||
    payment.reference_number ||
    (payment.metadata && payment.metadata.reference_number) ||
    null;

  const milestoneLabel = getReceiptMilestoneLabel(payment.payment_type);
  const methodLabel = getReceiptPaymentMethod(payment);

  const statusDisplay = (() => {
    const s = String(paymentStatus).toLowerCase();
    if (isRefund) {
      if (["approved", "completed", "paid", "refunded", "succeeded"].includes(s)) return "REFUNDED / COMPLETED";
      if (s === "pending") return "REFUND PENDING";
      return s.toUpperCase();
    }
    if (["approved", "paid", "succeeded"].includes(s)) return "APPROVED / PAID";
    if (s === "pending") return "PENDING VERIFICATION";
    return s.toUpperCase();
  })();

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
        <div className="caz-receipt-title">
          {isRefund ? "OFFICIAL REFUND VOUCHER" : "OFFICIAL PAYMENT RECEIPT"}
        </div>
        <div className="caz-receipt-divider" />

        {/* ── Receipt Metadata ── */}
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">{isRefund ? "VOUCHER NO:" : "RECEIPT NO:"}</span>
          <span className="caz-receipt-val caz-mono">{receiptNumber}</span>
        </div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">DATE &amp; TIME:</span>
          <span className="caz-receipt-val">{formatReceiptDateTime(paidAt)}</span>
        </div>

        {/* ── Customer / Billed To ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-section-label">
          {isRefund ? "REFUND RECIPIENT:" : "BILLED TO:"}
        </div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">CUSTOMER:</span>
          <span className="caz-receipt-val caz-bold">{customer.name}</span>
        </div>
        {customer.phone && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">CONTACT:</span>
            <span className="caz-receipt-val">{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">EMAIL:</span>
            <span className="caz-receipt-val">{customer.email}</span>
          </div>
        )}

        {/* ── Event & Booking Details ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-section-label">EVENT &amp; RESERVATION:</div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">BOOKING REF:</span>
          <span className="caz-receipt-val caz-mono caz-bold">{bookingDetails.bookingRef}</span>
        </div>
        {bookingDetails.eventType && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">EVENT TYPE:</span>
            <span className="caz-receipt-val">{bookingDetails.eventType}</span>
          </div>
        )}
        {bookingDetails.packageName && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">PACKAGE:</span>
            <span className="caz-receipt-val">{bookingDetails.packageName}</span>
          </div>
        )}
        {bookingDetails.eventDate && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">EVENT DATE:</span>
            <span className="caz-receipt-val">
              {formatReceiptEventDate(bookingDetails.eventDate, { long: true })}
            </span>
          </div>
        )}

        {/* ── Payment Breakdown ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-section-label">PAYMENT BREAKDOWN:</div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">DESCRIPTION:</span>
          <span className="caz-receipt-val caz-bold">{milestoneLabel}</span>
        </div>
        <div className="caz-receipt-row">
          <span className="caz-receipt-label">METHOD:</span>
          <span className="caz-receipt-val">{methodLabel}</span>
        </div>
        {customerRef && (
          <div className="caz-receipt-row">
            <span className="caz-receipt-label">TRANS REF:</span>
            <span className="caz-receipt-val caz-mono">{customerRef}</span>
          </div>
        )}

        {/* ── Amount Paid / Refunded Emphasized ── */}
        <div className="caz-receipt-double-divider" />
        <div className="caz-receipt-total-row">
          <span>{isRefund ? "AMOUNT REFUNDED:" : "AMOUNT PAID:"}</span>
          <span className="caz-total-amount">{fmt(payment.amount)}</span>
        </div>
        <div className="caz-receipt-double-divider" />
        <div className="caz-receipt-row caz-status-line">
          <span className="caz-receipt-label">PAYMENT STATUS:</span>
          <span className="caz-receipt-val caz-bold">{statusDisplay}</span>
        </div>

        {/* ── Authorized Signature ── */}
        <div className="caz-receipt-divider" />
        <div style={{ marginTop: "7mm", textAlign: "right" }}>
          <div
            style={{
              borderBottom: "1px solid #000000",
              width: "38mm",
              marginLeft: "auto",
              marginBottom: "1.5mm",
            }}
          />
          {signatory.name && (
            <div style={{ fontSize: "8pt", fontWeight: "bold" }}>
              {signatory.name}
            </div>
          )}
          <div style={{ fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {signatory.name ? (signatory.role || "Authorized Signatory") : "Authorized Signature"}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="caz-receipt-divider" />
        <div className="caz-receipt-footer">
          <div className="caz-footer-main">
            Thank you for choosing {biz.name}!
          </div>
          <div className="caz-footer-note">
            Official electronic receipt acknowledgment • iReserve CMS
          </div>
          <div className="caz-footer-end">
            *** KEEP THIS RECEIPT FOR YOUR RECORDS ***
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
