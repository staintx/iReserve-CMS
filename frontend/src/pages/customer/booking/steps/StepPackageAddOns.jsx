import React from "react";
import { Sparkles, Plus, Minus } from "lucide-react";
import { Card, SH } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

export default function StepPackageAddOns({ form, setForm, packageDetails }) {
  const addOns = Array.isArray(packageDetails?.add_ons) ? packageDetails.add_ons : [];

  const getSelectedQuantity = (addOnName) => {
    const found = form.selected_package_addons?.find(s => s.name === addOnName);
    return found ? found.quantity : 0;
  };

  const handleQuantityChange = (addOn, delta) => {
    setForm(prev => {
      const existing = [...(prev.selected_package_addons || [])];
      const index = existing.findIndex(s => s.name === addOn.name);
      
      if (index >= 0) {
        const newQty = Math.max(0, existing[index].quantity + delta);
        if (newQty === 0) {
          existing.splice(index, 1);
        } else {
          existing[index].quantity = newQty;
        }
      } else if (delta > 0) {
        existing.push({
          name: addOn.name,
          price: addOn.price || 0,
          quantity: delta
        });
      }

      return { ...prev, selected_package_addons: existing };
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <SH title="Package Add-ons" sub="Enhance your event with these optional add-ons specific to your selected package." />

      <Card className="p-6">
        {addOns.length > 0 ? (
          <div className="mb-4">
            <h3 className="font-semibold text-[#111] mb-4 border-b border-black/10 pb-2 text-sm uppercase tracking-wider">Available Add-ons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {addOns.map((addOn, idx) => {
                const qty = getSelectedQuantity(addOn.name);
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex flex-col justify-between rounded-xl border-2 p-4 transition-all",
                      qty > 0 ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-black/[0.08] bg-white hover:border-[#D4AF37]/40"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-[#111]">{addOn.name}</h4>
                        <p className="text-sm text-[#6B6657]">₱{Number(addOn.price || 0).toLocaleString()}</p>
                      </div>
                      <Sparkles className={cn("w-5 h-5", qty > 0 ? "text-[#D4AF37]" : "text-[#9E9E9E]")} />
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-medium text-[#6B6657]">Quantity</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(addOn, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 hover:bg-[#F7F4EE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={qty === 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-semibold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(addOn, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 hover:bg-[#F7F4EE] transition-colors"
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
          <div className="rounded-xl border border-dashed border-black/20 p-8 text-center text-[#9E9E9E]">
            <Sparkles className="mx-auto mb-2 h-6 w-6 opacity-50" />
            <p>No add-ons available for this package.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
