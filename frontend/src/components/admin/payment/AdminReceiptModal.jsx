import React, { useEffect } from "react";
import {
  Printer,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Calendar,
  CreditCard,
  Receipt,
  User,
  ShieldCheck,
  Building2,
  FileText,
  ExternalLink,
  Phone,
  Mail,
  Eye,
} from "lucide-react";
import { Button } from "../../ui/button";
import useBusinessInfo from "../../../hooks/useBusinessInfo";
import AdminPrintReceipt from "./AdminPrintReceipt";
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

export default function AdminReceiptModal({
  isOpen,
  payment,
  booking = null,
  businessInfo: propBusinessInfo = null,
  onClose,
  onViewProof = null,
  formatCurrency = null,
}) {
  const fetchedBusinessInfo = useBusinessInfo(propBusinessInfo);
  const businessInfo = propBusinessInfo || fetchedBusinessInfo || {};

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("has-receipt-modal");

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("has-receipt-modal");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !payment) return null;

  const isRefund = String(payment.payment_type || "").toLowerCase() === "refund";
  const receiptNumber = getReceiptNumber(payment);
  const paidAt = payment.paid_at || payment.createdAt;
  const paymentStatus = String(payment.status || "approved").toLowerCase();

  const customer = getReceiptCustomerDetails(payment, booking);
  const bookingDetails = getReceiptBookingDetails(payment, booking);
  const biz = getReceiptBusinessInfo(businessInfo);
  const signatory = getReceiptSignatory(payment, booking);

  const fmt = (val) =>
    formatCurrency ? formatCurrency(val) : formatReceiptCurrency(val, { isRefund });

  const milestoneLabel = getReceiptMilestoneLabel(payment.payment_type);
  const methodLabel = getReceiptPaymentMethod(payment);

  // Status Badge Configuration
  const getStatusBadgeConfig = () => {
    if (isRefund) {
      if (["approved", "completed", "paid", "refunded", "succeeded"].includes(paymentStatus)) {
        return {
          label: "Refund Completed",
          icon: RotateCcw,
          cls: "text-rose-700 bg-rose-50 border-rose-200/70",
        };
      }
      if (paymentStatus === "pending") {
        return {
          label: "Refund Pending",
          icon: Clock,
          cls: "text-amber-700 bg-amber-50 border-amber-200/70",
        };
      }
      return {
        label: "Refund Failed",
        icon: XCircle,
        cls: "text-rose-800 bg-rose-100/70 border-rose-300",
      };
    }

    if (["approved", "paid", "succeeded"].includes(paymentStatus)) {
      return {
        label: "Paid & Approved",
        icon: CheckCircle2,
        cls: "text-emerald-700 bg-emerald-50 border-emerald-200/70",
      };
    }
    if (paymentStatus === "pending") {
      return {
        label: "Pending Verification",
        icon: Clock,
        cls: "text-amber-700 bg-amber-50 border-amber-200/70",
      };
    }
    return {
      label: "Payment Failed",
      icon: XCircle,
      cls: "text-rose-800 bg-rose-50 border-rose-200/70",
    };
  };

  const statusConfig = getStatusBadgeConfig();
  const StatusIcon = statusConfig.icon;

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
        aria-label={isRefund ? "Refund Voucher" : "Payment Receipt"}
      >
        <div className="w-full sm:max-w-[540px] max-sm:max-h-[92vh] sm:max-h-[90vh] bg-white text-slate-900 max-sm:rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col my-0 sm:my-auto animate-in zoom-in-95 duration-200">
          
          {/* ── Modal Top Header & Actions ── */}
          <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 bg-slate-50/95 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0 select-none print:hidden">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isRefund ? "bg-rose-500/10 text-rose-600" : "bg-[#2C4B8A]/10 text-[#2C4B8A]"
                }`}
              >
                {isRefund ? <RotateCcw className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    {isRefund ? "Refund Voucher" : "Payment Receipt"}
                  </h3>
                  <span className="text-[10px] font-mono font-semibold text-[#2C4B8A] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 leading-none">
                    {receiptNumber}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  Official Administrative Acknowledgment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold bg-[#2C4B8A] hover:bg-[#203766] text-white gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Print 80mm Thermal Receipt or Save as PDF"
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
            
            {/* 1. Dynamic Business Header */}
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

            {/* 2. Amount Paid (Hero Section) */}
            <div className="flex flex-col xs:flex-row sm:flex-row items-start xs:items-center sm:items-center justify-between gap-2 p-3 sm:p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">
                  {isRefund ? "Amount Refunded" : "Amount Paid"}
                </span>
                <div
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 tabular-nums leading-none ${
                    isRefund ? "text-rose-600 font-mono" : "text-slate-900"
                  }`}
                >
                  {fmt(payment.amount)}
                </div>
              </div>
              <div className="flex xs:flex-col sm:flex-col items-start xs:items-end sm:items-end gap-1 w-full xs:w-auto sm:w-auto justify-between xs:justify-start">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.cls}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig.label}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {formatReceiptDateTime(paidAt)}
                </span>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-dashed border-slate-200" />

            {/* 3. Section 1: Payment Details */}
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
                    {milestoneLabel}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Payment Method
                  </span>
                  <span className="font-medium text-slate-900 inline-flex items-center gap-1">
                    {methodLabel}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Payment Channel / Gateway
                  </span>
                  <span className="font-medium text-slate-800">
                    {payment.gateway === "paymongo"
                      ? "PayMongo Online Gateway"
                      : "Direct / Manual Processing"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Currency
                  </span>
                  <span className="font-mono text-slate-800">
                    {payment.currency || "PHP"}
                  </span>
                </div>
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
                    {bookingDetails.bookingRef}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Event Type
                  </span>
                  <span className="font-medium text-slate-900">
                    {bookingDetails.eventType || "Catering Event"}
                  </span>
                </div>

                {bookingDetails.packageName && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Catering Package
                    </span>
                    <span
                      className="font-medium text-slate-900 truncate block"
                      title={bookingDetails.packageName}
                    >
                      {bookingDetails.packageName}
                    </span>
                  </div>
                )}

                {bookingDetails.eventDate && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Event Date
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatReceiptEventDate(bookingDetails.eventDate, { long: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-dashed border-slate-200" />

            {/* 5. Section 3: Customer / Payer Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="w-3.5 h-3.5 text-[#2C4B8A]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {isRefund ? "Refund Beneficiary Details" : "Customer / Payer Details"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {isRefund ? "Recipient" : "Billed To"}
                  </span>
                  <span className="font-bold text-slate-900">
                    {customer.name}
                  </span>
                </div>

                {customer.phone && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Contact Number
                    </span>
                    <a
                      href={`tel:${customer.phone}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}

                {customer.email && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Email Address
                    </span>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-slate-700 break-all select-all hover:text-primary hover:underline block"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-dashed border-slate-200" />

            {/* 6. Section 4: Transaction & Admin Verification Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2C4B8A]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Transaction &amp; Admin Verification
                </span>
              </div>

              <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Internal Payment ID
                    </span>
                    <span className="font-mono text-[11px] text-slate-700 break-all select-all block">
                      {payment._id}
                    </span>
                  </div>

                  {(payment.gateway_reference || payment.reference_number) && (
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        Gateway / Transaction Ref
                      </span>
                      <span className="font-mono text-[11px] text-slate-900 font-semibold break-all select-all block">
                        {payment.gateway_reference || payment.reference_number}
                      </span>
                    </div>
                  )}

                  {payment.gateway_checkout_id && (
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-slate-500 font-medium block">
                        Gateway Checkout Session ID
                      </span>
                      <span className="font-mono text-[11px] text-slate-700 break-all select-all block">
                        {payment.gateway_checkout_id}
                      </span>
                    </div>
                  )}

                  {payment.gateway_payment_intent_id && (
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-slate-500 font-medium block">
                        Payment Intent ID
                      </span>
                      <span className="font-mono text-[11px] text-slate-700 break-all select-all block">
                        {payment.gateway_payment_intent_id}
                      </span>
                    </div>
                  )}
                </div>

                {/* Refund reason or manual notes if present */}
                {(payment.metadata?.reason || payment.metadata?.notes) && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-600 block uppercase">
                      {isRefund ? "Refund Reason / Administrative Note" : "Administrative Notes"}
                    </span>
                    <p className="text-slate-700 text-xs mt-0.5 leading-relaxed bg-white/80 p-2 rounded border border-slate-200/60">
                      {payment.metadata?.reason || payment.metadata?.notes}
                    </p>
                  </div>
                )}

                {/* Attached Proof thumbnail trigger */}
                {payment.proof_url && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Payment Proof Document Attached
                    </span>
                    {onViewProof ? (
                      <button
                        type="button"
                        onClick={() => onViewProof(payment.proof_url)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Proof
                      </button>
                    ) : (
                      <a
                        href={payment.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Proof
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-slate-200/80" />

            {/* 7. Authorized Signature Section */}
            <div className="flex items-end justify-between pt-1 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  Document Status
                </span>
                <span className="font-semibold text-slate-800 text-[11px]">
                  {statusConfig.label}
                </span>
              </div>
              <div className="text-right">
                <div className="border-b border-slate-400 w-36 ml-auto mb-1" />
                {signatory.name ? (
                  <>
                    <span className="font-bold text-xs text-slate-900 block leading-tight">
                      {signatory.name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase block font-medium">
                      {signatory.role || "Authorized Signatory"}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 uppercase block font-medium">
                    Authorized Signature
                  </span>
                )}
              </div>
            </div>

            {/* 8. Footer Note */}
            <div className="text-center pt-1 pb-1 space-y-0.5 text-slate-500 border-t border-slate-100">
              <p className="text-[11px] font-medium text-slate-700">
                Official electronic payment acknowledgment • iReserve CMS
              </p>
              <p className="text-[10px] text-slate-400">
                Generated securely from verified payment records
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ── Dedicated Print-Only Layout (Portaled to body, isolated from UI) ── */}
      <AdminPrintReceipt
        payment={payment}
        booking={booking}
        businessInfo={businessInfo}
        formatCurrency={formatCurrency}
      />
    </>
  );
}
