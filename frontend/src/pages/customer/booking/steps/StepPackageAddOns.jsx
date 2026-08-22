import { useMemo } from "react";
import { Sparkles, Info, MessageSquare, PackageOpen } from "lucide-react";
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
  addons = [],
  estimate,
}) {
  // 1. Package-specific add-ons
  const packageItems = useMemo(() => {
    const pkgAddOns = Array.isArray(packageDetails?.add_ons)
      ? packageDetails.add_ons
      : [];
    return pkgAddOns.map((addOn, index) => ({
      key: `pkg-${addOn.name}-${index}`,
      name: addOn.name,
      description: addOn.description,
      price: addOn.price || 0,
      isQuantity: addOn.pricing_type === "quantity",
      source: addOn,
      isPackageAddon: true,
    }));
  }, [packageDetails]);

  // 2. Common / global add-ons (excluding duplicates if already defined in package add-ons)
  const commonItems = useMemo(() => {
    const pkgNames = new Set(
      packageItems.map((p) => (p.name || "").trim().toLowerCase()),
    );
    const rawCommon = Array.isArray(addons) ? addons : [];
    return rawCommon
      .filter(
        (addon) =>
          addon &&
          addon.available !== false &&
          !pkgNames.has((addon.name || "").trim().toLowerCase()),
      )
      .map((addon, index) => ({
        key: `common-${addon._id || addon.name}-${index}`,
        name: addon.name,
        description: addon.description,
        price: addon.price || 0,
        isQuantity: addon.pricing_type === "quantity",
        source: addon,
        isCommonAddon: true,
      }));
  }, [addons, packageItems]);

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
          pricing_type: item.source?.pricing_type || (item.isQuantity ? "quantity" : "fixed"),
          item_id: item.source?._id,
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

      if (index >= 0) {
        existing.splice(index, 1);
      } else {
        existing.push({
          name: item.name,
          price: item.price,
          quantity: 1,
          pricing_type: item.isQuantity
            ? item.source?.pricing_type || "quantity"
            : "fixed",
          item_id: item.source?._id,
        });
      }

      return { ...prev, selected_package_addons: existing };
    });
  };

  const selectedCount = form.selected_package_addons?.length || 0;
  const hasPackageItems = packageItems.length > 0;
  const hasCommonItems = commonItems.length > 0;

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
        <Card className="p-5 space-y-6">
          {/* Case 1: Package has specific add-ons */}
          {hasPackageItems && (
            <div>
              <SectionTitle icon={Sparkles}>
                Add-ons for {packageDetails?.name || "your package"}
              </SectionTitle>
              <AddOnPicker
                items={packageItems}
                quantityOf={quantityOf}
                onToggle={toggleAddOn}
                onQuantityChange={handleQuantityChange}
                emptyTitle="No extra add-ons for this package"
                emptyHint="You can describe any custom styling or equipment requests in the notes box."
              />
            </div>
          )}

          {/* Section Divider if both package-specific and common add-ons exist */}
          {hasPackageItems && hasCommonItems && (
            <div className="border-t border-slate-100 pt-2" />
          )}

          {/* Case 2: Common / Global Add-ons */}
          {hasCommonItems && (
            <div>
              <SectionTitle icon={hasPackageItems ? PackageOpen : Sparkles}>
                {hasPackageItems
                  ? "Common Event Add-ons & Equipment"
                  : "Common Event Add-ons & Equipment"}
              </SectionTitle>
              {hasPackageItems && (
                <p className="mt-1 text-xs text-[#64748B]">
                  Popular sound & lighting, decor, and equipment options available across all events.
                </p>
              )}
              <AddOnPicker
                items={commonItems}
                quantityOf={quantityOf}
                onToggle={toggleAddOn}
                onQuantityChange={handleQuantityChange}
                emptyTitle="No add-ons available"
                emptyHint="You can describe what you need in the notes box."
              />
            </div>
          )}

          {/* Fallback if no add-ons at all */}
          {!hasPackageItems && !hasCommonItems && (
            <div>
              <SectionTitle icon={Sparkles}>Event Add-ons</SectionTitle>
              <div className="mt-2 rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC]/60 p-8 text-center">
                <Info className="mx-auto mb-2.5 h-6 w-6 text-[#94A3B8]" />
                <p className="text-sm font-semibold text-[#1E293B]">No add-ons currently available</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  You can describe any custom styling or equipment requests in the notes box.
                </p>
              </div>
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
            Our event coordinators will review these details and itemize
            everything clearly in your official quotation.
          </InfoNote>
        </Card>
      </div>
    </StepShell>
  );
}

