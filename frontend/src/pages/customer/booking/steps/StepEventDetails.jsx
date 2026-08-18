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
import { guestCountLabel, guestCountHelp } from "../../../../lib/specialOffers";
import { focusRing } from "../lib/bookingUI";
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
  estimate,
  errors = {},
  setupCapacity = null,
  offer = null,
  onSelectOfferScaffold = () => {},
}) {
  const handleGuestChange = (nextValue) => {
    setForm((prev) => ({ ...prev, guest_count: String(nextValue) }));
  };

  const isVenueTypeOther =
    form.venue_type && !VENUE_TYPES.includes(form.venue_type);
  const currentCount = parseInt(form.guest_count, 10) || guestMin;

  const offerSizes = offer && Array.isArray(offer.scaffold_size_options)
    ? offer.scaffold_size_options.filter((option) => option?._id)
    : [];

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Event Details"
        sub={
          offer
            ? "Your venue and guest count. This offer is priced per person, so the count sets your food price."
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
                or revision. A Special Offer's count is the number its price is
                built from, so it is asked for as the guest count and capped. */}
            <Field
              label={guestCountLabel(offer)}
              required
              hint={
                offer
                  ? `${guestCountHelp(offer)}${
                      guestMax ? ` Up to ${guestMax} guests.` : ""
                    }`
                  : setupCapacity?.status === "ok"
                    ? setupCapacity.message
                    : `${guestCountHelp(offer)} ${guestMin} to ${guestMax} guests.`
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

            {/* An offer is booked straight from its card, so this is where its
                setup size is chosen. The size decides the setup charge — and,
                where the offer says so, whether there is one at all. */}
            {offerSizes.length > 0 && (
              <Field
                label="Set-up size"
                hint="Your food price is per person. Set-up is separate — this offer covers it at some sizes, and your quotation prices the rest."
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {offerSizes.map((option) => {
                    const selected =
                      String(form.selected_scaffold_option_id) === String(option._id);
                    return (
                      <button
                        key={option._id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelectOfferScaffold(option._id)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          selected
                            ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0]"
                            : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50",
                          focusRing,
                        )}
                      >
                        <span className="block text-sm font-semibold text-[#1E293B]">
                          {option.label ||
                            `${option.width_ft} × ${option.length_ft} ft`}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs font-semibold",
                            option.free_setup ? "text-emerald-600" : "text-[#64748B]",
                          )}
                        >
                          {option.free_setup
                            ? "Free set-up with this offer"
                            : "Set-up priced on your quotation"}
                        </span>
                        {(option.guest_min || option.guest_max) && (
                          <span className="mt-0.5 block text-xs text-[#94A3B8]">
                            Fits {option.guest_min || 0}–{option.guest_max || "∞"} guests
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
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
