import { useEffect } from "react";
import { PartyPopper, MapPin, Package } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TInput,
  TSelect,
  TTextarea,
  GuestCounter,
  SectionTitle,
  StepShell,
} from "../components/BookingSharedUI";

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

  const isVenueTypeOther =
    form.venue_type && !VENUE_TYPES.includes(form.venue_type);
  const currentCount = parseInt(form.guest_count) || guestMin;

  return (
    <StepShell>
      <SH
        title="Event Details"
        sub="Tell us about your event so we can prepare the right setup."
        aside={
          !isCustomBooking && selectedPackageName ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#4C81E0]/25 bg-[#4C81E0]/10 px-3 py-1.5 text-[13px]">
              <Package size={14} className="text-[#4C81E0]" />
              <span className="text-[#64748B]">Package:</span>
              <strong className="font-semibold text-[#1E293B]">
                {selectedPackageName}
              </strong>
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Event basics */}
        <Card className="p-4 sm:p-5">
          <SectionTitle icon={PartyPopper}>About the event</SectionTitle>

          <div className="space-y-3.5">
            <Field label="Event Type" required>
              <TSelect
                value={form.event_type}
                onChange={(val) =>
                  setForm({
                    ...form,
                    event_type: val,
                    event_type_other:
                      val === "Other" ? form.event_type_other : "",
                  })
                }
                options={["Birthday", "Wedding", "Corporate", "Other"]}
                placeholder="Select event type"
              />
            </Field>

            {form.event_type === "Other" && (
              <Field label="Specify Event Type">
                <TInput
                  placeholder="Anniversary, Christening, etc."
                  value={form.event_type_other}
                  onChange={(val) => setForm({ ...form, event_type_other: val })}
                />
              </Field>
            )}

            <Field
              label="Event Theme / Motif"
              hint="Optional — e.g. a color scheme or styling direction."
            >
              <TInput
                placeholder="e.g. Rustic, Navy Blue"
                value={form.event_theme}
                onChange={(val) => setForm({ ...form, event_theme: val })}
              />
            </Field>

            <Field
              label="Estimated Guest Count"
              required
              hint={`${guestMin} – ${guestMax} guests`}
            >
              <GuestCounter
                value={currentCount}
                onChange={handleGuestChange}
                min={guestMin}
                max={guestMax}
              />
            </Field>
          </div>
        </Card>

        {/* Venue */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={MapPin}>Venue location</SectionTitle>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label="Municipality" required>
                  <TSelect
                    value={form.municipality}
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
                    value={form.barangay}
                    onChange={(val) => setForm({ ...form, barangay: val })}
                    options={barangays}
                    placeholder="Select Barangay"
                    disabled={!form.municipality}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label="Street / Details">
                  <TInput
                    placeholder="Purok 4, Near 7/11"
                    value={form.street}
                    onChange={(val) => setForm({ ...form, street: val })}
                  />
                </Field>
                <Field label="Venue Type">
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
                </Field>
              </div>

              {isVenueTypeOther && (
                <Field label="Specify Venue Type">
                  <TInput
                    placeholder="Enter custom venue type"
                    value={form.venue_type}
                    onChange={(val) => setForm({ ...form, venue_type: val })}
                  />
                </Field>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <Field
              label="Special Requests (Optional)"
              hint="Anything else our coordinators should know."
            >
              <TTextarea
                placeholder="Any specific requests or additional information..."
                value={form.special_requests}
                onChange={(val) => setForm({ ...form, special_requests: val })}
                rows={3}
              />
            </Field>
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
