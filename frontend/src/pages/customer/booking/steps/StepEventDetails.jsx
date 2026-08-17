import { PartyPopper, MapPin, Package, Palette } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TInput,
  TSelect,
  GuestCounter,
  SectionTitle,
  StepShell,
} from "../components/BookingSharedUI";
import EstimateSummary from "../components/EstimateSummary";
import ThemePicker from "../components/ThemePicker";
import { EVENT_TYPES, OTHER_EVENT_TYPE } from "../../../../lib/eventTypes";

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
  estimate,
  errors = {},
  setupCapacity = null,
}) {
  const handleGuestChange = (nextValue) => {
    setForm((prev) => ({ ...prev, guest_count: String(nextValue) }));
  };

  const isVenueTypeOther =
    form.venue_type && !VENUE_TYPES.includes(form.venue_type);
  const currentCount = parseInt(form.guest_count, 10) || guestMin;

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Event Details"
        sub="Your venue and guest count. Both affect your price."
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle icon={PartyPopper}>About the event</SectionTitle>

          <div className="space-y-3">
            {/* Prefilled when the customer arrived from a package, but never
                locked: the package sets the starting point, not the truth about
                what the event is. An admin can correct it later in the
                Quotation Builder, and both sides offer the same list. */}
            <Field
              label="Event type"
              required
              hint={
                initialEventType
                  ? "Prefilled from the package you picked. Change it if your event is something else."
                  : undefined
              }
              error={errors.event_type}
            >
              <TSelect
                value={form.event_type}
                onChange={(val) =>
                  setForm({
                    ...form,
                    event_type: val,
                    event_type_other:
                      val === OTHER_EVENT_TYPE ? form.event_type_other : "",
                  })
                }
                options={EVENT_TYPES}
                placeholder="Select event type"
                hasError={!!errors.event_type}
              />
            </Field>

            {form.event_type === OTHER_EVENT_TYPE && (
              <Field
                label="Which kind of event?"
                required
                error={errors.event_type_other}
              >
                <TInput
                  placeholder="e.g. Reunion"
                  value={form.event_type_other}
                  onChange={(val) => setForm({ ...form, event_type_other: val })}
                  hasError={!!errors.event_type_other}
                />
              </Field>
            )}

            <Field
              label="Guest count"
              required
              hint={
                setupCapacity?.status === "ok"
                  ? setupCapacity.message
                  : `${guestMin} to ${guestMax} guests.`
              }
              error={errors.guest_count || (setupCapacity?.status === "under" ? setupCapacity.message : "")}
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

        <Card className="p-4">
          <SectionTitle icon={MapPin}>Venue location</SectionTitle>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Municipality" required error={errors.municipality}>
                <TSelect
                  value={form.municipality}
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
                  value={form.barangay}
                  onChange={(val) => setForm({ ...form, barangay: val })}
                  options={barangays}
                  placeholder="Select barangay"
                  disabled={!form.municipality}
                  hasError={!!errors.barangay}
                />
              </Field>
            </div>

            <Field
              label="Street and building"
              hint="Optional, but it helps our team find the venue."
            >
              <TInput
                placeholder="e.g. Purok 4, Lopez Building"
                value={form.street}
                onChange={(val) => setForm({ ...form, street: val })}
              />
            </Field>

            <Field
              label="Venue type"
              hint="Optional."
            >
              <TSelect
                value={isVenueTypeOther ? "Other" : form.venue_type}
                onChange={(val) =>
                  setForm({ ...form, venue_type: val === "Other" ? "" : val })
                }
                options={VENUE_TYPES}
                placeholder="Select venue type"
              />
            </Field>

            {isVenueTypeOther && (
              <Field label="Which kind of venue?">
                <TInput
                  placeholder="e.g. Rooftop terrace"
                  value={form.venue_type}
                  onChange={(val) => setForm({ ...form, venue_type: val })}
                />
              </Field>
            )}

            <Field label="Landmark" hint="Optional.">
              <TInput
                placeholder="e.g. Across the municipal hall"
                value={form.landmark}
                onChange={(val) => setForm({ ...form, landmark: val })}
              />
            </Field>
          </div>
        </Card>
      </div>

      <Card className="mt-3 p-4">
        <SectionTitle icon={Palette}>Theme and colours</SectionTitle>
        <p className="mb-2.5 text-[13px] text-[#64748B]">
          Optional. Pick a look and our stylists work to it.
        </p>
        <ThemePicker
          value={form.event_theme}
          onChange={({ theme, palette }) =>
            setForm({ ...form, event_theme: theme, event_palette: palette })
          }
        />
      </Card>
    </StepShell>
  );
}
