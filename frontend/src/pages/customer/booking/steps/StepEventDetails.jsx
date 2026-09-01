import { PartyPopper, MapPin, Package, Palette, Users, Truck, Store, Sparkles, User, Heart } from "lucide-react";
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
            : "Specify your event type, guest count, and venue location."
        }
        aside={
          !isCustomBooking && selectedPackageName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs">
              <Package size={13} className="text-[#4C81E0]" />
              <span className="text-slate-500">{isOffer ? "Combo:" : "Package:"}</span>
              <strong className="font-semibold text-slate-800">
                {selectedPackageName}
              </strong>
            </span>
          ) : null
        }
      />

      {/* Special Offer Fulfillment Option Selection */}
      {isOffer && (
        <Card className="mb-3.5 p-3.5 sm:p-4">
          <SectionTitle icon={Sparkles}>Choose your service option</SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {fulfillmentOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectableCard
                  key={opt.key}
                  selected={opt.active}
                  showCheck={false}
                  onClick={() => handleOptionChange(opt.key)}
                  className="flex items-start gap-2.5 p-3"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      opt.active
                        ? "bg-[#4C81E0] text-white"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-900 leading-tight">
                      {opt.title}
                    </span>
                    <span className="block text-[11px] text-slate-500 leading-tight mt-0.5">
                      {opt.description}
                    </span>
                  </div>
                </SelectableCard>
              );
            })}
          </div>
        </Card>
      )}

      {/* Conditional Details based on Selected Option for Offer */}
      {isOffer && isPickup ? (
        <div className="flex flex-col gap-3.5">
          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={Users}>Guest count</SectionTitle>
            <Field
              label={guestCountLabel(offer)}
              required
              hint={
                perPax > 0
                  ? `₱${perPax.toLocaleString("en-PH")} / pax · ${currentCount} guests = ₱${(currentCount * perPax).toLocaleString("en-PH")} estimated total`
                  : guestCountHelp(offer)
              }
              error={errors.guest_count}
            >
              <GuestCounter
                value={currentCount}
                onChange={handleGuestChange}
                min={guestMin || 1}
                max={guestMax || 1000}
              />
            </Field>
          </Card>

          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={Store}>Pickup location</SectionTitle>
            <InfoNote icon={Store} title="Kitchen pickup">
              Your {offer.name} order will be prepared fresh and packed ready for pickup at{" "}
              <strong>{pickupAddress || "Caezelle's Catering Kitchen (Batangas)"}</strong> on your selected date and time.
            </InfoNote>
          </Card>
        </div>
      ) : isOffer && isDelivery ? (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 items-start">
          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={Users}>Event Details &amp; Guests</SectionTitle>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Who is this event for?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, booking_for: "myself", celebrant_name: "" }))}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                      form.booking_for !== "someone_else"
                        ? "border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary/30 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>For myself</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, booking_for: "someone_else" }))}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                      form.booking_for === "someone_else"
                        ? "border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary/30 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>For someone else</span>
                  </button>
                </div>
              </div>

              {form.booking_for === "someone_else" && (
                <Field
                  label="Celebrant / Honoree name"
                  required
                  hint="e.g. Sarah, John & Maria (used for your event title)"
                  error={errors.celebrant_name}
                >
                  <TInput
                    placeholder="e.g. Sarah"
                    value={form.celebrant_name || ""}
                    onChange={(val) => setForm((prev) => ({ ...prev, celebrant_name: val }))}
                    hasError={!!errors.celebrant_name}
                  />
                </Field>
              )}

              <Field
                label={guestCountLabel(offer)}
                required
                hint={
                  perPax > 0
                    ? `₱${perPax.toLocaleString("en-PH")} / pax · ${currentCount} guests = ₱${(currentCount * perPax).toLocaleString("en-PH")} estimated total`
                    : guestCountHelp(offer)
                }
                error={errors.guest_count}
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

          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={Truck}>Delivery address</SectionTitle>
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                  hint={!form.municipality ? "Select a municipality first" : undefined}
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
                error={errors.street}
              >
                <TInput
                  placeholder="e.g. Purok 4, Lopez Building"
                  value={form.street}
                  onChange={(val) => setForm({ ...form, street: val })}
                  hasError={!!errors.street}
                />
              </Field>

              <Field label="Landmark" hint="Optional, helps driver find location">
                <TInput
                  placeholder="e.g. Across the municipal hall"
                  value={form.landmark}
                  onChange={(val) => setForm({ ...form, landmark: val })}
                />
              </Field>
            </div>
          </Card>
        </div>
      ) : (
        /* Regular Package or Event Setup Flow */
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 items-start">
          {/* Left Column: Event Basics & Theme */}
          <div className="flex flex-col gap-3.5">
            <Card className="p-3.5 sm:p-4">
              <SectionTitle icon={PartyPopper}>About the event</SectionTitle>
              <div className="space-y-3">
                {/* Who is this event for */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Who is this event for?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, booking_for: "myself", celebrant_name: "" }))}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                        form.booking_for !== "someone_else"
                          ? "border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary/30 shadow-2xs"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>For myself</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, booking_for: "someone_else" }))}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                        form.booking_for === "someone_else"
                          ? "border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary/30 shadow-2xs"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>For someone else</span>
                    </button>
                  </div>
                </div>

                {form.booking_for === "someone_else" && (
                  <Field
                    label="Celebrant / Honoree name"
                    required
                    hint="e.g. Sarah, John & Maria, Baby Liam (used for your event title & quote)"
                    error={errors.celebrant_name}
                  >
                    <TInput
                      placeholder="e.g. Sarah"
                      value={form.celebrant_name || ""}
                      onChange={(val) => setForm((prev) => ({ ...prev, celebrant_name: val }))}
                      hasError={!!errors.celebrant_name}
                    />
                  </Field>
                )}

                <Field
                  label="Event type"
                  required
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
                    label="Specify event type"
                    required
                    error={errors.event_type_other}
                  >
                    <TInput
                      placeholder="e.g. Family Reunion"
                      value={form.event_type_other}
                      onChange={(val) => setForm({ ...form, event_type_other: val })}
                      hasError={!!errors.event_type_other}
                    />
                  </Field>
                )}

                <Field
                  label={guestCountLabel(offer)}
                  required
                  hint={
                    setupCapacity?.status === "ok"
                      ? setupCapacity.message
                      : `${guestMin} to ${guestMax} guests supported.`
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

            {/* Theme & Palette (when not in Bespoke Custom Setup tab) */}
            {!form.is_custom_setup && (
              <Card className="p-3.5 sm:p-4">
                <SectionTitle
                  icon={Palette}
                  right={<FieldStatusPill value={form.event_theme} />}
                >
                  Theme &amp; styling motif
                </SectionTitle>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Event Theme (Optional)
                    </label>
                    <ThemePicker
                      value={form.event_theme}
                      onChange={(theme) => setForm((prev) => ({ ...prev, event_theme: theme }))}
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        Color palette (Optional)
                      </label>
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
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Venue Location */}
          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={MapPin}>Venue location</SectionTitle>
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                  hint={!form.municipality ? "Select municipality first" : undefined}
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
                hint="Street, subdivision, or building name"
              >
                <TInput
                  placeholder="e.g. Purok 4, Lopez Building"
                  value={form.street}
                  onChange={(val) => setForm({ ...form, street: val })}
                />
              </Field>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Venue type" hint="Optional">
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

                <Field label="Landmark" hint="Optional">
                  <TInput
                    placeholder="e.g. Across the municipal hall"
                    value={form.landmark}
                    onChange={(val) => setForm({ ...form, landmark: val })}
                  />
                </Field>
              </div>

              {isVenueTypeOther && (
                <Field
                  label="Specify venue type"
                  required
                  error={errors.venue_type_other}
                >
                  <TInput
                    placeholder="e.g. Rooftop terrace, Covered court"
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
            </div>
          </Card>
        </div>
      )}
    </StepShell>
  );
}
