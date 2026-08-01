import { useEffect } from "react";
import { BATANGAS_PROVINCE } from "../../../../utils/batangas";
import { Card, SH, FL, TInput, TSelect, TTextarea, GuestCounter } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

const VENUE_TYPES = [
  "Covered Court",
  "Private Resort",
  "Function Hall",
  "Garden",
  "Beach",
  "Hotel Ballroom",
  "Restaurant",
  "Event Hall",
  "Other",
];

export default function StepEventDetails({
  form,
  setForm,
  initialEventType,
  municipalities,
  barangays,
  isCustomBooking,
  selectedPackageName,
  guestMin = 1,
  guestMax = 500,
}) {
  useEffect(() => {
    const current = Number(form.guest_count);
    if (!form.guest_count || current < guestMin || current > guestMax) {
      setForm((prev) => ({ ...prev, guest_count: guestMin.toString() }));
    }
  }, [guestMin, guestMax]);

  const handleGuestChange = (nextValue) => {
    setForm((prev) => ({ ...prev, guest_count: nextValue.toString() }));
  };

  const isVenueTypeOther = form.venue_type && !VENUE_TYPES.includes(form.venue_type);
  const currentCount = parseInt(form.guest_count) || guestMin;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <SH title="Event Details" sub="Tell us more about your event and requirements." />
      
      {!isCustomBooking && selectedPackageName && (
        <div className="rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 p-4 text-sm mb-6">
          <span className="font-medium text-[#D4AF37]">Selected Package:</span>{" "}
          <span className="font-bold text-[#111]">{selectedPackageName}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Left Column: Event Type & Theme */}
        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <div>
              <FL>Event Type *</FL>
              <TSelect
                value={form.event_type}
                onChange={(val) =>
                  setForm({
                    ...form,
                    event_type: val,
                    event_type_other: val === "Other" ? form.event_type_other : "",
                  })
                }
                options={["Birthday", "Wedding", "Corporate", "Other"]}
                placeholder="Select event type"
                disabled={!!initialEventType}
              />
            </div>

            {form.event_type === "Other" && (
              <div>
                <FL>Specify Event Type</FL>
                <TInput
                  placeholder="Anniversary, Christening, etc."
                  value={form.event_type_other}
                  onChange={(val) => setForm({ ...form, event_type_other: val })}
                  disabled={!!initialEventType}
                />
              </div>
            )}

            <div>
              <FL>Event Theme / Motif</FL>
              <TInput
                placeholder="e.g. Rustic, Navy Blue"
                value={form.event_theme}
                onChange={(val) => setForm({ ...form, event_theme: val })}
              />
              <p className="text-xs text-[#9E9E9E] mt-2">
                Enter theme name and pick a primary color.
              </p>
            </div>
            
            <div className="pt-2">
              <FL>Estimated Guest Count *</FL>
              <div className="flex flex-col gap-2">
                <GuestCounter value={currentCount} onChange={handleGuestChange} min={guestMin} max={guestMax} />
                <p className="text-xs text-[#9E9E9E]">
                  {guestMin} – {guestMax} guests
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Location & Venue */}
        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-[#111] mb-4 border-b border-black/10 pb-2">Venue Location</h3>
              
              <div className="space-y-4">
                <div>
                  <FL>Province</FL>
                  <TSelect value={BATANGAS_PROVINCE} onChange={() => {}} options={[BATANGAS_PROVINCE]} disabled />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Municipality *</FL>
                    <TSelect
                      value={form.municipality}
                      onChange={(val) => setForm({ ...form, municipality: val, barangay: "" })}
                      options={municipalities}
                      placeholder="Select Municipality"
                    />
                  </div>
                  <div>
                    <FL>Barangay *</FL>
                    <TSelect
                      value={form.barangay}
                      onChange={(val) => setForm({ ...form, barangay: val })}
                      options={barangays}
                      placeholder="Select Barangay"
                      disabled={!form.municipality}
                    />
                  </div>
                </div>

                <div>
                  <FL>Street / Details</FL>
                  <TInput
                    placeholder="Purok 4, Near 7/11"
                    value={form.street}
                    onChange={(val) => setForm({ ...form, street: val })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <FL>Venue Type</FL>
              <TSelect
                value={isVenueTypeOther ? "Other" : form.venue_type}
                onChange={(val) => {
                  if (val === "Other") {
                    setForm({ ...form, venue_type: "" });
                  } else {
                    setForm({ ...form, venue_type: val });
                  }
                }}
                options={VENUE_TYPES}
                placeholder="Select venue type"
              />
              {isVenueTypeOther && (
                <div className="mt-2">
                  <TInput
                    placeholder="Enter custom venue type"
                    value={form.venue_type}
                    onChange={(val) => setForm({ ...form, venue_type: val })}
                  />
                </div>
              )}
            </div>
          </Card>
          
          <Card className="p-6">
            <FL>Special Requests (Optional)</FL>
            <TTextarea
              placeholder="Any specific requests or additional information..."
              value={form.special_requests}
              onChange={(val) => setForm({ ...form, special_requests: val })}
              rows={3}
            />
          </Card>
        </div>
        
      </div>
    </div>
  );
}
