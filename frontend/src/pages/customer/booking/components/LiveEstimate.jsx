import React from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "../../../../components/ui/button";

const formatCurrency = (value) => {
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function LiveEstimate({ form, totalPrice, depositAmount, onNext }) {
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

  return (
    <div className="w-full flex-shrink-0 lg:w-80">
      <div className="sticky top-24 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:p-8" style={{ fontFamily: "Inter, sans-serif" }}>
        <h3 className="text-[19px] font-bold text-gray-900 mb-6" style={{ fontFamily: "Inter, sans-serif" }}>Live Estimate</h3>
        
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
          <p>30% deposit ≈ {formatCurrency(depositAmount)}</p>
        </div>

        <Button 
          onClick={onNext}
          className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-gray-900 font-semibold py-6 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-colors"
        >
          Continue <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}
