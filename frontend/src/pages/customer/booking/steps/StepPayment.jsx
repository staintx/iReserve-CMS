import { useState } from "react";
import { CreditCard, Smartphone, Banknote, ShieldCheck, Loader2 } from "lucide-react";
import { Card, SH, PrimaryBtn } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

export default function StepPayment({ depositAmount, totalPrice, isFoodOnly, isSubmitting, onSubmit, onBack, error, selectedPaymentOption, setSelectedPaymentOption }) {
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
    onSubmit(selectedMethod, selectedPaymentOption);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <SH title="Payment Method" sub="Choose whether to pay the deposit or the full amount, and select a payment method." />
        <div className="text-left sm:text-right bg-[#4C81E0]/10 rounded-xl p-4 border border-[#4C81E0]/20">
          <div className="mb-2 flex gap-3 items-center">
            <label className="flex items-center gap-2 text-xs">
              <input type="radio" className="h-4 w-4" checked={selectedPaymentOption !== "full"} onChange={() => setSelectedPaymentOption("deposit")} />
              <span>Pay Deposit</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="radio" className="h-4 w-4" checked={selectedPaymentOption === "full"} onChange={() => setSelectedPaymentOption("full")} />
              <span>Pay Full Amount</span>
            </label>
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{selectedMethod === "cod" ? "Total on Delivery" : (selectedPaymentOption === "full" ? "Total" : "Amount to Pay Now")}</p>
          <p className="text-2xl font-bold text-[#4C81E0]" style={{ fontFamily: "Playfair Display, serif" }}>₱{selectedMethod === "cod" ? totalPrice?.toLocaleString() : (selectedPaymentOption === "full" ? totalPrice?.toLocaleString() : depositAmount?.toLocaleString())}</p>
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
                  isSelected ? "border-[#4C81E0] bg-[#4C81E0]/5" : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40",
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
                  className="h-5 w-5 border-[#CBD5E1] text-[#4C81E0] focus:ring-[#4C81E0]"
                />
                <div className={cn("rounded-xl p-3", isSelected ? "bg-white shadow-sm" : "bg-[#F8FAFC]")}>
                  <Icon className={cn("h-6 w-6", method.color)} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#1E293B]">{method.name}</h4>
                  <p className="mt-0.5 text-xs text-[#64748B]">{method.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
        
        <div className="mb-8 flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
          <div className="flex items-center gap-3 text-sm text-[#64748B]">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Payments are securely processed by <strong className="text-[#1E293B]">PayMongo</strong>.</span>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
          <PrimaryBtn
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
              selectedPaymentOption === "full" ? `Pay ₱${totalPrice?.toLocaleString()}` : `Pay ₱${depositAmount?.toLocaleString()}`
            )}
          </PrimaryBtn>
        </div>
      </Card>
    </div>
  );
}
