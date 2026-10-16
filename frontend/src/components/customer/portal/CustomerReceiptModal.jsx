import React, { useEffect } from "react";
import { Printer, X, Receipt, RefreshCcw } from "lucide-react";
import { Button } from "../../ui/button";
import useBusinessInfo from "../../../hooks/useBusinessInfo";
import CustomerPrintReceipt from "./CustomerPrintReceipt";
import CateringReceiptDocument from "../../common/receipt/CateringReceiptDocument";
import { getReceiptNumber } from "../../../utils/receiptHelpers";

export default function CustomerReceiptModal({
  payment,
  booking,
  onClose,
  formatCurrency,
  businessInfo: propBusinessInfo,
}) {
  const fetchedBusinessInfo = useBusinessInfo(propBusinessInfo);
  const businessInfo = propBusinessInfo || fetchedBusinessInfo || {};

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

  const isRefund =
    (payment.payment_type || "").toLowerCase() === "refund" ||
    Number(payment.amount) < 0;
  const receiptNumber = getReceiptNumber(payment);

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
        aria-label={isRefund ? "Refund Transaction" : "Payment Receipt"}
      >
        <div className="w-full sm:max-w-[500px] max-sm:max-h-[92vh] sm:max-h-[90vh] bg-white text-slate-900 max-sm:rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col my-0 sm:my-auto animate-in zoom-in-95 duration-200">
          
          {/* ── Modal Top Header & Actions ── */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-white border-b border-slate-200/90 flex items-center justify-between gap-2.5 shrink-0 select-none print:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#EFF6FF]"
              >
                {isRefund ? (
                  <RefreshCcw className="w-4 h-4 text-[#4C81E0]" />
                ) : (
                  <Receipt className="w-4 h-4 text-[#4C81E0]" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {isRefund ? "Refund Voucher" : "Payment Receipt"}
                </h3>
                <p className="text-xs text-slate-500 leading-tight font-mono tabular-nums mt-0.5">
                  {receiptNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold bg-[#4C81E0] hover:bg-[#3b6ecc] text-white gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title={isRefund ? "Print Refund Voucher or Save as PDF" : "Print Receipt or Save as PDF"}
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Print</span>
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close receipt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Scrollable Document Preview Workspace ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 [scrollbar-width:thin] bg-white">
            <CateringReceiptDocument
              payment={payment}
              booking={booking}
              businessInfo={businessInfo}
              formatCurrency={formatCurrency}
              isAdmin={false}
              isPrint={false}
            />
          </div>

          {/* ── Bottom Sheet Done Footer matching Mobile ── */}
          <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-white select-none print:hidden shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 bg-[#4C81E0] hover:bg-[#3b6ecc] text-white font-bold rounded-xl flex items-center justify-center text-sm transition-colors shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* ── Dedicated A4 Print-Only Document (Portaled to body) ── */}
      <CustomerPrintReceipt
        payment={payment}
        booking={booking}
        formatCurrency={formatCurrency}
        businessInfo={businessInfo}
      />
    </>
  );
}

