import React, { useState } from "react";
import { Check, UtensilsCrossed } from "lucide-react";
import {
  Card,
  SH,
  TTextarea,
  StepShell,
  focusRing,
  formatPeso,
} from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";
import LiveEstimate from "../components/LiveEstimate";

export default function StepMenuSelection({
  form,
  setForm,
  menuItems,
  totalPrice,
  depositAmount,
  depositPercentage,
  selectedPaymentOption,
  setSelectedPaymentOption,
}) {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    "All",
    ...new Set(menuItems.map((m) => m.category).filter(Boolean)),
  ];

  const displayedItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter((m) => m.category === activeCategory);

  const toggleSelection = (item) => {
    const currentSelection = form.selected_menu || [];
    const alreadySelected = currentSelection.some((m) => m._id === item._id);

    if (alreadySelected) {
      setForm({
        ...form,
        selected_menu: currentSelection.filter((m) => m._id !== item._id),
      });
    } else {
      setForm({
        ...form,
        selected_menu: [...currentSelection, item],
      });
    }
  };

  const isSelected = (itemId) =>
    form.selected_menu?.some((m) => m._id === itemId);

  const selectedCount = form.selected_menu?.length || 0;

  return (
    <StepShell
      aside={
        <LiveEstimate
          form={form}
          totalPrice={totalPrice}
          depositAmount={depositAmount}
          depositPercentage={depositPercentage}
          selectedPaymentOption={selectedPaymentOption}
          setSelectedPaymentOption={setSelectedPaymentOption}
        />
      }
    >
      <SH
        title="Menu Selection"
        sub="Choose the dishes to include in your catering."
        aside={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1.5 text-[13px] font-medium text-[#1E293B]">
            <UtensilsCrossed size={14} className="text-[#4C81E0]" />
            {selectedCount} selected
          </span>
        }
      />

      <Card className="p-4">
        {/* Category filter */}
        <div
          className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1"
          role="tablist"
          aria-label="Menu categories"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all",
                activeCategory === cat
                  ? "bg-[#4C81E0] text-white shadow-sm"
                  : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#4C81E0]/40 hover:text-[#1E293B]",
                focusRing,
              )}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu grid — scrolls inside the card so the step stays above the fold */}
        <div className="max-h-[52vh] overflow-y-auto pr-0.5 lg:max-h-[46vh]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {displayedItems.map((item) => {
              const selected = isSelected(item._id);
              return (
                <button
                  key={item._id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSelection(item)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all",
                    selected
                      ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm"
                      : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50 hover:shadow-sm",
                    focusRing,
                  )}
                >
                  {item.image_url && (
                    <span className="block h-24 w-full overflow-hidden bg-[#F8FAFC]">
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                  )}

                  <span
                    className={cn(
                      "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                      selected
                        ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-sm"
                        : "border-[#E2E8F0] bg-white/90 text-transparent group-hover:border-[#4C81E0]/50",
                    )}
                    aria-hidden="true"
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>

                  <span className="flex flex-1 flex-col justify-between p-3">
                    <span className="block">
                      <span className="block pr-6 text-sm font-semibold leading-snug text-[#1E293B]">
                        {item.name}
                      </span>
                      {item.description && (
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-[#64748B]">
                          {item.description}
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block text-[13px] font-semibold text-[#4C81E0]">
                      {item.price ? `${formatPeso(item.price)}/pax` : "Included"}
                    </span>
                  </span>
                </button>
              );
            })}

            {displayedItems.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-[#CBD5E1] py-8 text-center text-sm text-[#94A3B8]">
                No menu items found for this category.
              </div>
            )}
          </div>
        </div>

        {/* Other requests */}
        <div className="mt-3 border-t border-[#E2E8F0] pt-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className={cn(
                "h-4 w-4 rounded border-[#CBD5E1] accent-[#4C81E0]",
                focusRing,
              )}
              checked={!!form.special_requests}
              onChange={(e) => {
                if (!e.target.checked) {
                  setForm({ ...form, special_requests: "" });
                } else {
                  setForm({ ...form, special_requests: " " });
                }
              }}
            />
            <span className="text-sm font-medium text-[#1E293B]">
              Other menu requests
            </span>
          </label>

          {form.special_requests !== "" && (
            <div className="mt-2">
              <TTextarea
                placeholder="Let us know if you have other menu requests..."
                value={
                  form.special_requests === " " ? "" : form.special_requests
                }
                onChange={(val) => setForm({ ...form, special_requests: val })}
                rows={2}
              />
            </div>
          )}
        </div>
      </Card>
    </StepShell>
  );
}
