import React from "react";
import { Sparkles, Info, MessageSquare, CheckCircle2 } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TTextarea,
  SectionTitle,
  QtyStepper,
  InfoNote,
  StepShell,
} from "../components/BookingSharedUI";
import { formatPeso } from "../lib/bookingUI";
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";

export default function StepPackageAddOns({
  form,
  setForm,
  packageDetails,
  estimate,
}) {
  const addOns = Array.isArray(packageDetails?.add_ons)
    ? packageDetails.add_ons
    : [];

  const getSelectedQuantity = (addOnName) => {
    const found = form.selected_package_addons?.find(
      (entry) => entry.name === addOnName,
    );
    return found ? found.quantity : 0;
  };

  const handleQuantityChange = (addOn, delta) => {
    setForm((prev) => {
      const existing = [...(prev.selected_package_addons || [])];
      const index = existing.findIndex((entry) => entry.name === addOn.name);

      if (index >= 0) {
        const nextQty = Math.max(0, existing[index].quantity + delta);
        if (nextQty === 0) existing.splice(index, 1);
        else existing[index] = { ...existing[index], quantity: nextQty };
      } else if (delta > 0) {
        existing.push({
          name: addOn.name,
          price: addOn.price || 0,
          quantity: delta,
          pricing_type: addOn.pricing_type || "quantity",
        });
      }

      return { ...prev, selected_package_addons: existing };
    });
  };

  const toggleFixedPackageAddon = (addOn) => {
    setForm((prev) => {
      const existing = [...(prev.selected_package_addons || [])];
      const index = existing.findIndex((s) => s.name === addOn.name);

      if (index >= 0) {
        existing.splice(index, 1);
      } else {
        existing.push({
          name: addOn.name,
          price: addOn.price || 0,
          quantity: 1,
          pricing_type: "fixed",
        });
      }

      return { ...prev, selected_package_addons: existing };
    });
  };

  const selectedCount = form.selected_package_addons?.length || 0;

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Extras & Requests"
        sub="All optional. Continue if you don't need any of it."
        aside={
          selectedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1.5 text-[13px] font-medium text-[#1E293B]">
              <Sparkles size={14} className="text-[#4C81E0]" />
              {selectedCount} added
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        <Card className="p-4">
          <SectionTitle icon={Sparkles}>
            Add-ons for {packageDetails?.name || "your package"}
          </SectionTitle>

          {addOns.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {addOns.map((addOn, index) => {
                const qty = getSelectedQuantity(addOn.name);
                const isFixed = addOn.pricing_type !== "quantity";
                return (
                  <div
                    key={`${addOn.name}-${index}`}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border-2 p-3.5 transition-all",
                      qty > 0
                        ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm"
                        : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50",
                    )}
                  >
                    <div className="mb-3 min-w-0">
                      <div className="flex items-center gap-1.5 justify-between">
                        <h4 className="text-sm font-semibold leading-snug text-[#1E293B]">
                          {addOn.name}
                        </h4>
                        {isFixed && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                            Fixed
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] font-semibold text-[#4C81E0]">
                        {formatPeso(addOn.price)} {isFixed ? "(One-Time)" : "each"}
                      </p>
                    </div>

                    <div className="mt-auto">
                      {isFixed ? (
                        <button
                          type="button"
                          onClick={() => toggleFixedPackageAddon(addOn)}
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                            qty > 0
                              ? "bg-[#4C81E0] text-white shadow-xs hover:bg-[#3b6ec6]"
                              : "border border-[#4C81E0] text-[#4C81E0] hover:bg-[#4C81E0]/10",
                          )}
                        >
                          {qty > 0 ? (
                            <>
                              <CheckCircle2 size={14} /> Selected
                            </>
                          ) : (
                            "+ Add Service"
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                            Quantity
                          </span>
                          <QtyStepper
                            value={qty}
                            label={addOn.name}
                            onDecrease={() => handleQuantityChange(addOn, -1)}
                            onIncrease={() => handleQuantityChange(addOn, 1)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] p-6 text-center text-sm text-[#94A3B8]">
              <Info className="mx-auto mb-2 h-5 w-5 opacity-60" />
              This package has no standard add-ons. You can describe any special
              requests in the notes below.
            </div>
          )}
        </Card>

        <Card className="p-4">
          <SectionTitle icon={MessageSquare}>Anything else?</SectionTitle>
          <Field
            label="Additional requests or notes"
            hint="Optional. Styling, timing, or anything our coordinators should plan around."
          >
            <TTextarea
              placeholder="e.g. Navy and gold styling, and please set up the buffet before 4 PM"
              value={form.special_requests || ""}
              onChange={(val) => setForm({ ...form, special_requests: val })}
              rows={4}
            />
          </Field>
          <InfoNote icon={Info} className="mt-3">
            Our team reviews this and confirms anything that affects the price on
            your quotation.
          </InfoNote>
        </Card>
      </div>
    </StepShell>
  );
}
