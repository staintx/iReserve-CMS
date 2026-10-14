import React from "react";
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
  getReceiptFinancials,
  getReceiptSignatory,
} from "../../../utils/receiptHelpers";

/**
 * Professional A4 Catering Business Receipt Document
 * Shared between Admin and Customer views for both on-screen preview and high-fidelity A4 printing.
 *
 * @param {Object} props
 * @param {Object} props.payment - Payment transaction document
 * @param {Object} [props.booking] - Booking or reservation object
 * @param {Object} [props.businessInfo] - Business profile information
 * @param {Function} [props.formatCurrency] - Optional currency formatter override
 * @param {boolean} [props.isAdmin=false] - Whether this is rendered in admin context
 * @param {boolean} [props.isPrint=false] - Whether this is rendered for @media print
 * @param {Function} [props.onViewProof] - Callback for opening proof image lightbox (admin only)
 */
export default function CateringReceiptDocument({
  payment,
  booking = null,
  businessInfo = {},
  formatCurrency = null,
  isAdmin = false,
  isPrint = false,
  onViewProof = null,
}) {
  if (!payment) return null;

  const biz = getReceiptBusinessInfo(businessInfo);
  const customer = getReceiptCustomerDetails(payment, booking);
  const bookingDetails = getReceiptBookingDetails(payment, booking);
  const financials = getReceiptFinancials(payment, booking);
  const signatory = getReceiptSignatory(payment, booking);

  const isRefund = financials.isRefund;
  const receiptNumber = getReceiptNumber(payment);
  const milestoneLabel = getReceiptMilestoneLabel(payment.payment_type);
  const methodLabel = getReceiptPaymentMethod(payment);
  const paidAt = payment.paid_at || payment.createdAt;

  const fmt = (val) =>
    formatCurrency ? formatCurrency(val) : formatReceiptCurrency(val, { isRefund });

  // Exclude internal administrative notes on customer copy; allow legitimate reasons (e.g. refund reason, additional charge description)
  const displayNote = payment.description || payment.metadata?.reason || payment.metadata?.description || (isAdmin ? payment.metadata?.notes : null);

  // Clean customer-facing transaction reference (fallback to receipt number or payment id snippet if none)
  const transactionRef =
    payment.gateway_reference ||
    payment.reference_number ||
    (payment.metadata && payment.metadata.reference_number) ||
    null;

  const statusText = (() => {
    const s = financials.status;
    if (isRefund) {
      if (["approved", "completed", "paid", "refunded", "succeeded"].includes(s)) {
        return "REFUND COMPLETED";
      }
      if (s === "pending") return "REFUND PENDING";
      return s.toUpperCase();
    }
    if (["approved", "paid", "succeeded", "completed"].includes(s)) {
      return "PAID & APPROVED";
    }
    if (s === "pending") return "PENDING VERIFICATION";
    return s.toUpperCase();
  })();

  // ═══════════════════════════════════════════════════════════════
  // A. PRINT-ONLY A4 VIEW (Active when isPrint=true inside Portal)
  // ═══════════════════════════════════════════════════════════════
  if (isPrint) {
    return (
      <div
        className="caz-a4-receipt"
        style={{
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          color: "#000000",
          backgroundColor: "#ffffff",
          lineHeight: "1.35",
        }}
      >
        {/* Document Header / Masthead */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #000000",
            paddingBottom: "3.5mm",
            marginBottom: "4mm",
          }}
        >
          {/* Business Info Left */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "3.5mm", maxWidth: "115mm" }}>
            <div
              style={{
                width: "14mm",
                height: "14mm",
                border: "1px solid #000000",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src="/logo.jpg"
                alt={biz.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.parentElement.innerHTML =
                    '<div style="font-weight:900;font-size:11pt;color:#000000;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">C</div>';
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: "12pt",
                  fontWeight: "900",
                  letterSpacing: "0.3px",
                  lineHeight: "1.2",
                  color: "#000000",
                }}
              >
                {biz.name}
              </div>
              <div style={{ fontSize: "7pt", lineHeight: "1.35", marginTop: "1.2mm", color: "#333333" }}>
                {biz.address}
                <br />
                {[biz.phone ? `Tel: ${biz.phone}` : null, biz.email].filter(Boolean).join(" • ")}
              </div>
            </div>
          </div>

          {/* Receipt Title & Reference Right */}
          <div style={{ textAlign: "right", minWidth: "55mm" }}>
            <div
              style={{
                fontSize: "12pt",
                fontWeight: "900",
                letterSpacing: "0.5px",
                lineHeight: "1.1",
                color: "#000000",
              }}
            >
              {isRefund ? "Official Refund Voucher" : "Official Payment Receipt"}
            </div>
            <div
              style={{
                fontSize: "7pt",
                fontWeight: "700",
                letterSpacing: "0.4px",
                marginTop: "0.8mm",
                color: "#555555",
              }}
            >
              {isAdmin ? "Administrative Office Record" : "Customer Acknowledgment Copy"}
            </div>
            <div style={{ marginTop: "2mm", lineHeight: "1.35" }}>
              <div style={{ fontSize: "8pt", color: "#000000" }}>
                <span style={{ fontSize: "7pt", color: "#555555", marginRight: "1.5mm" }}>
                  {isRefund ? "Voucher Number:" : "Receipt Number:"}
                </span>
                <strong style={{ fontFamily: "monospace", fontSize: "9pt", letterSpacing: "0.3px" }}>
                  {receiptNumber}
                </strong>
              </div>
              <div style={{ fontSize: "7pt", color: "#444444", marginTop: "0.6mm" }}>
                <span style={{ marginRight: "1.5mm" }}>Transaction Date:</span>
                <strong>{formatReceiptDateTime(paidAt)}</strong>
              </div>
              <div style={{ marginTop: "1.5mm" }}>
                <span
                  style={{
                    display: "inline-block",
                    border: "1px solid #000000",
                    padding: "0.5mm 2mm",
                    fontSize: "6.5pt",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {statusText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Info Grid: Customer Details & Event Information */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3.5mm", marginBottom: "4mm" }}>
          {/* Customer Details Box */}
          <div style={{ border: "1px solid #000000", padding: "2.5mm 3mm", boxSizing: "border-box" }}>
            <div
              style={{
                fontSize: "7.5pt",
                fontWeight: "800",
                letterSpacing: "0.4px",
                borderBottom: "1px solid #000000",
                paddingBottom: "1mm",
                marginBottom: "1.8mm",
                color: "#000000",
              }}
            >
              {isRefund ? "Refund Recipient Details" : "Customer Details"}
            </div>
            <div style={{ fontSize: "8pt", lineHeight: "1.45" }}>
              <div>
                <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "18mm" }}>
                  Customer:
                </span>
                <strong style={{ fontSize: "8.5pt" }}>{customer.name}</strong>
              </div>
              {customer.phone && (
                <div>
                  <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "18mm" }}>
                    Phone:
                  </span>
                  <span style={{ fontFamily: "monospace" }}>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div>
                  <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "18mm" }}>
                    Email:
                  </span>
                  <span>{customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Event & Reservation Details Box */}
          <div style={{ border: "1px solid #000000", padding: "2.5mm 3mm", boxSizing: "border-box" }}>
            <div
              style={{
                fontSize: "7.5pt",
                fontWeight: "800",
                letterSpacing: "0.4px",
                borderBottom: "1px solid #000000",
                paddingBottom: "1mm",
                marginBottom: "1.8mm",
                color: "#000000",
              }}
            >
              Event &amp; Reservation Details
            </div>
            <div style={{ fontSize: "8pt", lineHeight: "1.45" }}>
              <div>
                <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "22mm" }}>
                  Booking reference:
                </span>
                <strong style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{bookingDetails.bookingRef}</strong>
              </div>
              <div>
                <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "22mm" }}>
                  Event type:
                </span>
                <span>{bookingDetails.eventType || "Catering Event"}</span>
              </div>
              {bookingDetails.packageName && (
                <div>
                  <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "22mm" }}>
                    Package:
                  </span>
                  <span>{bookingDetails.packageName}</span>
                </div>
              )}
              {bookingDetails.eventDate && (
                <div>
                  <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "22mm" }}>
                    Event date:
                  </span>
                  <strong>{formatReceiptEventDate(bookingDetails.eventDate, { long: true })}</strong>
                  {bookingDetails.guestCount && (
                    <span style={{ fontSize: "7pt", color: "#444444", marginLeft: "1.5mm" }}>
                      ({bookingDetails.guestCount} Pax)
                    </span>
                  )}
                </div>
              )}
              {bookingDetails.venue && (
                <div>
                  <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "22mm" }}>
                    Venue:
                  </span>
                  <span>{bookingDetails.venue}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Breakdown Table */}
        <div style={{ marginBottom: "3.5mm" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5pt" }}>
            <thead>
              <tr style={{ borderTop: "1.5px solid #000000", borderBottom: "1.5px solid #000000", backgroundColor: "#f9f9f9" }}>
                <th style={{ textAlign: "left", padding: "1.8mm 2mm", fontWeight: "800", width: "42%" }}>
                  Particulars &amp; Description
                </th>
                <th style={{ textAlign: "left", padding: "1.8mm 2mm", fontWeight: "800", width: "20%" }}>
                  Payment Method
                </th>
                <th style={{ textAlign: "left", padding: "1.8mm 2mm", fontWeight: "800", width: "20%" }}>
                  Transaction Reference
                </th>
                <th style={{ textAlign: "right", padding: "1.8mm 2mm", fontWeight: "800", width: "18%" }}>
                  Amount (PHP)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #000000" }}>
                <td style={{ padding: "2.4mm 2mm", verticalAlign: "top" }}>
                  <div style={{ fontWeight: "800", fontSize: "8.5pt" }}>{milestoneLabel}</div>
                  <div style={{ fontSize: "6.8pt", color: "#555555", marginTop: "0.5mm" }}>
                    Booking reference: {bookingDetails.bookingRef}
                    {bookingDetails.eventType ? ` • ${bookingDetails.eventType}` : ""}
                  </div>
                  {/* Notes / Reason if present */}
                  {displayNote && (
                    <div style={{ fontSize: "6.5pt", fontStyle: "italic", color: "#444444", marginTop: "0.8mm" }}>
                      {payment.payment_type === "additional" ? "Reason: " : "Note: "}{displayNote}
                    </div>
                  )}
                </td>
                <td style={{ padding: "2.4mm 2mm", verticalAlign: "top" }}>
                  <div>{methodLabel}</div>
                  {isAdmin && (
                    <div style={{ fontSize: "6.5pt", color: "#666666", marginTop: "0.3mm" }}>
                      {payment.gateway === "paymongo" ? "Online Gateway" : "Onsite / Direct"}
                    </div>
                  )}
                </td>
                <td style={{ padding: "2.4mm 2mm", verticalAlign: "top", fontFamily: "monospace", fontSize: "7pt" }}>
                  {transactionRef || "—"}
                </td>
                <td style={{ padding: "2.4mm 2mm", verticalAlign: "top", textAlign: "right", fontWeight: "800", fontSize: "9pt" }}>
                  {fmt(payment.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Balances */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4mm" }}>
          <div style={{ width: "82mm", border: "1px solid #000000", padding: "2.5mm 3mm", fontSize: "8pt", lineHeight: "1.4" }}>
            {/* Total Booking Amount (Replaced Total Contract Amount) */}
            {financials.totalBookingAmount !== null && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1mm", color: "#444444", fontSize: "7.5pt" }}>
                <span>Total Booking Amount:</span>
                <span style={{ fontFamily: "monospace" }}>{fmt(financials.totalBookingAmount)}</span>
              </div>
            )}

            {/* Amount Paid / Refunded This Receipt */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #000000",
                borderBottom: "1px solid #000000",
                padding: "1.2mm 0",
                margin: "1mm 0",
                fontWeight: "900",
                fontSize: "9.5pt",
              }}
            >
              <span>{isRefund ? "Amount Refunded:" : "Amount Paid:"}</span>
              <span style={{ fontFamily: "monospace", fontSize: "10.5pt" }}>{fmt(payment.amount)}</span>
            </div>

            {/* Remaining Balance Line */}
            {!isRefund && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5mm", fontSize: "8pt" }}>
                <span style={{ fontWeight: "700" }}>Remaining Balance:</span>
                <span style={{ fontFamily: "monospace", fontWeight: "800", fontSize: "8.5pt" }}>
                  {financials.remainingBalance !== null ? (
                    financials.remainingBalance <= 0 ? (
                      "₱0.00 (Fully Settled)"
                    ) : (
                      fmt(financials.remainingBalance)
                    )
                  ) : (
                    "Refer to Statement"
                  )}
                </span>
              </div>
            )}

            {isRefund && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5mm", fontSize: "7.5pt", color: "#555555" }}>
                <span>Transaction Effect:</span>
                <span style={{ fontWeight: "700" }}>Account Credited / Settled</span>
              </div>
            )}
          </div>
        </div>

        {/* Administrative Verification Details (Admin-Only Section) */}
        {isAdmin && (
          <div style={{ border: "1px dashed #666666", padding: "2mm 3mm", marginBottom: "4mm", fontSize: "6.8pt", backgroundColor: "#fafafa" }}>
            <div style={{ fontWeight: "800", letterSpacing: "0.4px", marginBottom: "1mm", color: "#333333" }}>
              Administrative Audit &amp; Record Verification
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm", fontFamily: "monospace", color: "#444444" }}>
              <div>System Payment ID: <strong>{payment._id}</strong></div>
              <div>Gateway Channel: {payment.gateway || "manual"}</div>
              {payment.gateway_checkout_id && <div>Checkout Session: {payment.gateway_checkout_id}</div>}
              {payment.gateway_payment_intent_id && <div>Payment Intent: {payment.gateway_payment_intent_id}</div>}
            </div>
          </div>
        )}

        {/* Signatures & Acknowledgment Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "3mm", marginBottom: "4mm", paddingTop: "2mm" }}>
          {/* Left: Document Verification Note */}
          <div style={{ fontSize: "6.5pt", color: "#555555", maxWidth: "90mm", lineHeight: "1.35" }}>
            <div>
              <strong>Document Validity:</strong> This official electronic receipt is generated directly from authorized transaction records in iReserve.
            </div>
            <div style={{ marginTop: "0.5mm" }}>
              Status: <strong>{statusText}</strong> • Processed Date: {formatReceiptDateTime(paidAt)}
            </div>
          </div>

          {/* Right: Management Signature Block (Admin-Only) */}
          {isAdmin ? (
            <div style={{ textAlign: "right", minWidth: "45mm" }}>
              <div style={{ borderBottom: "1px solid #000000", width: "42mm", marginLeft: "auto", marginBottom: "1.2mm" }} />
              {signatory.name ? (
                <>
                  <div style={{ fontSize: "8pt", fontWeight: "800", lineHeight: "1.1", textTransform: "uppercase" }}>
                    {signatory.name}
                  </div>
                  <div style={{ fontSize: "6.5pt", color: "#555555", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    {signatory.role || "Authorized Signatory"}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "6.5pt", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "#333333" }}>
                  Authorized Signature
                </div>
              )}
              <div style={{ fontSize: "6pt", color: "#777777", textTransform: "uppercase", marginTop: "0.3mm" }}>
                {biz.name}
              </div>
            </div>
          ) : (
            /* Customer Copy: Official Electronic Acknowledgment Notice */
            <div style={{ textAlign: "right", maxWidth: "60mm", fontSize: "6.5pt", color: "#555555", lineHeight: "1.3" }}>
              <div style={{ fontWeight: "700", color: "#222222" }}>Official Customer Copy</div>
              <div>No physical signature required for electronic receipt acknowledgment.</div>
            </div>
          )}
        </div>

        {/* Formal Document Footer */}
        <div style={{ borderTop: "1px solid #000000", paddingTop: "2mm", textAlign: "center", fontSize: "6.5pt", lineHeight: "1.35", color: "#444444" }}>
          <div style={{ fontWeight: "700" }}>Thank you for choosing {biz.name}!</div>
          <div>Official Electronic Receipt Acknowledgment • iReserve Catering Management System</div>
          <div style={{ fontSize: "6pt", color: "#666666", marginTop: "0.5mm" }}>
            Keep this receipt for your records • For inquiries, contact {biz.email} or {biz.phone}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // B. ON-SCREEN PREVIEW VIEW (Active when isPrint=false inside Modal)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="bg-white text-slate-900 border border-slate-200/90 rounded-xl shadow-xs overflow-hidden select-text text-xs leading-normal">
      {/* 1. Masthead Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start gap-3">
        {/* Business Branding */}
        <div className="flex items-start gap-3 max-w-md">
          <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
            <img
              src="/logo.jpg"
              alt={biz.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.parentElement.innerHTML =
                  '<div class="w-full h-full bg-[#1E3563] text-white font-bold flex items-center justify-center text-base">C</div>';
              }}
            />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-serif tracking-tight text-slate-900">
              {biz.name}
            </h2>
            <p className="text-[10px] text-slate-500 leading-snug mt-1">
              {biz.address}
              <br />
              {[biz.phone ? `Tel: ${biz.phone}` : null, biz.email].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>

        {/* Document Identifier & Status */}
        <div className="text-left sm:text-right space-y-1 shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-200">
          <span className="text-[11px] sm:text-xs font-bold text-slate-900 tracking-tight block">
            {isRefund ? "Official Refund Voucher" : "Official Payment Receipt"}
          </span>
          <span className="text-[9.5px] font-semibold text-slate-400 block">
            {isAdmin ? "Administrative Office Record" : "Customer Receipt Copy"}
          </span>
          <div className="pt-0.5">
            <span className="text-[10px] font-mono font-semibold text-slate-500 block">
              {isRefund ? "Voucher Number:" : "Receipt Number:"}{" "}
              <strong className="text-slate-900 font-bold">{receiptNumber}</strong>
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Transaction Date: <strong className="text-slate-700">{formatReceiptDateTime(paidAt)}</strong>
            </span>
          </div>
          <div className="pt-1 flex sm:justify-end">
            <span
              className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                financials.isApproved
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                  : isRefund
                  ? "bg-blue-50 text-[#4C81E0] border-blue-200"
                  : "bg-amber-50 text-amber-700 border-amber-200/70"
              }`}
            >
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Metadata Grid (Customer & Reservation Details) */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white text-xs">
        {/* Customer Details Box */}
        <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/40 space-y-1">
          <span className="text-[10px] font-bold tracking-wide text-slate-600 block mb-1">
            {isRefund ? "Refund Recipient Details" : "Customer Details"}
          </span>
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-slate-900">{customer.name}</div>
            {customer.phone && (
              <div className="text-[11px] text-slate-600">
                <span className="text-slate-400 mr-1.5 font-medium">Phone:</span>
                <span className="font-mono">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="text-[11px] text-slate-600 break-all">
                <span className="text-slate-400 mr-1.5 font-medium">Email:</span>
                <span>{customer.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Event & Reservation Details Box */}
        <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/40 space-y-1">
          <span className="text-[10px] font-bold tracking-wide text-slate-600 block mb-1">
            Event &amp; Reservation Details
          </span>
          <div className="space-y-0.5">
            <div className="text-[11px] text-slate-700">
              <span className="text-slate-400 mr-1.5 font-medium">Booking reference:</span>
              <span className="font-mono font-bold text-slate-900">{bookingDetails.bookingRef}</span>
            </div>
            <div className="text-[11px] text-slate-700">
              <span className="text-slate-400 mr-1.5 font-medium">Event type:</span>
              <span className="font-medium text-slate-900">{bookingDetails.eventType || "Catering Event"}</span>
            </div>
            {bookingDetails.packageName && (
              <div className="text-[11px] text-slate-700 truncate" title={bookingDetails.packageName}>
                <span className="text-slate-400 mr-1.5 font-medium">Package:</span>
                <span className="font-medium text-slate-900">{bookingDetails.packageName}</span>
              </div>
            )}
            {bookingDetails.eventDate && (
              <div className="text-[11px] text-slate-700">
                <span className="text-slate-400 mr-1.5 font-medium">Event date:</span>
                <span className="font-medium text-slate-900">
                  {formatReceiptEventDate(bookingDetails.eventDate, { long: true })}
                </span>
                {bookingDetails.guestCount && (
                  <span className="text-slate-500 ml-1">({bookingDetails.guestCount} Pax)</span>
                )}
              </div>
            )}
            {bookingDetails.venue && (
              <div className="text-[11px] text-slate-700 truncate" title={bookingDetails.venue}>
                <span className="text-slate-400 mr-1.5 font-medium">Venue:</span>
                <span>{bookingDetails.venue}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Payment Breakdown Table */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80">
        <span className="text-[10px] font-bold tracking-wide text-slate-600 block mb-2">
          Payment Breakdown &amp; Particulars
        </span>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600 font-bold">
                <th className="py-2.5 px-3">Particulars &amp; Description</th>
                <th className="py-2.5 px-3">Payment Method</th>
                <th className="py-2.5 px-3">Transaction Reference</th>
                <th className="py-2.5 px-3 text-right">Amount (PHP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-white">
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-900">{milestoneLabel}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Booking reference: {bookingDetails.bookingRef}
                    {bookingDetails.eventType ? ` • ${bookingDetails.eventType}` : ""}
                  </div>
                  {displayNote && (
                    <div className="text-[10px] text-slate-700 mt-1 bg-amber-50/70 p-1.5 rounded border border-amber-200/60 leading-snug">
                      <strong className="text-amber-950 font-semibold">{payment.payment_type === "additional" ? "Reason: " : "Note: "}</strong>
                      <span>{displayNote}</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-3">
                  <div className="font-medium text-slate-800">{methodLabel}</div>
                  {isAdmin && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {payment.gateway === "paymongo" ? "Online Gateway" : "Onsite / Direct"}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                  {transactionRef || "—"}
                </td>
                <td className="py-3 px-3 text-right font-bold text-sm text-slate-900 tabular-nums">
                  {fmt(payment.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Financial Balances & Settlement Summary */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/30 flex justify-end">
        <div className="w-full sm:w-72 space-y-2 text-xs">
          {/* Total Booking Amount */}
          {financials.totalBookingAmount !== null && (
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px]">Total Booking Amount:</span>
              <span className="font-mono font-medium">{fmt(financials.totalBookingAmount)}</span>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex justify-between items-center shadow-2xs">
            <span className="text-xs font-bold tracking-wide text-slate-700">
              {isRefund ? "Amount Refunded" : "Amount Paid"}
            </span>
            <span
              className={`text-lg font-extrabold tabular-nums ${
                isRefund ? "text-[#4C81E0]" : "text-slate-900"
              }`}
            >
              {fmt(payment.amount)}
            </span>
          </div>

          {!isRefund && (
            <div className="flex justify-between items-center px-1 text-xs">
              <span className="font-bold text-slate-600 text-[11px]">
                Remaining Balance:
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {financials.remainingBalance !== null ? (
                  financials.remainingBalance <= 0 ? (
                    <span className="text-emerald-700">₱0.00 (Fully Settled)</span>
                  ) : (
                    fmt(financials.remainingBalance)
                  )
                ) : (
                  <span className="text-slate-400">Refer to Statement</span>
                )}
              </span>
            </div>
          )}

          {isRefund && (
            <div className="flex justify-between items-center px-1 text-xs text-slate-500">
              <span>Transaction Effect:</span>
              <span className="font-semibold text-slate-700">Account Credited / Settled</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Administrative Verification Box (Admin Only) */}
      {isAdmin && (
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 text-[11px] space-y-1.5">
          <span className="text-[10px] font-bold tracking-wide text-slate-600 block">
            Administrative Audit &amp; Record Verification
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 font-mono text-[10.5px]">
            <div>
              <span className="text-slate-400 mr-1 font-sans">Payment ID:</span>
              <span>{payment._id}</span>
            </div>
            <div>
              <span className="text-slate-400 mr-1 font-sans">Gateway Channel:</span>
              <span>{payment.gateway || "manual"}</span>
            </div>
            {payment.gateway_checkout_id && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 mr-1 font-sans">Checkout Session:</span>
                <span>{payment.gateway_checkout_id}</span>
              </div>
            )}
            {payment.gateway_payment_intent_id && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 mr-1 font-sans">Payment Intent:</span>
                <span>{payment.gateway_payment_intent_id}</span>
              </div>
            )}
            {payment.proof_url && (
              <div className="sm:col-span-2 pt-1 border-t border-slate-200/80 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-sans">
                  Payment Proof Attached
                </span>
                {onViewProof ? (
                  <button
                    type="button"
                    onClick={() => onViewProof(payment.proof_url)}
                    className="text-[11px] font-sans font-semibold text-primary hover:underline cursor-pointer"
                  >
                    View Proof Document
                  </button>
                ) : (
                  <a
                    href={payment.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-sans font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Open Proof Document
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Signature & Footer Notes */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-end gap-4 text-xs">
        <div className="text-slate-500 text-[10px] max-w-xs space-y-0.5">
          <p className="font-semibold text-slate-700">
            Official electronic acknowledgment • iReserve CMS
          </p>
          <p className="text-slate-400">
            Securely recorded under {biz.name}. Keep this document for your records.
          </p>
        </div>

        {isAdmin ? (
          <div className="text-right w-full sm:w-auto">
            <div className="border-b border-slate-400 w-44 ml-auto mb-1" />
            {signatory.name ? (
              <>
                <div className="font-bold text-xs text-slate-900 leading-tight uppercase">
                  {signatory.name}
                </div>
                <div className="text-[9.5px] text-slate-500 uppercase tracking-wide">
                  {signatory.role || "Authorized Signatory"}
                </div>
              </>
            ) : (
              <div className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                Authorized Management Signature
              </div>
            )}
            <div className="text-[9px] text-slate-400 uppercase mt-0.5">
              {biz.name}
            </div>
          </div>
        ) : (
          <div className="text-right text-[10px] text-slate-400">
            <span>Customer Electronic Copy</span>
          </div>
        )}
      </div>
    </div>
  );
}
