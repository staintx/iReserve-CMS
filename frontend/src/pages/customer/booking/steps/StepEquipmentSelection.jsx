import React from "react";
import { PackageOpen, Info, Plus, Minus } from "lucide-react";
import { Card, SH, FL } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

export default function StepEquipmentSelection({ form, setForm, inventoryItems }) {
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
          name: item.item_name,
          price: item.rental_price,
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
      <SH title="Equipment & Decor" sub="Select the equipment and add-on services you need for your event." />

      <Card className="p-6">
        {inventoryItems && inventoryItems.length > 0 ? (
          <div className="mb-8">
            <h3 className="font-semibold text-[#111] mb-4 border-b border-black/10 pb-2 text-sm uppercase tracking-wider">Available Equipment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventoryItems.map((item) => {
                const qty = getSelectedQuantity(item._id);
                return (
                  <div 
                    key={item._id} 
                    className={cn(
                      "flex flex-col justify-between rounded-xl border-2 p-4 transition-all",
                      qty > 0 ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-black/[0.08] bg-white hover:border-[#D4AF37]/40"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-[#111]">{item.item_name}</h4>
                        <p className="text-sm text-[#6B6657]">₱{item.rental_price?.toLocaleString() || 0} / unit</p>
                      </div>
                      <PackageOpen className={cn("w-5 h-5", qty > 0 ? "text-[#D4AF37]" : "text-[#9E9E9E]")} />
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-medium text-[#6B6657]">Quantity</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 hover:bg-[#F7F4EE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={qty === 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-semibold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, 1)}
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
          <div className="rounded-xl border border-dashed border-black/20 p-8 text-center text-[#9E9E9E] mb-8">
            <Info className="mx-auto mb-2 h-6 w-6 opacity-50" />
            <p>No equipment inventory currently available.</p>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-[#111] mb-4 border-b border-black/10 pb-2 text-sm uppercase tracking-wider">Decor & Theme Preferences</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decorOptions.map((item) => (
              <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-black/[0.08] hover:bg-[#F7F4EE] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-black/20 text-[#D4AF37] focus:ring-[#D4AF37] h-4 w-4"
                  checked={currentDecor.includes(item)}
                  onChange={() => toggleDecor(item)}
                />
                <span className="text-sm font-medium text-[#111]">{item}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-[#9E9E9E] mt-3">Selected decor will be added to your special requests for coordination.</p>
        </div>
      </Card>
    </div>
  );
}
