import React, { useState } from "react";
import Modal from "../common/Modal";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { 
  CreditCard, 
  Banknote, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  ArrowRight,
  AlertCircle,
  Loader2,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PaymentChoiceModal({
  open,
  onClose,
  booking,
  balanceAmount = 0,
  onSuccess
}) {
  const { notify } = useToast();
  const [selectedMethod, setSelectedMethod] = useState(
    booking?.balance_payment_preference === "in_person" ? "in_person" : "online"
  );
  const [notes, setNotes] = useState(booking?.balance_payment_notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open || !booking) return null;

  const payable = Number(balanceAmount || 0);
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
          description: `Please prepare ₱${payable.toLocaleString()} in cash for your Event Manager after event completion.`
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

  return (
    <Modal
      title="Settle Remaining Balance"
      description={`Booking ${refCode} · ${booking.event_type || "Event"}`}
      onClose={onClose}
      className="max-w-xl"
    >
      <div className="space-y-5 py-1">
        {/* Payable Header Card */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Remaining Balance Due
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-0.5">
              ₱{payable.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700/80 px-3 py-1.5 rounded-xl w-fit">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{eventDateStr}</span>
          </div>
        </div>

        {/* Policy Notice Pill */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Payment Schedule Policy:</span> The remaining balance is due <strong className="font-bold">the same day after your event has been completed</strong>. You may pay online or directly in cash on-site to your Event Manager.
          </div>
        </div>

        {/* Method Selector Options */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Select Your Preferred Payment Mode
          </label>

          {/* Option 1: Pay Online */}
          <button
            type="button"
            onClick={() => setSelectedMethod("online")}
            className={cn(
              "w-full text-left p-4 rounded-2xl border transition-all duration-200 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3",
              selectedMethod === "online"
                ? "border-amber-600 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm ring-1 ring-amber-600/30"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700"
            )}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "p-2.5 rounded-xl flex-shrink-0 transition-colors",
                  selectedMethod === "online"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    Pay Online (PayMongo)
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    Instant
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Pay with GCash, Maya, Visa, Mastercard, or BPI / UBP Online Banking. Instant receipt issued.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center pl-10 sm:pl-0">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedMethod === "online"
                    ? "border-amber-600 bg-amber-600"
                    : "border-gray-300 dark:border-gray-700"
                )}
              >
                {selectedMethod === "online" && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </button>

          {/* Option 2: Pay in Person */}
          <button
            type="button"
            onClick={() => setSelectedMethod("in_person")}
            className={cn(
              "w-full text-left p-4 rounded-2xl border transition-all duration-200 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3",
              selectedMethod === "in_person"
                ? "border-amber-600 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm ring-1 ring-amber-600/30"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700"
            )}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "p-2.5 rounded-xl flex-shrink-0 transition-colors",
                  selectedMethod === "in_person"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}
              >
                <Banknote className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    Pay in Person (Cash on Event Day)
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    On-Site
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Hand exact cash directly to your assigned Event Manager after your event has successfully concluded.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center pl-10 sm:pl-0">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedMethod === "in_person"
                    ? "border-amber-600 bg-amber-600"
                    : "border-gray-300 dark:border-gray-700"
                )}
              >
                {selectedMethod === "in_person" && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </button>
        </div>

        {/* In-Person Details Note */}
        {selectedMethod === "in_person" && (
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/80 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Exact Cash to Prepare:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                ₱{payable.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">
                Note for Event Manager (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Authorized payer name or exact denomination"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={100}
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : selectedMethod === "online" ? (
              <>
                <span>Proceed to Online Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Confirm Cash on Event Day</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
