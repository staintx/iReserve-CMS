import React from "react";
import { PackageOpen, Info, MessageSquare, CheckCircle2, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";

export default function StepAddonSelection({ form, setForm, addons, estimate }) {
  const getSelectedQuantity = (itemId) => {
    const found = (form.additional_services || []).find(
      (service) => service.item_id === itemId,
    );
    return found ? found.quantity : 0;
  };

  const handleQuantityChange = (item, delta) => {
    setForm((prev) => {
      const services = [...(prev.additional_services || [])];
      const index = services.findIndex((service) => service.item_id === item._id);

      if (index >= 0) {
        const nextQty = Math.max(0, services[index].quantity + delta);
        if (nextQty === 0) services.splice(index, 1);
        else services[index] = { ...services[index], quantity: nextQty };
      } else if (delta > 0) {
        services.push({
          item_id: item._id,
          name: item.name,
          price: item.price,
          quantity: delta,
        });
      }

      return { ...prev, additional_services: services };
    });
  };

  const toggleFixedAddon = (item) => {
    setForm((prev) => {
      const services = [...(prev.additional_services || [])];
      const index = services.findIndex((s) => s.item_id === item._id);

      if (index >= 0) {
        services.splice(index, 1);
      } else {
        services.push({
          item_id: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
        });
      }

      return { ...prev, additional_services: services };
    });
  };

  const selectedCount = form.additional_services?.length || 0;

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Extras & Requests"
        sub="All optional. Continue if you don't need any extra add-ons."
        aside={
          selectedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1.5 text-xs font-semibold text-[#4C81E0] shadow-2xs">
              <PackageOpen size={13} className="text-[#4C81E0]" />
              {selectedCount} added to booking
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="p-5">
          <SectionTitle icon={PackageOpen}>Available Add-ons</SectionTitle>

          {addons && addons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3">
              {addons.map((item) => {
                const qty = getSelectedQuantity(item._id);
                const isSelected = qty > 0;

                return (
                  <div
                    key={item._id}
                    className={cn(
                      "flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 min-h-[140px]",
                      isSelected
                        ? "border-[#4C81E0] bg-[#4C81E0]/[0.03] ring-1 ring-[#4C81E0]/30 shadow-xs"
                        : "border-slate-200/90 bg-white hover:border-[#4C81E0]/60 hover:shadow-xs",
                    )}
                  >
                    <div className="mb-3 min-w-0">
                      <h4 className="text-sm font-bold leading-snug text-slate-800 line-clamp-1">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="text-xs font-medium text-slate-500">
                          Priced on official quotation
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleFixedAddon(item)}
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-2 bg-slate-50/50">
              <Info className="mx-auto mb-2.5 h-6 w-6 text-slate-400 opacity-80" />
              <p className="font-semibold text-slate-700">No add-ons available</p>
              <p className="text-xs text-slate-500 mt-1">
                You can describe what you need in the special requests box.
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
              placeholder="e.g. Navy and gold styling, and please set up the buffet before 4 PM"
              value={form.special_requests || ""}
              onChange={(val) => setForm({ ...form, special_requests: val })}
              rows={4}
            />
          </Field>
          <InfoNote icon={Info} className="mt-3">
            Our team reviews this and confirms anything that affects the price on your quotation.
          </InfoNote>
        </Card>
      </div>
    </StepShell>
  );
}
