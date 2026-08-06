import React from "react";
import { PackageOpen, Info, Sparkles } from "lucide-react";
import {
  Card,
  SH,
  SectionTitle,
  QtyStepper,
  StepShell,
  formatPeso,
  focusRing,
} from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

const DECOR_OPTIONS = [
  "Floral Arrangements",
  "Stage Backdrop",
  "Red Carpet",
  "Draping & Ceiling Decor",
  "Centerpieces",
];

export default function StepAddonSelection({ form, setForm, addons }) {
  const getSelectedQuantity = (itemId) => {
    const found = form.additional_services.find((s) => s.item_id === itemId);
    return found ? found.quantity : 0;
  };

  const handleQuantityChange = (item, delta) => {
    setForm((prev) => {
      const existingServices = [...(prev.additional_services || [])];
      const index = existingServices.findIndex((s) => s.item_id === item._id);

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
          quantity: delta,
        });
      }

      return { ...prev, additional_services: existingServices };
    });
  };

  const toggleDecor = (decor) => {
    setForm((prev) => {
      const current = prev.special_requests || "";
      const currentArr = current.split(", ").filter(Boolean);

      const updated = currentArr.includes(decor)
        ? currentArr.filter((d) => d !== decor)
        : [...currentArr, decor];

      return { ...prev, special_requests: updated.join(", ") };
    });
  };

  const currentDecor = form.special_requests
    ? form.special_requests.split(", ")
    : [];

  const selectedCount = form.additional_services?.length || 0;

  return (
    <StepShell>
      <SH
        title="Add-ons"
        sub="Optional extras to complete your event. Skip any you don't need."
        aside={
          selectedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1.5 text-[13px] font-medium text-[#1E293B]">
              <PackageOpen size={14} className="text-[#4C81E0]" />
              {selectedCount} added
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <Card className="p-4 sm:p-5">
          <SectionTitle icon={PackageOpen}>Available add-ons</SectionTitle>

          {addons && addons.length > 0 ? (
            <div className="grid max-h-[48vh] grid-cols-1 gap-3 overflow-y-auto pr-0.5 sm:grid-cols-2">
              {addons.map((item) => {
                const qty = getSelectedQuantity(item._id);
                return (
                  <div
                    key={item._id}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border-2 p-3.5 transition-all",
                      qty > 0
                        ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm"
                        : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50",
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-[#1E293B]">
                          {item.name}
                        </h4>
                        <p className="mt-0.5 text-[13px] text-[#64748B]">
                          {formatPeso(item.price)} / unit
                        </p>
                      </div>
                      <PackageOpen
                        size={17}
                        className={cn(
                          "shrink-0",
                          qty > 0 ? "text-[#4C81E0]" : "text-[#CBD5E1]",
                        )}
                      />
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                        Qty
                      </span>
                      <QtyStepper
                        value={qty}
                        label={item.name}
                        onDecrease={() => handleQuantityChange(item, -1)}
                        onIncrease={() => handleQuantityChange(item, 1)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] p-6 text-center text-sm text-[#94A3B8]">
              <Info className="mx-auto mb-2 h-5 w-5 opacity-60" />
              No add-ons currently available.
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle icon={Sparkles}>Decor &amp; theme</SectionTitle>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {DECOR_OPTIONS.map((item) => {
              const checked = currentDecor.includes(item);
              return (
                <label
                  key={item}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                    checked
                      ? "border-[#4C81E0] bg-[#4C81E0]/5 text-[#1E293B]"
                      : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#4C81E0]/40 hover:bg-[#F8FAFC]",
                  )}
                >
                  <input
                    type="checkbox"
                    className={cn(
                      "h-4 w-4 shrink-0 rounded border-[#CBD5E1] accent-[#4C81E0]",
                      focusRing,
                    )}
                    checked={checked}
                    onChange={() => toggleDecor(item)}
                  />
                  <span className="font-medium">{item}</span>
                </label>
              );
            })}
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-[#94A3B8]">
            Selected decor is added to your special requests for coordination.
          </p>
        </Card>
      </div>
    </StepShell>
  );
}
