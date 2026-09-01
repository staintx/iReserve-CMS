import { useMemo } from "react";
import { PackagePlus, Info, MessageSquare, PackageOpen } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TTextarea,
  SectionTitle,
  InfoNote,
  StepShell,
} from "../components/BookingSharedUI";
import AddOnPicker from "../components/AddOnPicker";
import EstimateSummary from "../components/EstimateSummary";

export default function StepAddonSelection({ form, setForm, addons, estimate }) {
  const items = useMemo(
    () =>
      (Array.isArray(addons) ? addons : []).map((addOn) => ({
        key: String(addOn._id),
        id: addOn._id,
        name: addOn.name,
        description: addOn.description,
        price: addOn.price || 0,
        // Addon.pricing_type has always been on the record; the old tile grid
        // never read it, so a "quantity" add-on could only ever be ordered one
        // at a time. The stepper is offered where the catalogue says a count
        // applies — the same rule the package add-ons already followed.
        isQuantity: addOn.pricing_type === "quantity",
      })),
    [addons],
  );

  const quantityOf = (item) =>
    (form.additional_services || []).find(
      (service) => String(service.item_id) === String(item.id),
    )?.quantity || 0;

  const handleQuantityChange = (item, delta) => {
    setForm((prev) => {
      const services = [...(prev.additional_services || [])];
      const index = services.findIndex(
        (service) => String(service.item_id) === String(item.id),
      );

      if (index >= 0) {
        const nextQty = Math.max(0, services[index].quantity + delta);
        if (nextQty === 0) services.splice(index, 1);
        else services[index] = { ...services[index], quantity: nextQty };
      } else if (delta > 0) {
        services.push({
          item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: delta,
        });
      }

      return { ...prev, additional_services: services };
    });
  };

  // One gesture for both kinds of add-on: the row adds it, the row removes it.
  const toggleAddOn = (item) => {
    setForm((prev) => {
      const services = [...(prev.additional_services || [])];
      const index = services.findIndex(
        (service) => String(service.item_id) === String(item.id),
      );

      if (index >= 0) services.splice(index, 1);
      else
        services.push({
          item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        });

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#4C81E0] shadow-2xs">
              <PackagePlus size={13} className="text-[#4C81E0]" />
              {selectedCount} added to booking
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="p-5">
          <SectionTitle icon={PackagePlus}>Available Add-ons</SectionTitle>

          <AddOnPicker
            items={items}
            quantityOf={quantityOf}
            onToggle={toggleAddOn}
            onQuantityChange={handleQuantityChange}
            emptyTitle="No add-ons available"
            emptyHint="You can describe what you need in the special requests box."
          />
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
            Our team reviews this and confirms anything that affects the price on
            your quotation.
          </InfoNote>
        </Card>
      </div>
    </StepShell>
  );
}
