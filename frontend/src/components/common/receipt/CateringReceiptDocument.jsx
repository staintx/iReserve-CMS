import React from "react";
import { CheckCircle2, Clock, ShieldCheck, XCircle, Image as ImageIcon } from "lucide-react";
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
  getReceiptOriginalPaymentDetails,
  getReceiptSignatory,
  OFFICIAL_BUSINESS_NAME,
} from "../../../utils/receiptHelpers";

/**
 * Professional Catering Business Receipt Document
 * Shared between Admin and Customer views for both on-screen preview (matching mobile receipt) and high-fidelity A4 printing.
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
  const originalPayment = getReceiptOriginalPaymentDetails(payment, booking);

  const isRefund = financials.isRefund;
  const isDenied = financials.isDenied;
  const isApproved = financials.isApproved;
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
      if (isDenied || s === "denied" || s === "rejected") {
        return "DENIED";
      }
      if (["approved", "completed", "paid", "refunded", "succeeded"].includes(s)) {
        return "REFUND COMPLETED";
      }
      if (s === "pending") return "REFUND PENDING";
      return s.toUpperCase();
    }
    if (isDenied || s === "denied" || s === "rejected") {
      return "DENIED";
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
                src="/business-logo.jpg"
                alt={biz.name}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={(e) => {
                  if (e.target.src && e.target.src.endsWith("/business-logo.jpg")) {
                    e.target.src = "/logo.jpg";
                    return;
                  }
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
              {isRefund
                ? isDenied
                  ? "Official Refund Denial Voucher"
                  : "Official Refund Voucher"
                : "Official Payment Receipt"}
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
                    backgroundColor: isDenied ? "#fef2f2" : "transparent",
                    color: isDenied ? "#b91c1c" : "#000000",
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
              {isRefund
                ? isDenied
                  ? "Refund Applicant Details"
                  : "Refund Recipient Details"
                : "Customer Details"}
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
              {bookingDetails.isInquiry ? "Inquiry & Reservation Details" : "Event & Reservation Details"}
            </div>
            <div style={{ fontSize: "8pt", lineHeight: "1.45" }}>
              <div>
                <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "24mm" }}>
                  {bookingDetails.isInquiry ? "Inquiry reference:" : "Booking reference:"}
                </span>
                <strong style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{bookingDetails.bookingRef}</strong>
              </div>
              <div>
                <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "24mm" }}>
                  {bookingDetails.isInquiry ? "Inquiry type:" : "Event type:"}
                </span>
                <span>{bookingDetails.eventType || (bookingDetails.isInquiry ? "Inquiry Request" : "Catering Event")}</span>
              </div>
              {bookingDetails.packageName && (
                <div>
                  <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "24mm" }}>
                    Package:
                  </span>
                  <span>{bookingDetails.packageName}</span>
                </div>
              )}
              {bookingDetails.eventDate && (
                <div>
                  <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "24mm" }}>
                    {bookingDetails.isInquiry ? "Preferred date:" : "Event date:"}
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
                  <span style={{ fontSize: "7pt", color: "#555555", display: "inline-block", width: "24mm" }}>
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
                  <div style={{ fontWeight: "800", fontSize: "8.5pt" }}>
                    {isRefund && isDenied ? "Refund Request (Denied)" : milestoneLabel}
                  </div>
                  <div style={{ fontSize: "6.8pt", color: "#555555", marginTop: "0.5mm" }}>
                    {bookingDetails.isInquiry ? "Inquiry reference: " : "Booking reference: "}
                    {bookingDetails.bookingRef}
                    {bookingDetails.eventType ? ` • ${bookingDetails.eventType}` : ""}
                  </div>
                  {/* Notes / Reason if present */}
                  {displayNote && (
                    <div style={{ fontSize: "6.5pt", fontStyle: "italic", color: "#444444", marginTop: "0.8mm" }}>
                      {isRefund ? "Reason: " : payment.payment_type === "additional" ? "Reason: " : "Note: "}{displayNote}
                    </div>
                  )}
                  {/* Original Payment Details for Refunds */}
                  {isRefund && originalPayment && (
                    <div style={{ fontSize: "6.5pt", color: "#444444", marginTop: "1mm", borderTop: "1px dotted #ccc", paddingTop: "0.8mm" }}>
                      <strong>Original Payment:</strong> {formatReceiptCurrency(originalPayment.amount)} via {originalPayment.method || "Direct"} on {formatReceiptDateTime(originalPayment.date)} {originalPayment.reference ? `(Ref: ${originalPayment.reference})` : ""}
                    </div>
                  )}
                </td>
                <td style={{ padding: "2.4mm 2mm", verticalAlign: "top" }}>
                  <div>{methodLabel}</div>
                </td>
                <td style={{ padding: "2.4mm 2mm", verticalAlign: "top", fontFamily: "monospace", fontSize: "7pt" }}>
                  {transactionRef || "—"}
                </td>
                <td style={{ padding: "2.4mm 2mm", verticalAlign: "top", textAlign: "right", fontWeight: "800", fontSize: "9pt" }}>
                  {isRefund && isDenied ? "₱0.00" : fmt(payment.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Balances */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4mm" }}>
          <div style={{ width: "82mm", border: "1px solid #000000", padding: "2.5mm 3mm", fontSize: "8pt", lineHeight: "1.4" }}>
            {/* Total Booking Amount */}
            {financials.totalBookingAmount !== null && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1mm", color: "#444444", fontSize: "7.5pt" }}>
                <span>{bookingDetails.isInquiry ? "Total Estimated Amount:" : "Total Booking Amount:"}</span>
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
              <span style={{ fontFamily: "monospace", fontSize: "10.5pt" }}>
                {isRefund && isDenied ? "₱0.00 (Denied)" : fmt(payment.amount)}
              </span>
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
                <span style={{ fontWeight: "700", color: isDenied ? "#b91c1c" : "#000000" }}>
                  {isDenied ? "Denied — No Disbursement" : "Account Credited / Settled"}
                </span>
              </div>
            )}
          </div>
        </div>

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

          {/* Right: Signature Box */}
          <div style={{ textAlign: "right", minWidth: "55mm" }}>
            <div style={{ width: "48mm", borderBottom: "1px solid #000000", marginBottom: "1.5mm", marginLeft: "auto" }} />
            <div style={{ fontSize: "7.5pt", fontWeight: "800", color: "#000000" }}>
              {signatory.name || "Authorized Management Signatory"}
            </div>
            <div style={{ fontSize: "6.5pt", color: "#555555" }}>
              {signatory.role}
            </div>
            <div style={{ fontSize: "6pt", color: "#777777", textTransform: "uppercase", marginTop: "0.3mm" }}>
              {biz.name}
            </div>
          </div>
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
  // B. ON-SCREEN RECEIPT (Unified Mobile Receipt Ticket Layout)
  // ═══════════════════════════════════════════════════════════════
  const onScreenStatusLabel = isRefund
    ? isDenied
      ? "DENIED"
      : isApproved
      ? "REFUND COMPLETED"
      : "REFUND PENDING"
    : isApproved
    ? "PAID & APPROVED"
    : financials.status === "pending"
    ? "PENDING VERIFICATION"
    : financials.status.toUpperCase();

  return (
    <div className="bg-white text-slate-900 select-text text-xs leading-normal">
      {/* 1. Official Business Header */}
      <div className="flex flex-col items-center text-center py-1 sm:py-2">
        {/* Logo container matching mobile brandLogoWrap: 76x76, rounded-2xl, border #E2E8F0, shadow-xs */}
        <div className="w-[76px] h-[76px] rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center overflow-hidden mb-2 mx-auto p-0.5">
          <img
            src="/business-logo.jpg"
            alt={OFFICIAL_BUSINESS_NAME}
            className="w-full h-full object-contain"
            onError={(e) => {
              if (e.target.src && e.target.src.endsWith("/business-logo.jpg")) {
                e.target.src = "/logo.jpg";
                return;
              }
              e.target.onerror = null;
              e.target.parentElement.innerHTML =
                '<div class="w-full h-full bg-[#1E3563] text-white font-bold flex items-center justify-center text-base rounded-xl">C</div>';
            }}
          />
        </div>

        <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
          {OFFICIAL_BUSINESS_NAME}
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
          {biz.address}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
          {[biz.phone, biz.email].filter(Boolean).join(" • ")}
        </p>

        {/* Status Pill matching mobile */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mt-2.5 ${
            isRefund
              ? isDenied
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-[#EFF6FF] text-[#4C81E0] border border-[#BFDBFE]"
              : isApproved
              ? "bg-[#ECFDF5] text-emerald-700 border border-[#A7F3D0]"
              : "bg-[#FFFBEB] text-amber-700 border border-[#FDE68A]"
          }`}
        >
          {isRefund && isDenied ? (
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          ) : isApproved ? (
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                isRefund ? "text-[#4C81E0]" : "text-emerald-600"
              }`}
            />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{onScreenStatusLabel}</span>
        </div>

        <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1.5 font-medium">
          {isAdmin ? "Official Administrative Record" : "Customer Acknowledgment Copy"}
        </span>
      </div>

      {/* Serrated Divider (ticket zig-zag cut matching mobile 26 teeth) */}
      <div className="w-full overflow-hidden my-3 select-none flex" style={{ height: "6px" }} aria-hidden="true">
        <svg
          className="w-full"
          style={{ height: "6px" }}
          viewBox="0 0 520 6"
          preserveAspectRatio="none"
        >
          <path
            d="M0 0 L10 6 L20 0 L30 6 L40 0 L50 6 L60 0 L70 6 L80 0 L90 6 L100 0 L110 6 L120 0 L130 6 L140 0 L150 6 L160 0 L170 6 L180 0 L190 6 L200 0 L210 6 L220 0 L230 6 L240 0 L250 6 L260 0 L270 6 L280 0 L290 6 L300 0 L310 6 L320 0 L330 6 L340 0 L350 6 L360 0 L370 6 L380 0 L390 6 L400 0 L410 6 L420 0 L430 6 L440 0 L450 6 L460 0 L470 6 L480 0 L490 6 L500 0 L510 6 L520 0 L520 12 L0 12 Z"
            fill="#F1F5F9"
          />
        </svg>
      </div>

      {/* 2. Customer Information */}
      <div className="pb-3.5 mb-3.5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Customer Details
        </h3>
        <div className="space-y-1.5 text-xs sm:text-[13px]">
          <div className="flex justify-between items-start gap-3">
            <span className="text-slate-500">Client Name</span>
            <span className="font-semibold text-slate-900 text-right">{customer.name}</span>
          </div>
          {customer.email && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-900 text-right break-all">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">Phone</span>
              <span className="text-slate-900 text-right font-mono">{customer.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Event / Inquiry Details */}
      <div className="pb-3.5 mb-3.5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          {bookingDetails.isInquiry ? "Inquiry Details" : "Event Details"}
        </h3>
        <div className="space-y-1.5 text-xs sm:text-[13px]">
          <div className="flex justify-between items-start gap-3">
            <span className="text-slate-500">
              {bookingDetails.isInquiry ? "Inquiry Reference" : "Booking Reference"}
            </span>
            <span className="font-mono font-semibold text-slate-900 text-right">
              {bookingDetails.bookingRef}
            </span>
          </div>
          {bookingDetails.eventType && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">
                {bookingDetails.isInquiry ? "Inquiry Type" : "Event Type"}
              </span>
              <span className="font-semibold text-slate-900 text-right">
                {bookingDetails.eventType}
              </span>
            </div>
          )}
          {bookingDetails.packageName && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">Package</span>
              <span className="text-slate-900 text-right">{bookingDetails.packageName}</span>
            </div>
          )}
          {bookingDetails.eventDate && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">
                {bookingDetails.isInquiry ? "Preferred Date" : "Event Date"}
              </span>
              <span className="text-slate-900 text-right">
                {formatReceiptEventDate(bookingDetails.eventDate, { long: true })}
              </span>
            </div>
          )}
          {bookingDetails.guestCount && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">Guest Count</span>
              <span className="text-slate-900 text-right">{bookingDetails.guestCount} guests</span>
            </div>
          )}
          {bookingDetails.venue && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">Venue</span>
              <span className="text-slate-900 text-right max-w-[60%]">{bookingDetails.venue}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Payment Transaction Details */}
      <div className="pb-3.5 mb-3.5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Transaction Info
        </h3>
        <div className="space-y-1.5 text-xs sm:text-[13px]">
          <div className="flex justify-between items-start gap-3">
            <span className="text-slate-500">
              {isRefund ? "Transaction Type" : "Payment Milestone"}
            </span>
            <span className="font-semibold text-slate-900 text-right">{milestoneLabel}</span>
          </div>
          <div className="flex justify-between items-start gap-3">
            <span className="text-slate-500">Payment Method</span>
            <span className="text-slate-900 text-right">{methodLabel}</span>
          </div>
          <div className="flex justify-between items-start gap-3">
            <span className="text-slate-500">Transaction Date</span>
            <span className="text-slate-900 text-right">{formatReceiptDateTime(paidAt)}</span>
          </div>
          {transactionRef && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">Reference No.</span>
              <span className="font-mono font-semibold text-slate-900 text-right">
                {transactionRef}
              </span>
            </div>
          )}
          {displayNote && (
            <div className="flex justify-between items-start gap-3">
              <span className="text-slate-500">{isRefund ? "Reason / Notes" : "Note / Reason"}</span>
              <span className="text-slate-900 text-right max-w-[60%]">{displayNote}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4b. Original Payment Details for Refunds (when available) */}
      {isRefund && originalPayment && (
        <div className="pb-3.5 mb-3.5 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Original Payment Details
          </h3>
          <div className="space-y-1.5 text-xs sm:text-[13px] bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
            {originalPayment.amount != null && (
              <div className="flex justify-between items-start gap-3">
                <span className="text-slate-500">Original Amount Paid</span>
                <span className="font-semibold text-slate-900 text-right tabular-nums">
                  {formatReceiptCurrency(originalPayment.amount)}
                </span>
              </div>
            )}
            {originalPayment.method && (
              <div className="flex justify-between items-start gap-3">
                <span className="text-slate-500">Original Method</span>
                <span className="text-slate-900 text-right">{originalPayment.method}</span>
              </div>
            )}
            {originalPayment.date && (
              <div className="flex justify-between items-start gap-3">
                <span className="text-slate-500">Original Payment Date</span>
                <span className="text-slate-900 text-right">
                  {formatReceiptDateTime(originalPayment.date)}
                </span>
              </div>
            )}
            {originalPayment.reference && (
              <div className="flex justify-between items-start gap-3">
                <span className="text-slate-500">Original Reference No.</span>
                <span className="font-mono font-semibold text-slate-900 text-right">
                  {originalPayment.reference}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Financial Summary Box */}
      <div className="bg-[#F8FAFC] rounded-xl border border-slate-200/90 p-4 mb-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
          <span className="text-sm font-bold text-slate-900">
            {isRefund ? "Refund Amount" : "Amount Paid"}
          </span>
          <div className="text-right">
            <span
              className={`text-xl sm:text-2xl font-extrabold tabular-nums ${
                isRefund
                  ? isDenied
                    ? "text-rose-600"
                    : "text-[#4C81E0]"
                  : "text-slate-900"
              }`}
            >
              {isRefund && isDenied ? "₱0.00" : fmt(financials.amountPaid)}
            </span>
            {isRefund && isDenied && (
              <span className="block text-[11px] font-bold text-rose-600 uppercase tracking-wide">
                (Denied)
              </span>
            )}
          </div>
        </div>

        {financials.totalBookingAmount != null && financials.totalBookingAmount > 0 && (
          <div className="flex justify-between items-center text-xs mt-2.5">
            <span className="text-slate-500">
              {bookingDetails.isInquiry ? "Total Estimated Amount" : "Total Booking Amount"}
            </span>
            <span className="font-medium text-slate-900 tabular-nums">
              {fmt(financials.totalBookingAmount)}
            </span>
          </div>
        )}

        {financials.remainingBalance != null && !isRefund && (
          <div className="flex justify-between items-center text-xs mt-1.5">
            <span className="text-slate-500">Remaining Balance</span>
            <span
              className={`font-bold tabular-nums ${
                financials.remainingBalance > 0 ? "text-[#4C81E0]" : "text-emerald-600"
              }`}
            >
              {financials.remainingBalance > 0
                ? fmt(financials.remainingBalance)
                : "Settled (₱0.00)"}
            </span>
          </div>
        )}

        {isRefund && (
          <div className="flex justify-between items-center text-xs mt-2">
            <span className="text-slate-500">Transaction Effect</span>
            <span className={`font-semibold ${isDenied ? "text-rose-600" : "text-slate-700"}`}>
              {isDenied ? "Denied — No Disbursement" : "Account Credited / Settled"}
            </span>
          </div>
        )}
      </div>

      {/* Payment Proof Button (Admin Only, if proof image exists) */}
      {isAdmin && (payment.proof_url || payment.proof_image || payment.proof_of_payment) && onViewProof && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => onViewProof(payment.proof_url || payment.proof_image || payment.proof_of_payment)}
            className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>View Uploaded Payment Proof</span>
          </button>
        </div>
      )}

      {/* 6. Bottom Security Assurance */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 text-slate-400 select-none">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[10px] text-center">
          {isAdmin
            ? "Official administrative record verified by iReserve reservation management"
            : "Official customer copy verified by iReserve reservation management"}
        </span>
      </div>
    </div>
  );
}
