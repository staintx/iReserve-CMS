import React from "react";
import { CheckCircle2, Calendar, User, Package as PackageIcon, DollarSign, AlertTriangle, X } from "lucide-react";
import Modal from "../../common/Modal";

export default function ConvertBookingModal({ quote, onClose, onConfirm, submitting }) {
  if (!quote) return null;

  const customerName = quote.customer_id?.full_name 
    || `${quote.contact_first_name || ''} ${quote.contact_last_name || ''}`.trim() 
    || "Customer";

  const eventType = quote.event_type || "Event";
  const eventDateStr = quote.event_date 
    ? new Date(quote.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) 
    : "TBA";

  const packageName = quote.package_id?.name 
    || (quote.had_package_selection ? "Package Selected (Unavailable)" : "Custom Quote / No Package");

  const totalAmount = quote.total_price || quote.total_cost || quote.subtotal || 0;

  return (
    <Modal onClose={onClose} className="max-w-lg w-full p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
      <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5 bg-white relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner shrink-0 border-4 border-emerald-50 mt-1">
          <CheckCircle2 size={36} />
        </div>

        {/* Title & Message */}
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            Convert Quotation to Confirmed Booking
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Are you sure you want to finalize this accepted quotation and convert it into an active, confirmed booking?
          </p>
        </div>

        {/* Booking Summary Box */}
        <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-left space-y-2.5 text-xs sm:text-sm">
          <div className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/60 pb-1.5 mb-2 flex items-center justify-between">
            <span>Booking Summary</span>
            <span className="font-mono text-slate-500 font-normal">REF: {quote.reference || (quote._id ? quote._id.slice(-8).toUpperCase() : '')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <User size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-400">Customer:</span>
              <span className="font-semibold text-slate-900 truncate">{customerName}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <PackageIcon size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-400">Event:</span>
              <span className="font-semibold text-slate-900 truncate">{eventType}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-400">Date:</span>
              <span className="font-semibold text-slate-900 truncate">{eventDateStr}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <PackageIcon size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-400">Package:</span>
              <span className="font-semibold text-slate-900 truncate">{packageName}</span>
            </div>

            {totalAmount > 0 && (
              <div className="flex items-center gap-2 text-slate-700 sm:col-span-2 pt-1 border-t border-slate-200/40">
                <DollarSign size={14} className="text-emerald-500 shrink-0" />
                <span className="text-slate-400">Quoted Total:</span>
                <span className="font-bold text-emerald-700 text-sm">₱{Number(totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Notice */}
        <div className="w-full p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-left text-xs text-amber-800">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Important:</strong> This action will lock the event date on the reservation calendar and reserve package inventory.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <CheckCircle2 size={15} />
            )}
            {submitting ? "Converting..." : "Yes, Convert to Booking"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
