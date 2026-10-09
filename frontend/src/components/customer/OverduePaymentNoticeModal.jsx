import React from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../common/Modal";
import { formatCurrency, formatShortDate } from "../../utils/format";
import { 
  AlertTriangle, 
  CreditCard, 
  Calendar, 
  ArrowRight, 
  ShieldAlert,
  ChevronRight,
  Receipt
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export default function OverduePaymentNoticeModal({
  open,
  onClose,
  mode = "inquiry_block", // "inquiry_block" | "login"
  overdueBookings = [],
  onPayBooking = null,
}) {
  const navigate = useNavigate();

  if (!open || !overdueBookings || overdueBookings.length === 0) return null;

  const isLoginMode = mode === "login";
  const isMultiple = overdueBookings.length > 1;
  const primaryBooking = overdueBookings[0];

  const totalOverdue = overdueBookings.reduce(
    (sum, b) => sum + (Number(b.overdue_amount || b.remaining_balance || 0)),
    0
  );

  const handleViewAndPay = (booking) => {
    if (onClose) onClose();
    if (typeof onPayBooking === "function") {
      onPayBooking(booking);
      return;
    }
    if (booking?._id) {
      navigate(`/customer/bookings/${booking._id}?tab=financials`);
    } else {
      navigate("/customer/bookings");
    }
  };

  const title = isLoginMode
    ? "You Have an Overdue Payment"
    : "Outstanding Payment Required";

  const description = isLoginMode
    ? "One of your previous events still has an unpaid balance past its due date. Please settle the outstanding amount before requesting another event."
    : "You have an overdue remaining balance for a previous event. Please settle your outstanding payment before submitting a new event inquiry or custom request.";

  const footerContent = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full font-sans">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>Settlement required to unlock new event requests</span>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="w-full sm:w-auto text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer h-9 px-4"
        >
          Close
        </Button>

        {!isMultiple && (
          <Button
            type="button"
            onClick={() => handleViewAndPay(primaryBooking)}
            className="w-full sm:w-auto text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-xs cursor-pointer h-9 px-5 gap-1.5"
          >
            <CreditCard className="w-4 h-4" />
            <span>View Booking &amp; Pay</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      footer={footerContent}
      className="max-w-xl font-sans"
    >
      <div className="space-y-4 py-1 text-slate-800 font-sans">
        {/* Urgent Warning Header Banner */}
        <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-rose-950 font-sans">
                {isMultiple
                  ? `${overdueBookings.length} Overdue Booking Payments Found`
                  : "Payment Past Due Date"}
              </h4>
              <span className="text-[11px] font-mono font-bold text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded border border-rose-200">
                Total Due: {formatCurrency(totalOverdue)}
              </span>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed font-medium">
              Payment was due a day after your event date. You can settle securely online via card or e-wallet, or contact management for assistance.
            </p>
          </div>
        </div>

        {/* Affected Bookings List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>{isMultiple ? "Affected Bookings" : "Booking Details"}</span>
            <span className="text-[11px] font-normal text-slate-400 capitalize">
              {overdueBookings.length} {overdueBookings.length === 1 ? "booking" : "bookings"}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto [scrollbar-width:thin] pr-0.5">
            {overdueBookings.map((bkg) => {
              const ref = bkg.reference || `CAZ-${String(bkg._id).slice(-6).toUpperCase()}`;
              const eventName = bkg.event_name || bkg.event_type || "Catering Event";
              const amount = Number(bkg.overdue_amount || bkg.remaining_balance || 0);

              return (
                <div
                  key={bkg._id}
                  className="p-3.5 rounded-xl border border-rose-200/80 bg-white hover:border-rose-300 shadow-2xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {eventName}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          #{ref}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                        {bkg.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Event: {formatShortDate(bkg.event_date)}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                          Payment Overdue
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Outstanding Balance
                      </span>
                      <span className="text-base font-extrabold text-rose-700 font-sans block">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  </div>

                  {/* Per-item View & Pay CTA (especially useful when multiple overdue) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-slate-400" />
                      Invoice &amp; online checkout available
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleViewAndPay(bkg)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-7.5 px-3 rounded-lg shadow-2xs gap-1 cursor-pointer"
                    >
                      <span>View Booking &amp; Pay</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
