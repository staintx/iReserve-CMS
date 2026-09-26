import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { 
  CreditCard, 
  Banknote, 
  Check, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Loader2,
  Calendar,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PaymentChoiceModal({
  open,
  onClose,
  booking,
  balanceAmount,
  remainingBalance,
  onSuccess,
  onPaymentSelected
}) {
  const { notify } = useToast();
  const [selectedMethod, setSelectedMethod] = useState(
    booking?.balance_payment_preference === "in_person" ? "in_person" : "online"
  );
  const [notes, setNotes] = useState(booking?.balance_payment_notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && booking) {
      setSelectedMethod(
        booking?.balance_payment_preference === "in_person" ? "in_person" : "online"
      );
      setNotes(booking?.balance_payment_notes || "");
      setIsSubmitting(false);
    }
  }, [open, booking]);

  if (!open || !booking) return null;

  const rawPayable = balanceAmount != null
    ? balanceAmount
    : remainingBalance != null
    ? remainingBalance
    : (booking?.remaining_balance ?? booking?.quotation_id?.remaining_balance ?? 0);

  const payable = Math.max(0, Number(rawPayable || 0));
  const refCode = booking.reference || (booking._id ? booking._id.slice(-8).toUpperCase() : "-");
  const eventDateStr = booking.event_date
    ? new Date(booking.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : "Event Date";

  const handleProceed = async () => {
    if (payable <= 0) {
      notify("No remaining balance found for this booking.", "info");
      onClose();
      return;
    }

    if (selectedMethod === "online" && typeof onPaymentSelected === "function") {
      onPaymentSelected("online");
      return;
    }

    setIsSubmitting(true);

    if (selectedMethod === "online") {
      try {
        notify("Generating secure PayMongo checkout...", "info");
        const res = await CustomerAPI.createPaymentCheckout({
          booking_id: booking._id,
          amount: payable,
          payment_type: "balance"
        });

        if (res.data?.checkout_url) {
          window.location.assign(res.data.checkout_url);
        } else {
          notify("Could not generate checkout session.", "error");
          setIsSubmitting(false);
        }
      } catch (err) {
        notify(err.response?.data?.message || "Failed to start online checkout.", "error");
        setIsSubmitting(false);
      }
    } else {
      // In-Person Cash Payment
      try {
        await CustomerAPI.setPaymentPreference({
          booking_id: booking._id,
          preference: "in_person",
          notes: notes.trim()
        });

        notify("In-person cash payment confirmed for event day.", "success", {
          description: `Please prepare ₱${payable.toLocaleString("en-PH", { minimumFractionDigits: 2 })} in cash for your Event Manager after event completion.`
        });
        if (onSuccess) onSuccess();
        onClose();
      } catch (err) {
        notify(err.response?.data?.message || "Failed to set payment preference.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const footerContent = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full font-sans">
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        {selectedMethod === "online" ? (
          <>
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>256-bit encrypted checkout · PayMongo</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Official receipt issued on-site upon handover</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleProceed}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Processing...</span>
            </>
          ) : selectedMethod === "online" ? (
            <>
              <span>Proceed to Online Checkout</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </>
          ) : (
            <>
              <span>Confirm Cash on Event Day</span>
              <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      title="Settle Remaining Balance"
      description={`Booking #${refCode} · ${booking.event_type || "Catering Event"}`}
      onClose={onClose}
      footer={footerContent}
      className="max-w-xl font-sans"
    >
      <div className="space-y-4 py-1 text-slate-800 font-sans">
        {/* 1. Primary Financial Anchor & Due Date Header Card */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {/* Balance Amount */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Remaining Balance Due
              </span>
              <div className="flex items-baseline gap-1 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                <span className="text-2xl sm:text-3xl font-bold text-slate-700">₱</span>
                <span>{payable.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Final payment to complete your reservation
              </p>
            </div>

            {/* Due Date Indicator */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Payment Due</span>
              </div>
              <div className="text-sm sm:text-[15px] font-bold text-slate-900 mt-0.5">
                {eventDateStr}
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 mt-1">
                On Event Day
              </span>
            </div>
          </div>
        </div>

        {/* 2. Transparent Payment Schedule Policy */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-700">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-900">Payment Schedule Policy:</span> The remaining balance is due <span className="font-semibold text-slate-900">the same day after your event has concluded</span>. You can pay securely online now, or hand exact cash directly to your assigned Event Manager on-site.
          </div>
        </div>

        {/* 3. Payment Method Selection */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Select Payment Mode
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              Choose one option below
            </span>
          </div>

          {/* Option 1: Pay Online */}
          <button
            type="button"
            onClick={() => setSelectedMethod("online")}
            role="radio"
            aria-checked={selectedMethod === "online"}
            className={cn(
              "w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 relative flex items-start sm:items-center justify-between gap-3 cursor-pointer",
              selectedMethod === "online"
                ? "border-amber-600 bg-amber-50/40 shadow-xs ring-1 ring-amber-600/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs"
            )}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "p-2.5 rounded-xl flex-shrink-0 transition-colors",
                  selectedMethod === "online"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    Pay Online (Card or E-Wallet)
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Instant Confirmation
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  GCash, Maya, GrabPay, Visa, Mastercard, BPI or UnionBank. Instant official receipt issued automatically.
                </p>
              </div>
            </div>

            {/* Custom Radio Button Indicator */}
            <div className="flex items-center justify-center shrink-0 mt-1 sm:mt-0">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedMethod === "online"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-slate-300 bg-white"
                )}
              >
                {selectedMethod === "online" && (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </div>
            </div>
          </button>

          {/* Option 2: Pay in Person */}
          <button
            type="button"
            onClick={() => setSelectedMethod("in_person")}
            role="radio"
            aria-checked={selectedMethod === "in_person"}
            className={cn(
              "w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 relative flex items-start sm:items-center justify-between gap-3 cursor-pointer",
              selectedMethod === "in_person"
                ? "border-amber-600 bg-amber-50/40 shadow-xs ring-1 ring-amber-600/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs"
            )}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "p-2.5 rounded-xl flex-shrink-0 transition-colors",
                  selectedMethod === "in_person"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                <Banknote className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    Pay in Person (Cash on Event Day)
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    On-Site Settlement
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hand exact cash directly to your assigned Event Manager after your event has successfully concluded.
                </p>
              </div>
            </div>

            {/* Custom Radio Button Indicator */}
            <div className="flex items-center justify-center shrink-0 mt-1 sm:mt-0">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedMethod === "in_person"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-slate-300 bg-white"
                )}
              >
                {selectedMethod === "in_person" && (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </div>
            </div>
          </button>
        </div>

        {/* 4. In-Person Cash Preparation Details Note */}
        {selectedMethod === "in_person" && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/80">
              <span className="text-slate-600 font-medium">Exact Cash Amount to Prepare:</span>
              <span className="font-bold text-slate-900 text-sm">
                ₱{payable.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Note for Event Manager (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Authorized payer name, or bill denomination breakdown"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={100}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Mobile Security Reassurance Note */}
        <div className="sm:hidden flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-500 font-medium">
          {selectedMethod === "online" ? (
            <>
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>256-bit encrypted checkout via PayMongo</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Official on-site receipt provided</span>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
