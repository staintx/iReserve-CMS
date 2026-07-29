import { Receipt } from "lucide-react";
import { SH } from "../components/BookingSharedUI";

export default function StepCostSummary({ form, initialPackageName, initialPackagePrice, totalPrice, depositAmount, depositPercentage }) {
  
  const guestCount = parseInt(form.guest_count || "0", 10);
  const additionalServicesTotal = form.additional_services?.reduce((acc, svc) => acc + (Number(svc.price || 0) * Number(svc.quantity || 1)), 0) || 0;
  const baseTotalAmount = totalPrice - additionalServicesTotal;
  const isCustom = !initialPackageName;
  const displayName = isCustom ? "Custom Booking" : initialPackageName;
  
  const getBasePriceDescription = () => {
    if (!isCustom) return `₱${(initialPackagePrice || 0).toLocaleString()} x ${guestCount} guests`;
    if (form.service_type === "Event Setup Only") return "Fixed price base setup";
    if (form.service_type === "Food and Event Setup") return `Estimated setup & catering base for ${guestCount} guests`;
    if (form.service_type === "Food Only") {
      if (form.selected_menu && form.selected_menu.length > 0) {
        return `Custom menu selection for ${guestCount} guests`;
      }
    }
    return `Estimated catering base for ${guestCount} guests`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <SH title="Cost Summary" sub="Review your package breakdown and payment details." />

      <div className="bg-white rounded-2xl border border-black/[0.08] p-6 sm:p-8 shadow-sm">
        {/* Main Booking Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#F7F4EE] rounded-xl p-5 mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mb-1">Package</p>
            <p className="font-semibold text-[#111]">{displayName}</p>
            {isCustom && <p className="text-[10px] text-[#6B6657]">{form.service_type}</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mb-1">Guests</p>
            <p className="font-semibold text-[#111]">{guestCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mb-1">Date</p>
            <p className="font-semibold text-[#111]">{formatDate(form.event_date)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mb-1">Time</p>
            <p className="font-semibold text-[#111]">{form.start_time || "-"}</p>
          </div>
        </div>

        {/* Cost Breakdown Table */}
        <div className="mb-8">
          <div className="flex items-center justify-between border-b-2 border-black/10 pb-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111]">Description</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#111]">Amount</span>
          </div>
          
          <div className="space-y-4">
            {!(isCustom && form.service_type === "Food Only") && (
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[#111]">{displayName}</p>
                  <p className="text-xs text-[#6B6657] mt-0.5">{getBasePriceDescription()}</p>
                </div>
                <p className="font-semibold text-[#111]">₱{baseTotalAmount.toLocaleString()}</p>
              </div>
            )}

            {isCustom && form.service_type === "Food Only" && form.selected_menu && form.selected_menu.length > 0 && (
              <div className="space-y-3 my-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E]">{displayName} (Selected Menu)</p>
                {form.selected_menu.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#111]">{item.name}</p>
                      <p className="text-xs text-[#6B6657]">₱{(item.price || 0).toLocaleString()} / pax</p>
                    </div>
                    <p className="text-sm font-medium text-[#111]">₱{((item.price || 0) * guestCount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
            
            {form.additional_services?.map((svc, idx) => {
              const price = Number(svc.price) || 0;
              const qty = Number(svc.quantity) || 1;
              return (
                <div key={idx} className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[#111]">{svc.name}</p>
                    <p className="text-xs text-[#6B6657] mt-0.5">₱{price.toLocaleString()} x {qty}</p>
                  </div>
                  <p className="font-semibold text-[#111]">₱{(price * qty).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between border-t border-black/10 mt-6 pt-6">
            <span className="font-bold text-[#111]">Estimated Total</span>
            <span className="text-xl font-bold text-[#D4AF37]">₱{totalPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Deposit Required Highlight */}
        {isCustom && form.service_type === "Food Only" ? (
          <div className="rounded-2xl border-2 border-[#D4AF37] bg-[#D4AF37]/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">
              <Receipt size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-[#111]">Payment Options</h4>
              <p className="text-xs text-[#6B6657] mt-1">Pay a {depositPercentage}% deposit to secure your booking, or choose Cash on Delivery (COD).</p>
              <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[#D4AF37]/20">
                <span className="text-[#6B6657]">Total on Delivery (if COD)</span>
                <span className="font-semibold text-[#111]">₱{totalPrice.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-[#D4AF37]/20 pt-4 sm:pt-0 mt-2 sm:mt-0">
              <p className="text-3xl font-bold text-[#D4AF37] leading-none" style={{ fontFamily: "Playfair Display, serif" }}>₱{depositAmount.toLocaleString()}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mt-2">Deposit (if paying online)</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-[#D4AF37] bg-[#D4AF37]/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">
              <Receipt size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-[#111]">Deposit Required</h4>
              <p className="text-xs text-[#6B6657] mt-1">A {depositPercentage}% deposit is required to secure your booking today.</p>
              <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-[#D4AF37]/20">
                <span className="text-[#6B6657]">Remaining Balance (Due later)</span>
                <span className="font-semibold text-[#111]">₱{(totalPrice - depositAmount).toLocaleString()}</span>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-[#D4AF37]/20 pt-4 sm:pt-0 mt-2 sm:mt-0">
              <p className="text-3xl font-bold text-[#D4AF37] leading-none" style={{ fontFamily: "Playfair Display, serif" }}>₱{depositAmount.toLocaleString()}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mt-2">Due Today</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
