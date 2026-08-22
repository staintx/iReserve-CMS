import { PartyPopper, MapPin, Package, Palette, Users, Truck, Store, Sparkles } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TInput,
  TSelect,
  GuestCounter,
  SectionTitle,
  SelectableCard,
  InfoNote,
  FieldStatusPill,
  StepShell,
} from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";
import ThemePicker, { ColorPalettePicker } from "../components/ThemePicker";
import { EVENT_TYPES, OTHER_EVENT_TYPE } from "../../../../lib/eventTypes";
import {
  guestCountLabel,
  guestCountHelp,
  offerPricePerPax,
} from "../../../../lib/specialOffers";
import {
  SERVICE_TYPES,
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
  pickupAddress,
}) {
  const handleGuestChange = (nextValue) => {
    setForm((prev) => ({ ...prev, guest_count: String(nextValue) }));
  };

  const isVenueTypeOther = isCustomVenueType(form);
  const venueTypeOther =
    form.venue_type === OTHER_VENUE_TYPE
      ? form.venue_type_other || ""
      : form.venue_type || "";
  const currentCount = parseInt(form.guest_count, 10) || guestMin || 1;

  // For Special Offers
  const isOffer = Boolean(offer);
  const perPax = isOffer ? offerPricePerPax(offer) : 0;

  // Selected fulfillment option for Special Offers
  const isWithSetup = form.service_type === SERVICE_TYPES.FULL_SERVICE;
  const isFoodOnly = form.service_type === SERVICE_TYPES.FOOD_ONLY;
  const isPickup = isFoodOnly && form.delivery_method === "pickup";
  const isDelivery = isFoodOnly && form.delivery_method !== "pickup";

  const handleOptionChange = (optionKey) => {
    if (optionKey === "pickup") {
      setForm((prev) => ({
        ...prev,
        service_type: SERVICE_TYPES.FOOD_ONLY,
        delivery_method: "pickup",
        include_food: true,
      }));
    } else if (optionKey === "delivery") {
      setForm((prev) => ({
        ...prev,
        service_type: SERVICE_TYPES.FOOD_ONLY,
        delivery_method: "delivery",
        include_food: true,
      }));
    } else if (optionKey === "setup") {
      setForm((prev) => ({
        ...prev,
        service_type: SERVICE_TYPES.FULL_SERVICE,
        delivery_method: "setup",
        include_food: true,
      }));
    }
  };

  const fulfillmentOptions = [
    {
      key: "pickup",
      title: "Food only — Pick Up",
      description: "Collect freshly packed food directly from our kitchen.",
      icon: Store,
      active: isPickup,
    },
    {
      key: "delivery",
      title: "Food only — Delivery",
      description: "We deliver the food order safely to your address.",
      icon: Truck,
      active: isDelivery,
    },
    {
      key: "setup",
      title: "With Event Setup",
      description: "Full catering with buffet setup, styling, equipment & crew.",
      icon: Sparkles,
      active: isWithSetup,
    },
  ];

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title={isOffer ? "Service Option & Details" : "Event Details"}
        sub={
          isOffer
            ? "Choose how you'd like to avail this combo, specify your guest count, and provide location details."
            : "Your venue and guest count. Both affect your price."
        }
        aside={
          !isCustomBooking && selectedPackageName ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#4C81E0]/25 bg-[#4C81E0]/10 px-3 py-1.5 text-[13px]">
              <Package size={14} className="text-[#4C81E0]" />
              <span className="text-[#64748B]">{isOffer ? "Combo:" : "Package:"}</span>
              <strong className="font-semibold text-[#1E293B]">
                {selectedPackageName}
              </strong>
            </span>
          ) : null
        }
      />

      {/* Special Offer Fulfillment Option Selection */}
      {isOffer && (
        <Card className="mb-4 p-4">
          <SectionTitle icon={Sparkles}>Choose your service option</SectionTitle>
          <p className="mb-3 text-[13px] text-[#64748B]">
            Select how you would like your {offer.name} prepared and fulfilled:
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {fulfillmentOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectableCard
                  key={opt.key}
                  selected={opt.active}
                  showCheck={false}
                  onClick={() => handleOptionChange(opt.key)}
                  className="flex flex-col items-start gap-2.5 p-3.5"
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                        opt.active
                          ? "bg-[#4C81E0] text-white"
                          : "bg-[#F1F5F9] text-[#64748B]",
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                        opt.active
                          ? "bg-[#4C81E0] text-white"
                          : "border border-[#CBD5E1] bg-white text-transparent",
                      )}
                    >
                      ✓
                    </span>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-[#1E293B]">
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[#64748B]">
                      {opt.description}
                    </span>
                  </div>
                </SelectableCard>
              );
            })}
          </div>
        </Card>
      )}

      {/* Guest Count Card */}
      <Card className="mb-4 p-4">
        <SectionTitle icon={Users}>Guest Count</SectionTitle>
        <div className="space-y-3">
          <Field
            label={guestCountLabel(offer)}
            required
            hint={
              isOffer
                ? perPax > 0
                  ? `₱${perPax.toLocaleString("en-PH")} per pax · ${currentCount} guests = ₱${(currentCount * perPax).toLocaleString("en-PH")} estimated food price`
                  : guestCountHelp(offer)
                : setupCapacity?.status === "ok"
                  ? setupCapacity.message
                  : `${guestCountHelp(offer)} ${guestMin} to ${guestMax} guests.`
            }
            error={
              errors.guest_count ||
              (setupCapacity?.status === "under" ? setupCapacity.message : "")
            }
          >
            <GuestCounter
              value={currentCount}
              onChange={handleGuestChange}
              min={guestMin || 1}
              max={guestMax || 1000}
            />
          </Field>
        </div>
      </Card>

      {/* Conditional Details based on Selected Option */}
      {isOffer && isPickup ? (
        <Card className="p-4">
          <SectionTitle icon={Store}>Pickup Location</SectionTitle>
          <InfoNote icon={Store} title="You're collecting this order">
            Your {offer.name} order will be prepared fresh and packed ready for pickup at{" "}
            <strong>{pickupAddress || "Caezelle's Catering Kitchen (Batangas)"}</strong> on your selected date and time.
          </InfoNote>
        </Card>
      ) : isOffer && isDelivery ? (
        <Card className="p-4">
          <SectionTitle icon={Truck}>Delivery Address</SectionTitle>
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
              required
              hint="Where our delivery driver will drop off the food."
              error={errors.street}
            >
              <TInput
                placeholder="e.g. Purok 4, Lopez Building"
                value={form.street}
                onChange={(val) => setForm({ ...form, street: val })}
                hasError={!!errors.street}
              />
            </Field>

            <Field label="Landmark" hint="Optional, helps our driver find you.">
              <TInput
                placeholder="e.g. Across the municipal hall"
                value={form.landmark}
                onChange={(val) => setForm({ ...form, landmark: val })}
              />
            </Field>
          </div>
        </Card>
      ) : (
        /* With Event Setup or Regular Package */
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <SectionTitle icon={PartyPopper}>About the event</SectionTitle>

              <div className="space-y-3">
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
                        venue_type_other:
                          val === OTHER_VENUE_TYPE ? venueTypeOther : "",
                      })
                    }
                    options={VENUE_TYPES}
                    placeholder="Select venue type"
                  />
                </Field>

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

          {/* Design from Scratch, chosen on the Package step, already asked for
              a theme and palette alongside the rest of that custom concept —
              asking again here would be the same question twice. */}
          {!form.is_custom_setup && (
            <Card className="mt-3 p-4">
              <SectionTitle icon={Palette}>Theme and colour palette</SectionTitle>
              <p className="mb-3 text-[13px] text-[#64748B]">
                Two independent, optional choices. Enter a theme, pick a color palette, or both — our stylists coordinate the setup, backdrop and table decorations to match whatever you choose.
              </p>

              <div className="mb-1.5 flex items-center justify-between gap-3">
                <h4 className="text-[12px] font-semibold text-[#1E293B]">Theme</h4>
                <FieldStatusPill value={form.event_theme} />
              </div>
              <ThemePicker
                value={form.event_theme}
                onChange={(theme) => setForm((prev) => ({ ...prev, event_theme: theme }))}
              />

              <div className="mt-4 mb-1.5 flex items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4">
                <h4 className="text-[12px] font-semibold text-[#1E293B]">Color palette</h4>
                <FieldStatusPill
                  value={
                    Array.isArray(form.event_palette) && form.event_palette.length > 0
                      ? form.event_palette.join(", ")
                      : ""
                  }
                />
              </div>
              <ColorPalettePicker
                value={form.event_palette}
                onChange={(palette) => setForm((prev) => ({ ...prev, event_palette: palette }))}
              />
            </Card>
          )}
        </>
      )}
    </StepShell>
  );
}
