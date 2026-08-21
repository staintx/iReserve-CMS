import { PartyPopper, MapPin, Package, Palette, Users } from "lucide-react";
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
import {
  guestCountLabel,
  guestCountHelp,
  offerGuestCount,
} from "../../../../lib/specialOffers";
import {
  VENUE_TYPES,
  OTHER_VENUE_TYPE,
  isCustomVenueType,
} from "../lib/bookingRules";

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
  offer = null,
}) {
  const handleGuestChange = (nextValue) => {
    setForm((prev) => ({ ...prev, guest_count: String(nextValue) }));
  };

  // "Other" is stored as itself so the select can show it selected and the
  // follow-up field can be required against it. Picking it used to blank
  // `venue_type`, which made the condition that reveals the field false the
  // instant it became true — the field could never appear at all.
  const isVenueTypeOther = isCustomVenueType(form);
  // A draft saved before the sentinel existed holds the customer's own wording
  // in `venue_type` itself. It is read from there so nothing they typed is lost,
  // and the first edit writes it back in the current shape.
  const venueTypeOther =
    form.venue_type === OTHER_VENUE_TYPE
      ? form.venue_type_other || ""
      : form.venue_type || "";
  const currentCount = parseInt(form.guest_count, 10) || guestMin;

  // A combo serves the number of guests it was built for, so the count is not
  // a question — it is stated. The counter is replaced rather than disabled,
  // because a disabled stepper reads as something the customer is failing to
  // reach rather than as a fact about what they picked.
  const comboPax = offer ? offerGuestCount(offer) : 0;

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Event Details"
        sub={
          offer
            ? "Your venue. This combo already covers the guest count and the food."
            : "Your venue and guest count. Both affect your price."
        }
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

            {/* Regular and custom bookings collect an *estimated* guest count:
                it is an opening figure that can still move at quotation, ocular
                or revision. A combo's count belongs to the combo, so it is
                shown rather than asked for. */}
            <Field
              label={guestCountLabel(offer)}
              required={!comboPax}
              hint={
                offer
                  ? guestCountHelp(offer)
                  : setupCapacity?.status === "ok"
                    ? setupCapacity.message
                    : `${guestCountHelp(offer)} ${guestMin} to ${guestMax} guests.`
              }
              error={errors.guest_count || (setupCapacity?.status === "under" ? setupCapacity.message : "")}
            >
              {comboPax > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <Users size={16} className="text-[#4C81E0]" />
                  <strong className="text-[15px] font-semibold text-[#1E293B]">
                    {comboPax} guests
                  </strong>
                  <span className="text-[13px] text-[#64748B]">
                    · set by {offer.name}
                  </span>
                </div>
              ) : (
                <GuestCounter
                  value={currentCount}
                  onChange={handleGuestChange}
                  min={guestMin}
                  max={guestMax}
                />
              )}
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
                value={isVenueTypeOther ? OTHER_VENUE_TYPE : form.venue_type}
                onChange={(val) =>
                  setForm({
                    ...form,
                    venue_type: val,
                    // Switching to a listed venue drops the free text with it,
                    // so a venue the customer moved away from cannot be
                    // submitted alongside the one they settled on.
                    venue_type_other:
                      val === OTHER_VENUE_TYPE ? venueTypeOther : "",
                  })
                }
                options={VENUE_TYPES}
                placeholder="Select venue type"
              />
            </Field>

            {/* Only "Other" leaves the question unanswered, so only "Other"
                asks a follow-up — and having asked, the answer is required. */}
            {isVenueTypeOther && (
              <Field
                label="Please specify your venue type"
                required
                error={errors.venue_type_other}
              >
                <TInput
                  placeholder="e.g. Rooftop terrace"
                  value={venueTypeOther}
                  onChange={(val) =>
                    setForm({
                      ...form,
                      venue_type: OTHER_VENUE_TYPE,
                      venue_type_other: val,
                    })
                  }
                  hasError={!!errors.venue_type_other}
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
