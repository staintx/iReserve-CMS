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

      <div className="flex flex-col gap-3.5">
        {/* Top Row: Guests & Fulfillment Method */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-stretch">
          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <SectionTitle icon={Users}>How many guests</SectionTitle>
              <Field
                label="Estimated guest count"
                required
                hint="Dish prices are calculated per guest."
                error={errors.guest_count}
              >
                <GuestCounter
                  value={currentCount}
                  onChange={handleGuestChange}
                  min={1}
                />
              </Field>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <SectionTitle icon={Truck}>Fulfillment method</SectionTitle>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {methods.map((method) => {
                  const { value, title, description, active } = method;
                  const Icon = method.icon;
                  return (
                    <SelectableCard
                      key={value}
                      selected={active}
                      showCheck={false}
                      onClick={() => setForm({ ...form, delivery_method: value })}
                      className="flex items-center gap-2.5 p-2.5 sm:p-3"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-[#4C81E0] text-white"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 leading-tight">
                          {title}
                        </span>
                        <span className="block text-[11px] text-slate-400 leading-tight">
                          {description}
                        </span>
                      </div>
                    </SelectableCard>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Section: Address details */}
        <Card className="p-3.5 sm:p-4">
          <SectionTitle icon={MapPin}>
            {isPickup ? "Pickup location" : "Delivery address"}
          </SectionTitle>

          {isPickup ? (
            <InfoNote icon={Store} title="Kitchen pickup">
              Pick your food order up directly from{" "}
              <strong>{pickupAddress || "Caezelle's Catering Kitchen (Batangas)"}</strong> on your
              chosen date and time.
            </InfoNote>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                  hint={!form.municipality ? "Select a municipality first" : undefined}
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

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
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
                <Field label="ZIP code" hint="Optional">
                  <TInput
                    placeholder="e.g. 4200"
                    value={form.zip_code || ""}
                    onChange={(val) => setForm({ ...form, zip_code: val })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Landmark" hint="Optional, helps driver find venue">
                  <TInput
                    placeholder="e.g. Across the municipal hall"
                    value={form.landmark || ""}
                    onChange={(val) => setForm({ ...form, landmark: val })}
                  />
                </Field>

                <Field
                  label="Delivery instructions"
                  hint="Optional. Gate, floor, or parking notes"
                >
                  <TInput
                    placeholder="e.g. 2nd floor, blue gate, park along side street"
                    value={form.delivery_instructions || ""}
                    onChange={(val) =>
                      setForm({ ...form, delivery_instructions: val })
                    }
                  />
                </Field>
              </div>
            </div>
          )}
        </Card>
      </div>
    </StepShell>
  );
}
