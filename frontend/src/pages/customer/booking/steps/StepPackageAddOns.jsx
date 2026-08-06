import React from "react";
import { Sparkles } from "lucide-react";
import {
  Card,
  SH,
  SectionTitle,
  QtyStepper,
  StepShell,
  formatPeso,
} from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

export default function StepPackageAddOns({ form, setForm, packageDetails }) {
  const addOns = Array.isArray(packageDetails?.add_ons)
    ? packageDetails.add_ons
    : [];

  const getSelectedQuantity = (addOnName) => {
    const found = form.selected_package_addons?.find(
      (s) => s.name === addOnName,
    );
    return found ? found.quantity : 0;
  };

  const handleQuantityChange = (addOn, delta) => {
    setForm((prev) => {
      const existing = [...(prev.selected_package_addons || [])];
      const index = existing.findIndex((s) => s.name === addOn.name);

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
          quantity: delta,
        });
      }

      return { ...prev, selected_package_addons: existing };
    });
  };

  const selectedCount = form.selected_package_addons?.length || 0;

  return (
    <StepShell width="medium">
      <SH
        title="Package Add-ons"
        sub="Optional extras for your selected package. Continue if you don't need any."
        aside={
          selectedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1.5 text-[13px] font-medium text-[#1E293B]">
              <Sparkles size={14} className="text-[#4C81E0]" />
              {selectedCount} added
            </span>
          ) : null
        }
      />

      <Card className="p-4 sm:p-5">
        <SectionTitle icon={Sparkles}>Available add-ons</SectionTitle>

        {addOns.length > 0 ? (
          <div className="grid max-h-[52vh] grid-cols-1 gap-3 overflow-y-auto pr-0.5 sm:grid-cols-2 lg:grid-cols-3">
            {addOns.map((addOn, idx) => {
              const qty = getSelectedQuantity(addOn.name);
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border-2 p-3.5 transition-all",
                    qty > 0
                      ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm"
                      : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50",
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold leading-snug text-[#1E293B]">
                        {addOn.name}
                      </h4>
                      <p className="mt-0.5 text-[13px] text-[#64748B]">
                        {formatPeso(addOn.price)}
                      </p>
                    </div>
                    <Sparkles
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
                      label={addOn.name}
                      onDecrease={() => handleQuantityChange(addOn, -1)}
                      onIncrease={() => handleQuantityChange(addOn, 1)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] p-8 text-center text-sm text-[#94A3B8]">
            <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-60" />
            No add-ons available for this package.
          </div>
        )}
      </Card>
    </StepShell>
  );
}
