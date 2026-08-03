import React, { useState } from "react";
import { Check } from "lucide-react";
import { Card, SH, TTextarea } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";
import LiveEstimate from "../components/LiveEstimate";

export default function StepMenuSelection({ form, setForm, menuItems, totalPrice, depositAmount, onNext, depositPercentage, selectedPaymentOption, setSelectedPaymentOption }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...new Set(menuItems.map(m => m.category).filter(Boolean))];
  
  const displayedItems = activeCategory === "All" 
    ? menuItems 
    : menuItems.filter(m => m.category === activeCategory);

  const toggleSelection = (item) => {
    const currentSelection = form.selected_menu || [];
    const isSelected = currentSelection.some(m => m._id === item._id);
    
    if (isSelected) {
      setForm({
        ...form,
        selected_menu: currentSelection.filter(m => m._id !== item._id)
      });
    } else {
      setForm({
        ...form,
        selected_menu: [...currentSelection, item]
      });
    }
  };

  const isSelected = (itemId) => form.selected_menu?.some(m => m._id === itemId);

  return (
    <div className="flex flex-col gap-6 lg:flex-row max-w-6xl mx-auto py-6">
      <div className="flex-1 space-y-6">
        <SH title="Menu Selection" sub="Choose the dishes you would like to include in your catering." />

        <Card className="p-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-all font-medium",
                  activeCategory === cat 
                    ? "bg-[#D4AF37] text-[#111] shadow-sm" 
                    : "border border-black/[0.08] bg-white text-[#6B6657] hover:border-[#D4AF37]/40 hover:text-[#111]"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {displayedItems.map((item) => (
              <div 
                key={item._id} 
                className={cn(
                  "flex flex-col overflow-hidden rounded-2xl border-2 transition-all cursor-pointer",
                  isSelected(item._id) ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-black/[0.08] hover:border-[#D4AF37]/40 bg-white"
                )}
                onClick={() => toggleSelection(item)}
              >
                {item.image_url && (
                  <div className="relative h-32 w-full bg-[#F7F4EE]">
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    {isSelected(item._id) && (
                      <div className="absolute right-2 top-2 rounded-full bg-[#D4AF37] p-1 text-[#111] shadow-sm">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h4 className="font-semibold text-[#111]">{item.name}</h4>
                    <p className="mb-3 mt-1 line-clamp-2 text-xs text-[#6B6657]">{item.description}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#D4AF37]">
                      {item.price ? `₱${item.price.toLocaleString()}/pax` : "Included"}
                    </span>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                        isSelected(item._id) 
                          ? "bg-[#111] text-white" 
                          : "bg-[#F7F4EE] text-[#6B6657] hover:bg-[#D4AF37]/20 hover:text-[#111]"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(item);
                      }}
                    >
                      {isSelected(item._id) ? "Selected" : "Select Food"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {displayedItems.length === 0 && (
              <div className="col-span-2 py-8 text-center text-[#9E9E9E]">
                No menu items found for this category.
              </div>
            )}
          </div>

          <div className="border-t border-black/10 pt-6">
            <label className="mb-3 flex cursor-pointer items-center gap-2">
              <input 
                type="checkbox" 
                className="h-4 w-4 rounded border-black/20 text-[#D4AF37] focus:ring-[#D4AF37]"
                checked={!!form.special_requests}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setForm({ ...form, special_requests: "" });
                  } else {
                    setForm({ ...form, special_requests: " " }); 
                  }
                }}
              />
              <span className="font-medium text-[#111] text-sm">Other Menu Requests</span>
            </label>
            
            {form.special_requests !== "" && (
              <TTextarea
                placeholder="Let us know if you have other menu requests..."
                value={form.special_requests === " " ? "" : form.special_requests}
                onChange={(val) => setForm({ ...form, special_requests: val })}
                rows={3}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="w-full lg:w-80 flex-shrink-0">
        <LiveEstimate
          form={form}
          totalPrice={totalPrice}
          depositAmount={depositAmount}
          depositPercentage={depositPercentage}
          selectedPaymentOption={selectedPaymentOption}
          setSelectedPaymentOption={setSelectedPaymentOption}
          onNext={onNext}
        />
      </div>
    </div>
  );
}
