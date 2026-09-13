import React from "react";
import { 
  Printer, 
  X, 
  CreditCard, 
  FileText 
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../../components/ui/dialog";
import CateringInvoiceDocument from "./CateringInvoiceDocument";
import { formatCurrency } from "../../../utils/format";

export default function InvoiceModal({
  open,
  onClose,
  booking,
  quotation,
  inquiry,
  payments = [],
  businessInfo = {},
  context = "customer", // "customer" or "admin"
  onPay = null,
  isPaying = false
}) {

  if (!open) return null;

  const grandTotal = Number(booking?.total_price || quotation?.total_cost || inquiry?.total_price || 0);
  const approvedPayments = payments.filter(
    (p) => p.status === "approved" || p.status === "Paid" || p.status === "completed"
  );
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, grandTotal - totalPaid);
  const isPaidInFull = remainingBalance <= 0 && grandTotal > 0;

  const handlePrint = () => {
    window.print();
  };

  const refCode = booking?.reference || quotation?.quotation_number || quotation?.reference || "STATEMENT";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose && onClose()}>
      <DialogContent className="block w-full max-w-4xl max-h-[94vh] p-0 overflow-hidden bg-slate-100/90 border border-slate-300 rounded-xl shadow-2xl focus:outline-none flex flex-col print:max-w-none print:max-h-none print:overflow-visible print:bg-white print:border-none print:shadow-none print:p-0 print:m-0 print:block">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E3563]/10 text-[#1E3563] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {quotation && !booking ? "Catering Quotation & Cost Estimate" : "Official Invoice & Statement"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 font-mono">
                Ref: {refCode} · Caezelle’s Food, Catering & Services
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Customer Online Payment Button */}
            {context === "customer" && !isPaidInFull && remainingBalance > 0 && onPay && (
              <button
                type="button"
                onClick={onPay}
                disabled={isPaying}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E3563] hover:bg-[#152542] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isPaying ? "Processing..." : `Pay ${totalPaid === 0 ? "Deposit / Balance" : "Balance"} (${formatCurrency(remainingBalance)})`}</span>
              </button>
            )}

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              title="Print Document or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden xs:inline">Print / PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Paper Container */}
        <div className="overflow-y-auto p-4 sm:p-6 sm:pb-10 [scrollbar-width:thin] flex-1 print:overflow-visible print:p-0 print:m-0 print:h-auto print:max-h-none">
          <div className="shadow-lg rounded-sm overflow-hidden bg-white mx-auto print:shadow-none print:m-0 print:overflow-visible">
            <CateringInvoiceDocument
              booking={booking}
              quotation={quotation}
              inquiry={inquiry}
              payments={payments}
              businessInfo={businessInfo}
              context={context}
            />
          </div>

          {/* Bottom mobile payment CTA for customer */}
          {context === "customer" && !isPaidInFull && remainingBalance > 0 && onPay && (
            <div className="mt-4 sm:hidden print:hidden">
              <button
                type="button"
                onClick={onPay}
                disabled={isPaying}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#1E3563] text-white font-bold text-xs shadow-md"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Balance ({formatCurrency(remainingBalance)})</span>
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
