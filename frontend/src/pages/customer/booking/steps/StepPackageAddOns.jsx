import React from "react";
import { Sparkles, Info, MessageSquare, CheckCircle2, Plus } from "lucide-react";
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1.5 text-xs font-semibold text-[#4C81E0] shadow-2xs">
              <Sparkles size={13} className="text-[#4C81E0]" />
              {selectedCount} added to booking
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="p-5">
          <SectionTitle icon={Sparkles}>
            Add-ons for {packageDetails?.name || "your package"}
          </SectionTitle>

          {addOns.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3">
              {addOns.map((addOn, index) => {
                const qty = getSelectedQuantity(addOn.name);
                const isSelected = qty > 0;
                const isQuantity = addOn.pricing_type === "quantity";
                const hasPrice = Number(addOn.price) > 0;

                return (
                  <div
                    key={`${addOn.name}-${index}`}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 min-h-[140px]",
                      isSelected
                        ? "border-[#4C81E0] bg-[#4C81E0]/[0.03] ring-1 ring-[#4C81E0]/30 shadow-xs"
                        : "border-slate-200/90 bg-white hover:border-[#4C81E0]/60 hover:shadow-xs",
                    )}
                  >
                    <div className="mb-3 min-w-0">
                      <h4 className="text-sm font-bold leading-snug text-slate-800 line-clamp-1">
                        {addOn.name}
                      </h4>
                      {addOn.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {addOn.description}
                        </p>
                      )}
                      <div className="mt-2">
                        {hasPrice ? (
                          <span className="inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/80">
                            +{formatPeso(addOn.price)} {isQuantity ? "/ unit" : ""}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">
                            Priced on official quotation
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-slate-100">
                      {!isQuantity ? (
                        <button
                          type="button"
                          onClick={() => toggleFixedPackageAddon(addOn)}
                          className={cn(
                            "w-full py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95",
                            isSelected
                              ? "bg-[#4C81E0] text-white shadow-xs hover:bg-[#3b6ec6]"
                              : "border border-slate-200 text-slate-700 hover:border-[#4C81E0] hover:text-[#4C81E0] hover:bg-[#4C81E0]/5",
                          )}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 size={14} className="text-white" /> Added
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> Add to Booking
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">
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
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-2 bg-slate-50/50">
              <Info className="mx-auto mb-2.5 h-6 w-6 text-slate-400 opacity-80" />
              <p className="font-semibold text-slate-700">No extra add-ons for this package</p>
              <p className="text-xs text-slate-500 mt-1">
                You can describe any custom styling or equipment requests in the notes box.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle icon={MessageSquare}>Anything else?</SectionTitle>
          <Field
            label="Additional requests or notes"
            hint="Optional. Event theme, color motif, styling, or timing requirements."
          >
            <TTextarea
              placeholder="e.g. Navy and gold color motif, setup backdrop by 3:00 PM, vegetarian guest table..."
              value={form.special_requests || ""}
              onChange={(val) => setForm({ ...form, special_requests: val })}
              rows={4}
            />
          </Field>
          <InfoNote icon={Info} className="mt-3">
            Our event coordinators will review these details and itemize everything clearly in your official quotation.
          </InfoNote>
        </Card>
      </div>
    </StepShell>
  );
}
