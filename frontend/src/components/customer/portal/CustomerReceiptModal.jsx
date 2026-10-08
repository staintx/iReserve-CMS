import { useEffect } from "react";
import { Printer, X, CheckCircle2, Calendar, CreditCard, Receipt, FileText, User } from "lucide-react";
import { Button } from "../../ui/button";
import useBusinessInfo from "../../../hooks/useBusinessInfo";
import { getReceiptBusinessInfo } from "../../../utils/receiptHelpers";
import CustomerPrintReceipt from "./CustomerPrintReceipt";

export default function CustomerReceiptModal({
  payment,
  booking,
  onClose,
  formatCurrency,
  businessInfo: propBusinessInfo,
}) {
  const fetchedBusinessInfo = useBusinessInfo(propBusinessInfo);
  const businessInfo = propBusinessInfo || fetchedBusinessInfo || {};
  const biz = getReceiptBusinessInfo(businessInfo);

  useEffect(() => {
    document.body.classList.add("has-receipt-modal");
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("has-receipt-modal");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
          month: "short",
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* ── Screen Modal Preview ── */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto caz-receipt-modal-backdrop animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Payment Receipt"
      >
        <div className="w-full sm:max-w-[500px] max-sm:max-h-[92vh] sm:max-h-[90vh] bg-white text-slate-900 max-sm:rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col my-0 sm:my-auto animate-in zoom-in-95 duration-200">
          
          {/* ── Modal Top Header & Actions ── */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-2.5 shrink-0 select-none print:hidden">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    Payment Receipt
                  </h3>
                  <span className="text-[10px] font-mono font-semibold text-[#2C4B8A] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 leading-none">
                    {receiptNumber}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  Official Acknowledgment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold bg-[#2C4B8A] hover:bg-[#203766] text-white gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Print Receipt or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Print</span>
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Close receipt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Scrollable Receipt Content Workspace ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 [scrollbar-width:thin]">
            
            {/* 1. Business Header (Compact & Centered) */}
            <div className="text-center pt-0.5 pb-1">
              <h2 className="text-base sm:text-lg font-bold font-serif tracking-tight text-slate-900">
                {biz.name}
              </h2>
              {biz.address && (
                <p className="text-[11px] text-slate-500">
                  {biz.address}
                </p>
              )}
              {(biz.phone || biz.email) && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {[biz.phone ? `Tel: ${biz.phone}` : null, biz.email].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>

            {/* 2. Amount Paid (Focused Visual Emphasis without oversized card) */}
            <div className="flex flex-col xs:flex-row sm:flex-row items-start xs:items-center sm:items-center justify-between gap-2 p-3 sm:p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">
                  Amount Paid
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5 tabular-nums leading-none">
                  {fmt(payment.amount)}
                </div>
              </div>
              <div className="flex xs:flex-col sm:flex-col items-center xs:items-end sm:items-end gap-1 w-full xs:w-auto sm:w-auto justify-between xs:justify-start">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {paymentStatus === "approved" || paymentStatus === "paid" ? "Paid & Approved" : paymentStatus}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {formatDateTime(paidAt)}
                </span>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-dashed border-slate-200" />

            {/* 3. Section 1: Payment Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <CreditCard className="w-3.5 h-3.5 text-[#2C4B8A]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Payment Details
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Payment Type
                  </span>
                  <span className="font-semibold text-slate-900">
                    {getMilestoneLabel(payment.payment_type)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Payment Method
                  </span>
                  <span className="font-medium text-slate-900 inline-flex items-center gap-1">
                    {getPaymentMethod(payment)}
                  </span>
                </div>

                {transactionRef && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Transaction Reference
                    </span>
                    <span
                      className="font-mono text-[11px] text-slate-700 break-all select-all block"
                      title={transactionRef}
                    >
                      {transactionRef}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-dashed border-slate-200" />

            {/* 4. Section 2: Booking / Event Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-[#2C4B8A]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Booking &amp; Event
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Booking Reference
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {bookingRef}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Event Type
                  </span>
                  <span className="font-medium text-slate-900">
                    {eventType}
                  </span>
                </div>

                {packageName && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Catering Package
                    </span>
                    <span className="font-medium text-slate-900 truncate block" title={packageName}>
                      {packageName}
                    </span>
                  </div>
                )}

                {eventDate && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Event Date
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatEventDate(eventDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-dashed border-slate-200" />

            {/* 5. Section 3: Customer Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="w-3.5 h-3.5 text-[#2C4B8A]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Customer Information
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Billed To
                  </span>
                  <span className="font-bold text-slate-900">
                    {payerName}
                  </span>
                </div>

                {payerPhone && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Contact Number
                    </span>
                    <span className="font-mono text-slate-700">
                      {payerPhone}
                    </span>
                  </div>
                )}

                {payerEmail && payerEmail !== "-" && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Email Address
                    </span>
                    <span className="text-slate-700 break-all select-all block">
                      {payerEmail}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-slate-100" />

            {/* 6. Footer Note */}
            <div className="text-center pt-0.5 pb-1 space-y-0.5 text-slate-500">
              <p className="text-[11px] font-medium text-slate-700">
                Thank you for choosing {biz.name}!
              </p>
              <p className="text-[10px] text-slate-400">
                Official electronic payment acknowledgment • iReserve
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ── Dedicated Print-Only Layout (Preserved Portal) ── */}
      <CustomerPrintReceipt
        payment={payment}
        booking={b}
        formatCurrency={formatCurrency}
        businessInfo={businessInfo}
      />
    </>
  );
}
