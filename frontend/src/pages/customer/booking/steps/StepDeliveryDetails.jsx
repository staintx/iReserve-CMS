import React from "react";
import {
  Card,
  SH,
  FL,
  TInput,
  TSelect,
  GuestCounter,
  TTextarea,
} from "../components/BookingSharedUI";

export default function StepDeliveryDetails({
  form,
  setForm,
  municipalities,
  barangays,
  pickupAddress,
  onNext,
}) {
  const handleGuestChange = (nextValue) => {
    setForm((prev) => ({ ...prev, guest_count: nextValue.toString() }));
  };

  const currentCount = parseInt(form.guest_count || 1, 10);

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <SH
        title="Delivery Details"
        sub="Where and when would you like the food delivered?"
      />

      <Card className="p-6 space-y-6">
        <div>
          <FL>Estimated Guest Count (Pax) *</FL>
          <div className="flex flex-col gap-2">
            <GuestCounter
              value={currentCount}
              onChange={handleGuestChange}
              min={1}
              max={1000}
            />
            <p className="text-xs text-[#94A3B8]">
              How many people are you ordering food for?
            </p>
          </div>
        </div>

        <hr className="border-[#E2E8F0]" />

        <div>
          <h4 className="mb-4 text-sm font-semibold text-[#1E293B]">
            Delivery Method
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                form.delivery_method !== "pickup"
                  ? "border-[#4C81E0] bg-[#4C81E0]/5 text-[#1E293B]"
                  : "border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#4C81E0]/40"
              }`}
            >
              <input
                type="radio"
                className="h-4 w-4 border-[#4C81E0] text-[#4C81E0] focus:ring-[#4C81E0]"
                checked={form.delivery_method !== "pickup"}
                onChange={() =>
                  setForm({ ...form, delivery_method: "delivery" })
                }
              />
              Deliver to this address
            </label>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                form.delivery_method === "pickup"
                  ? "border-[#4C81E0] bg-[#4C81E0]/5 text-[#1E293B]"
                  : "border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#4C81E0]/40"
              }`}
            >
              <input
                type="radio"
                className="h-4 w-4 border-[#4C81E0] text-[#4C81E0] focus:ring-[#4C81E0]"
                checked={form.delivery_method === "pickup"}
                onChange={() => setForm({ ...form, delivery_method: "pickup" })}
              />
              Customer pickup
            </label>
          </div>
        </div>

        {form.delivery_method !== "pickup" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <FL>Municipality</FL>
                <TSelect
                  value={form.municipality || ""}
                  onChange={(val) =>
                    setForm({ ...form, municipality: val, barangay: "" })
                  }
                  options={municipalities}
                  placeholder="Select Municipality"
                />
              </div>
              <div>
                <FL>Barangay</FL>
                <TSelect
                  value={form.barangay || ""}
                  onChange={(val) => setForm({ ...form, barangay: val })}
                  options={barangays}
                  placeholder="Select Barangay"
                  disabled={!form.municipality}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <FL>Street Name</FL>
                <TInput
                  placeholder="Street name, building, house no."
                  value={form.street || ""}
                  onChange={(val) => setForm({ ...form, street: val })}
                />
              </div>
              <div>
                <FL>Landmark</FL>
                <TInput
                  placeholder="Near a landmark"
                  value={form.landmark || ""}
                  onChange={(val) => setForm({ ...form, landmark: val })}
                />
              </div>
            </div>

            <div>
              <FL>Zip Code</FL>
              <TInput
                placeholder="Zip Code"
                value={form.zip_code || ""}
                onChange={(val) => setForm({ ...form, zip_code: val })}
                className="max-w-xs"
              />
            </div>

            <div>
              <FL>Delivery Instructions (Optional)</FL>
              <TTextarea
                placeholder="Floor/unit number, gate color, parking notes, or access instructions"
                value={form.delivery_instructions || ""}
                onChange={(val) =>
                  setForm({ ...form, delivery_instructions: val })
                }
                rows={3}
              />
            </div>
          </div>
        )}
        {form.delivery_method === "pickup" && (
          <div className="rounded-xl border border-[#4C81E0]/20 bg-[#4C81E0]/5 p-6 text-[#1E293B]">
            <p className="mb-1 font-semibold text-sm">Customer Pickup</p>
            <p className="text-xs text-[#64748B]">
              You will pick up the food from{" "}
              {pickupAddress || "the caterer's address"} on your selected
              event date and time.
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-[#4C81E0] px-8 py-3 text-sm font-semibold text-white hover:bg-[#3D6BC4] transition-colors duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
