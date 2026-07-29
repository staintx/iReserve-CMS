import { useState } from "react";
import { CreditCard, Smartphone, Banknote, ShieldCheck, Loader2 } from "lucide-react";
import { Card, SH, GoldBtn } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

export default function StepPayment({ depositAmount, totalPrice, isFoodOnly, isSubmitting, onSubmit, onBack, error }) {
  const [selectedMethod, setSelectedMethod] = useState("gcash");
  
  const paymentMethods = [
    { id: "gcash", name: "GCash", icon: Smartphone, color: "text-blue-500", desc: "Pay securely via GCash" },
    { id: "paymaya", name: "Maya", icon: Smartphone, color: "text-emerald-500", desc: "Pay securely via Maya" },
    { id: "card", name: "Credit / Debit Card", icon: CreditCard, color: "text-slate-500", desc: "Visa, Mastercard, JCB" },
    { id: "online_banking", name: "Online Banking", icon: Banknote, color: "text-orange-500", desc: "BPI, UnionBank, etc." },
  ];

  if (isFoodOnly) {
    paymentMethods.push({
      id: "cod",
      name: "Cash on Delivery (COD)",
      icon: Banknote,
      color: "text-amber-500",
      desc: "Pay cash when your food is delivered"
    });
  }

  const handlePay = () => {
    onSubmit(selectedMethod);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <SH title="Payment Method" sub="Select how you want to pay the deposit." />
        <div className="text-left sm:text-right bg-[#D4AF37]/10 rounded-xl p-4 border border-[#D4AF37]/20">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E]">{selectedMethod === "cod" ? "Total on Delivery" : "Deposit to Pay Now"}</p>
          <p className="text-2xl font-bold text-[#D4AF37]" style={{ fontFamily: "Playfair Display, serif" }}>₱{selectedMethod === "cod" ? totalPrice?.toLocaleString() : depositAmount?.toLocaleString()}</p>
        </div>
      </div>

      <Card className="p-6 sm:p-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <div className="mb-8 space-y-4">
          {paymentMethods.map(method => {
            const isSelected = selectedMethod === method.id;
            const Icon = method.icon;
            
            return (
              <label 
                key={method.id} 
                className={cn(
                  "flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 sm:p-5 transition-all",
                  isSelected ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-black/[0.08] bg-white hover:border-[#D4AF37]/40",
                  isSubmitting ? "cursor-not-allowed opacity-50" : ""
                )}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={method.id}
                  checked={isSelected}
                  onChange={() => !isSubmitting && setSelectedMethod(method.id)}
                  disabled={isSubmitting}
                  className="h-5 w-5 border-black/20 text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <div className={cn("rounded-xl p-3", isSelected ? "bg-white shadow-sm" : "bg-[#F7F4EE]")}>
                  <Icon className={cn("h-6 w-6", method.color)} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#111]">{method.name}</h4>
                  <p className="mt-0.5 text-xs text-[#6B6657]">{method.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
        
        <div className="mb-8 flex items-center justify-between rounded-xl border border-black/10 bg-[#F7F4EE] p-5">
          <div className="flex items-center gap-3 text-sm text-[#6B6657]">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Payments are securely processed by <strong className="text-[#111]">PayMongo</strong>.</span>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch justify-between gap-3 pt-4 border-t border-black/10">
          <GoldBtn
            variant="ghost"
            onClick={onBack}
            className="w-full sm:w-auto px-8 py-4"
          >
            Back
          </GoldBtn>
          <GoldBtn
            onClick={handlePay}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-10 py-6 text-lg shadow-md"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </div>
            ) : selectedMethod === "cod" ? (
              "Place Order (COD)"
            ) : (
              `Pay ₱${depositAmount?.toLocaleString()}`
            )}
          </GoldBtn>
        </div>
      </Card>
    </div>
  );
}
