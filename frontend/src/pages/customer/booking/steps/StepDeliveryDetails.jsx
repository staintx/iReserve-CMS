import { Truck, Store, Users, MapPin } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TInput,
  TSelect,
  TTextarea,
  GuestCounter,
  SectionTitle,
  SelectableCard,
  InfoNote,
  StepShell,
} from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";

export default function StepDeliveryDetails({
  form,
  setForm,
  municipalities,
  barangays,
  pickupAddress,
  estimate,
  errors = {},
}) {
  const handleGuestChange = (nextValue) => {
    setForm((prev) => ({ ...prev, guest_count: String(nextValue) }));
  };

  const currentCount = parseInt(form.guest_count, 10) || 1;
  const isPickup = form.delivery_method === "pickup";

  const methods = [
    {
      value: "delivery",
      icon: Truck,
      title: "Deliver to my address",
      description: "We bring the food to your location.",
      active: !isPickup,
    },
    {
      value: "pickup",
      icon: Store,
      title: "I'll pick it up",
      description: "Collect the order from our kitchen.",
      active: isPickup,
    },
  ];

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Guests & Delivery"
        sub="How many people you are feeding, and where the food goes."
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        <Card className="p-4">
          <SectionTitle icon={Users}>How many guests</SectionTitle>
          <Field
            label="Guest count"
            required
            hint="Dish prices are per guest, so this sets your estimate."
            error={errors.guest_count}
          >
            <GuestCounter
              value={currentCount}
              onChange={handleGuestChange}
              min={1}
              max={1000}
            />
          </Field>
        </Card>

        <Card className="p-4">
          <SectionTitle icon={Truck}>Delivery or pickup</SectionTitle>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {methods.map((method) => {
              const { value, title, description, active } = method;
              const Icon = method.icon;
              return (
                <SelectableCard
                  key={value}
                  selected={active}
                  showCheck={false}
                  onClick={() => setForm({ ...form, delivery_method: value })}
                  className="flex items-center gap-3 p-3"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                      active
                        ? "bg-[#4C81E0] text-white"
                        : "bg-[#F1F5F9] text-[#94A3B8]",
                    )}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold text-[#1E293B]">
                      {title}
                    </span>
                    <span className="block text-xs text-[#64748B]">
                      {description}
                    </span>
                  </span>
                </SelectableCard>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle icon={MapPin}>
            {isPickup ? "Pickup location" : "Delivery address"}
          </SectionTitle>

          {isPickup ? (
            <InfoNote icon={Store} title="You're collecting this order">
              Pick the food up from{" "}
              {pickupAddress || "our kitchen, address to follow"} on your
              chosen date and time. Nothing else is needed here.
            </InfoNote>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Municipality" required error={errors.municipality}>
                  <TSelect
                    value={form.municipality || ""}
                    onChange={(val) =>
                      setForm({ ...form, municipality: val, barangay: "" })
                    }
                    options={municipalities}
                    placeholder="Select municipality"
                    hasError={!!errors.municipality}
                  />
                </Field>
                <Field
                  label="Barangay"
                  required
                  hint={
                    !form.municipality ? "Select a municipality first" : undefined
                  }
                  error={errors.barangay}
                >
                  <TSelect
                    value={form.barangay || ""}
                    onChange={(val) => setForm({ ...form, barangay: val })}
                    options={barangays}
                    placeholder="Select barangay"
                    disabled={!form.municipality}
                    hasError={!!errors.barangay}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field
                  label="Street and building"
                  required
                  className="sm:col-span-2"
                  error={errors.street}
                >
                  <TInput
                    placeholder="e.g. 123 Rizal Street, Lopez Building"
                    value={form.street || ""}
                    onChange={(val) => setForm({ ...form, street: val })}
                    hasError={!!errors.street}
                  />
                </Field>
                <Field label="ZIP code" hint="Optional.">
                  <TInput
                    placeholder="e.g. 4200"
                    value={form.zip_code || ""}
                    onChange={(val) => setForm({ ...form, zip_code: val })}
                  />
                </Field>
              </div>

              <Field label="Landmark" hint="Optional.">
                <TInput
                  placeholder="e.g. Across the municipal hall"
                  value={form.landmark || ""}
                  onChange={(val) => setForm({ ...form, landmark: val })}
                />
              </Field>

              <Field
                label="Delivery instructions"
                hint="Optional. Floor, gate, or parking notes for our driver."
              >
                <TTextarea
                  placeholder="e.g. 2nd floor, blue gate, park along the side street"
                  value={form.delivery_instructions || ""}
                  onChange={(val) =>
                    setForm({ ...form, delivery_instructions: val })
                  }
                  rows={3}
                />
              </Field>
            </div>
          )}
        </Card>
      </div>
    </StepShell>
  );
}
