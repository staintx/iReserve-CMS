import React from "react";
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

export default function StepDeliveryDetails({
  form,
  setForm,
  municipalities,
  barangays,
  pickupAddress,
}) {
  const handleGuestChange = (nextValue) => {
    setForm((prev) => ({ ...prev, guest_count: nextValue.toString() }));
  };

  const currentCount = parseInt(form.guest_count || 1, 10);
  const isPickup = form.delivery_method === "pickup";

  const methods = [
    {
      value: "delivery",
      icon: Truck,
      title: "Deliver to address",
      description: "We bring the food to your location",
      active: !isPickup,
    },
    {
      value: "pickup",
      icon: Store,
      title: "Customer pickup",
      description: "Collect the order from our kitchen",
      active: isPickup,
    },
  ];

  return (
    <StepShell>
      <SH
        title="Delivery Details"
        sub="Tell us how many you are serving and where the food should go."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Guests + method */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={Users}>Order size</SectionTitle>
            <Field
              label="Estimated Guest Count (Pax)"
              required
              hint="How many people are you ordering food for?"
            >
              <GuestCounter
                value={currentCount}
                onChange={handleGuestChange}
                min={1}
                max={1000}
              />
            </Field>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle icon={Truck}>Delivery method</SectionTitle>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
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
                    <span className="min-w-0">
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
        </div>

        {/* Address / pickup info */}
        <Card className="p-4 sm:p-5">
          <SectionTitle icon={MapPin}>
            {isPickup ? "Pickup location" : "Delivery address"}
          </SectionTitle>

          {isPickup ? (
            <InfoNote icon={Store} title="Customer Pickup">
              You will pick up the food from{" "}
              {pickupAddress || "the caterer's address"} on your selected event
              date and time.
            </InfoNote>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label="Municipality" required>
                  <TSelect
                    value={form.municipality || ""}
                    onChange={(val) =>
                      setForm({ ...form, municipality: val, barangay: "" })
                    }
                    options={municipalities}
                    placeholder="Select Municipality"
                  />
                </Field>
                <Field
                  label="Barangay"
                  required
                  hint={!form.municipality ? "Select a municipality first" : undefined}
                >
                  <TSelect
                    value={form.barangay || ""}
                    onChange={(val) => setForm({ ...form, barangay: val })}
                    options={barangays}
                    placeholder="Select Barangay"
                    disabled={!form.municipality}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <Field label="Street Name" required className="sm:col-span-2">
                  <TInput
                    placeholder="Street name, building, house no."
                    value={form.street || ""}
                    onChange={(val) => setForm({ ...form, street: val })}
                  />
                </Field>
                <Field label="Zip Code">
                  <TInput
                    placeholder="4200"
                    value={form.zip_code || ""}
                    onChange={(val) => setForm({ ...form, zip_code: val })}
                  />
                </Field>
              </div>

              <Field label="Landmark">
                <TInput
                  placeholder="Near a landmark"
                  value={form.landmark || ""}
                  onChange={(val) => setForm({ ...form, landmark: val })}
                />
              </Field>

              <Field label="Delivery Instructions (Optional)">
                <TTextarea
                  placeholder="Floor/unit number, gate color, parking notes, or access instructions"
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
