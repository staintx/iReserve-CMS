import { PackageOpen, Info, MessageSquare } from "lucide-react";
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

  const selectedCount = form.additional_services?.length || 0;

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Extras & Requests"
        sub="All optional. Continue if you don't need any of it."
        aside={
          selectedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1.5 text-[13px] font-medium text-[#1E293B]">
              <PackageOpen size={14} className="text-[#4C81E0]" />
              {selectedCount} added
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        <Card className="p-4">
          <SectionTitle icon={PackageOpen}>Add-ons</SectionTitle>

          {addons && addons.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                    <div className="mb-3 min-w-0">
                      <h4 className="text-sm font-semibold leading-snug text-[#1E293B]">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[#64748B]">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-1 text-[13px] font-semibold text-[#4C81E0]">
                        {formatPeso(item.price)} each
                      </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                        Quantity
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
              No add-ons are available right now. You can still describe what you
              need in the notes below.
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
