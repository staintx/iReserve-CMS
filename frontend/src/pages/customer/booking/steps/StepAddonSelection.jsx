import React from "react";
import { PackageOpen, Info, Plus, Minus } from "lucide-react";
import { Card, SH, FL } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

export default function StepAddonSelection({ form, setForm, addons }) {
  const getSelectedQuantity = (itemId) => {
    const found = form.additional_services.find(s => s.item_id === itemId);
    return found ? found.quantity : 0;
  };

  const handleQuantityChange = (item, delta) => {
    setForm(prev => {
      const existingServices = [...(prev.additional_services || [])];
      const index = existingServices.findIndex(s => s.item_id === item._id);
      
      if (index >= 0) {
        const newQty = Math.max(0, existingServices[index].quantity + delta);
        if (newQty === 0) {
          existingServices.splice(index, 1);
        } else {
          existingServices[index].quantity = newQty;
        }
      } else if (delta > 0) {
        existingServices.push({
          item_id: item._id,
          name: item.name,
          price: item.price,
          quantity: delta
        });
      }

      return { ...prev, additional_services: existingServices };
    });
  };

  const decorOptions = [
    "Floral Arrangements",
    "Stage Backdrop",
    "Red Carpet",
    "Draping & Ceiling Decor",
    "Centerpieces"
  ];

  const toggleDecor = (decor) => {
    setForm(prev => {
      const current = prev.special_requests || "";
      const currentArr = current.split(', ').filter(Boolean);
      
      const updated = currentArr.includes(decor)
        ? currentArr.filter(d => d !== decor)
        : [...currentArr, decor];
        
      return { ...prev, special_requests: updated.join(', ') };
    });
  };

  const currentDecor = form.special_requests ? form.special_requests.split(', ') : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <SH title="Addons" sub="Select the addons you need for your event." />

      <Card className="p-6">
        {addons && addons.length > 0 ? (
          <div className="mb-8">
            <h3 className="font-semibold text-[#111] mb-4 border-b border-black/10 pb-2 text-sm uppercase tracking-wider">Available Addons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addons.map((item) => {
                const qty = getSelectedQuantity(item._id);
                return (
                  <div 
                    key={item._id} 
                    className={cn(
                      "flex flex-col justify-between rounded-xl border-2 p-4 transition-all",
                      qty > 0 ? "border-[#4C81E0] bg-[#4C81E0]/5" : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-[#111]">{item.name}</h4>
                        <p className="text-sm text-[#6B6657]">₱{item.price?.toLocaleString() || 0} / unit</p>
                      </div>
                      <PackageOpen className={cn("w-5 h-5", qty > 0 ? "text-[#4C81E0]" : "text-[#94A3B8]")} />
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-medium text-[#64748B]">Quantity</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={qty === 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-semibold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] p-8 text-center text-[#94A3B8] mb-8">
            <Info className="mx-auto mb-2 h-6 w-6 opacity-50" />
            <p>No addons currently available.</p>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-[#1E293B] mb-4 border-b border-[#E2E8F0] pb-2 text-sm uppercase tracking-wider">Decor & Theme Preferences</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decorOptions.map((item) => (
              <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-[#CBD5E1] text-[#4C81E0] focus:ring-[#4C81E0] h-4 w-4"
                  checked={currentDecor.includes(item)}
                  onChange={() => toggleDecor(item)}
                />
                <span className="text-sm font-medium text-[#1E293B]">{item}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-[#94A3B8] mt-3">Selected decor will be added to your special requests for coordination.</p>
        </div>
      </Card>
    </div>
  );
}
