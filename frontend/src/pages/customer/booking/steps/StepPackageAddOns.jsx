import { useMemo } from "react";
import { Sparkles, Info, MessageSquare } from "lucide-react";
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

export default function StepPackageAddOns({
  form,
  setForm,
  packageDetails,
  estimate,
}) {
  // Package add-ons are matched by name — they have no id of their own — so the
  // name is both the key and the identity, exactly as before.
  const items = useMemo(() => {
    const addOns = Array.isArray(packageDetails?.add_ons)
      ? packageDetails.add_ons
      : [];
    return addOns.map((addOn, index) => ({
      key: `${addOn.name}-${index}`,
      name: addOn.name,
      description: addOn.description,
      price: addOn.price || 0,
      isQuantity: addOn.pricing_type === "quantity",
      source: addOn,
    }));
  }, [packageDetails]);

  const quantityOf = (item) =>
    form.selected_package_addons?.find((entry) => entry.name === item.name)
      ?.quantity || 0;

  const handleQuantityChange = (item, delta) => {
    setForm((prev) => {
      const existing = [...(prev.selected_package_addons || [])];
      const index = existing.findIndex((entry) => entry.name === item.name);

      if (index >= 0) {
        const nextQty = Math.max(0, existing[index].quantity + delta);
        if (nextQty === 0) existing.splice(index, 1);
        else existing[index] = { ...existing[index], quantity: nextQty };
      } else if (delta > 0) {
        existing.push({
          name: item.name,
          price: item.price,
          quantity: delta,
          pricing_type: item.source?.pricing_type || "quantity",
        });
      }

      return { ...prev, selected_package_addons: existing };
    });
  };

  // One gesture for both kinds of add-on: the row adds it, the row removes it.
  // A counted add-on starts at one and is adjusted with its stepper afterwards.
  const toggleAddOn = (item) => {
    setForm((prev) => {
      const existing = [...(prev.selected_package_addons || [])];
      const index = existing.findIndex((entry) => entry.name === item.name);

      if (index >= 0) existing.splice(index, 1);
      else
        existing.push({
          name: item.name,
          price: item.price,
          quantity: 1,
          pricing_type: item.isQuantity
            ? item.source?.pricing_type || "quantity"
            : "fixed",
        });

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#4C81E0] shadow-2xs">
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

          <AddOnPicker
            items={items}
            quantityOf={quantityOf}
            onToggle={toggleAddOn}
            onQuantityChange={handleQuantityChange}
            emptyTitle="No extra add-ons for this package"
            emptyHint="You can describe any custom styling or equipment requests in the notes box."
          />
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
            Our event coordinators will review these details and itemize
            everything clearly in your official quotation.
          </InfoNote>
        </Card>
      </div>
    </StepShell>
  );
}
