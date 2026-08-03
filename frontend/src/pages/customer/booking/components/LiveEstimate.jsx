import React from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "../../../../components/ui/button";

const formatCurrency = (value) => {
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function LiveEstimate({ form, totalPrice, depositAmount, depositPercentage, selectedPaymentOption, setSelectedPaymentOption, onNext }) {
  const guestCount = parseInt(form.guest_count || "0", 10);
  
  // Calculate base price dynamically based on selection
  let basePricePerPax = 0;
  if (form.service_type === "Food Only" && form.selected_menu && form.selected_menu.length > 0) {
    basePricePerPax = form.selected_menu.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  } else if (form.service_type === "Food and Event Setup") {
    // Assuming default custom food & event price per pax is 800 based on previous logic
    basePricePerPax = 800; 
  }
  
  const baseTotal = basePricePerPax * guestCount;

  const displayAmount = selectedPaymentOption === "full" ? totalPrice : depositAmount;

  return (
    <div className="w-full flex-shrink-0 lg:w-80">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:p-8" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="hidden lg:block sticky top-24" style={{ maxHeight: 'calc(100vh - 96px)', overflowY: 'auto' }}>
        <h3 className="text-[19px] font-bold text-gray-900 mb-6" style={{ fontFamily: "Inter, sans-serif" }}>Live Estimate</h3>

        <div className="mb-4">
          <label className="flex items-center gap-3">
            <input type="radio" name="pay_option" value="deposit" checked={selectedPaymentOption !== "full"} onChange={() => setSelectedPaymentOption("deposit")} className="h-4 w-4" />
            <span className="text-sm">Pay Deposit</span>
          </label>
          <label className="flex items-center gap-3 mt-2">
            <input type="radio" name="pay_option" value="full" checked={selectedPaymentOption === "full"} onChange={() => setSelectedPaymentOption("full")} className="h-4 w-4" />
            <span className="text-sm">Pay Full Amount</span>
          </label>
        </div>

        <div className="space-y-4 mb-6 text-[14px]">
          {/* Base Package/Pax */}
          {basePricePerPax > 0 && (
            <div className="flex justify-between items-center text-gray-500">
              <span>{guestCount} pax × ₱{basePricePerPax}</span>
              <span className="text-gray-900 font-medium">{formatCurrency(baseTotal)}</span>
            </div>
          )}

          {/* Event Setup Fixed Price (if applicable) */}
          {form.service_type === "Event Setup Only" && (
            <div className="flex justify-between items-center text-gray-500">
              <span>Event Setup</span>
              <span className="text-gray-900 font-medium">{formatCurrency(totalPrice - (form.additional_services?.reduce((sum, svc) => sum + (Number(svc.price) * Number(svc.quantity || 1)), 0) || 0))}</span>
            </div>
          )}

          {/* Add-ons / Additional Services */}
          {form.additional_services?.map((svc, idx) => (
            <div key={idx} className="flex justify-between items-center text-gray-500">
              <span>{svc.name}</span>
              <span className="text-gray-900 font-medium">+{formatCurrency((Number(svc.price) || 0) * (Number(svc.quantity) || 1))}</span>
            </div>
          ))}
        </div>

        <hr className="border-gray-100 mb-6" />

        <div className="mb-2 flex justify-between items-center font-bold text-[17px]">
          <span className="text-gray-900">Subtotal</span>
          <span className="text-[#D4AF37]">{formatCurrency(totalPrice)}</span>
        </div>

        <div className="space-y-1 mb-8 text-[13px] text-gray-400 leading-relaxed">
          <p>+ service fee, transport & taxes on summary</p>
          <p>{depositPercentage}% deposit ≈ {formatCurrency(depositAmount)}</p>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">{selectedPaymentOption === "full" ? "Total" : "Amount Due Now"}</div>
            <div className="text-2xl font-bold text-[#D4AF37]">{formatCurrency(displayAmount)}</div>
          </div>
          <Button onClick={onNext} className="ml-4 bg-[#D4AF37] hover:bg-[#C5A028] text-gray-900 font-semibold py-3 px-4 rounded-2xl shadow-sm">
            Continue <ChevronRight size={18} />
          </Button>
        </div>

        </div>
      </div>
    </div>
  );
}
