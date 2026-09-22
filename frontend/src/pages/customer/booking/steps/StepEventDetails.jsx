import { useEffect, useMemo } from "react";
import { PartyPopper, MapPin, Package, Palette, Users, Truck, Store, Sparkles, User, Heart } from "lucide-react";
import {
  Card,
  SH,
  FL,
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
  packageDetails,
  guestMin = 1,
  guestMax = null,

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

  const scaffoldOptions = useMemo(() => {
    if (isOffer || !packageDetails?.scaffold_size_options) return [];
    return packageDetails.scaffold_size_options.filter(
      (o) => o?.width_ft || o?.price || o?.label,
    );
  }, [isOffer, packageDetails]);

  const activeScaffoldOption = useMemo(() => {
    if (!scaffoldOptions.length) return null;
    return (
      scaffoldOptions.find(
        (o) => String(o._id) === String(form.selected_scaffold_option_id),
      ) || scaffoldOptions[0]
    );
  }, [scaffoldOptions, form.selected_scaffold_option_id]);

  const handleScaffoldChange = (optionId) => {
    const selectedOpt = scaffoldOptions.find(
      (o) => String(o._id) === String(optionId),
    );
    if (!selectedOpt) return;

    const optMin = Number(selectedOpt.guest_min) || 1;
    const optMax = selectedOpt.guest_max ? Number(selectedOpt.guest_max) : null;
    const curr = parseInt(form.guest_count, 10) || optMin;

    let nextGuestCount = curr;
    if (curr < optMin) {
      nextGuestCount = optMin;
    } else if (optMax && curr > optMax) {
      nextGuestCount = optMax;
    }

    setForm((prev) => ({
      ...prev,
      selected_scaffold_option_id: String(selectedOpt._id),
      scaffold_width: selectedOpt.width_ft,
      scaffold_length: selectedOpt.length_ft,
      scaffold_base_area:
        selectedOpt.area_ft2 ||
        (selectedOpt.width_ft && selectedOpt.length_ft
          ? selectedOpt.width_ft * selectedOpt.length_ft
          : undefined),
      scaffold_price: selectedOpt.price,
      scaffold_guest_min: selectedOpt.guest_min,
      scaffold_guest_max: selectedOpt.guest_max,
      guest_count: String(nextGuestCount),
    }));
  };

  useEffect(() => {
    if (!isOffer && scaffoldOptions.length > 0) {
      const exists = scaffoldOptions.some(
        (o) => String(o._id) === String(form.selected_scaffold_option_id),
      );
      if (!exists) {
        const defaultOpt =
          scaffoldOptions.find(
            (o) => String(o._id) === String(packageDetails?.default_scaffold_option_id),
          ) || scaffoldOptions[0];
        if (defaultOpt) {
          handleScaffoldChange(defaultOpt._id);
        }
      }
    }
  }, [scaffoldOptions, isOffer, form.selected_scaffold_option_id, packageDetails?.default_scaffold_option_id]);

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
    <StepShell width="wide">
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
                max={guestMax}
              />
            </Field>
          </Card>

          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={Store}>Pickup location</SectionTitle>
            <InfoNote icon={Store} title="Kitchen pickup">
              Your {offer.name} order will be prepared fresh and packed ready for pickup at{" "}
              <strong>{pickupAddress || "Caezelle’s Food, Catering & Services Kitchen (Batangas)"}</strong> on your selected date and time.
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
                  hint="Used for your event title and official quotation"
                  error={errors.celebrant_name}
                >
                  <TInput
                    placeholder="e.g. Maria (Birthday), John & Sarah (Wedding)"
                    maxLength={80}
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
                  max={guestMax}
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
                  placeholder="e.g. 123 Rizal St., Purok 4, Villa Subdivision"
                  maxLength={150}
                  value={form.street}
                  onChange={(val) => setForm({ ...form, street: val })}
                  hasError={!!errors.street}
                />
              </Field>

              <Field label="Landmark" hint="Helps our delivery driver locate your address">
                <TInput
                  placeholder="e.g. Near Barangay Hall, behind Shell station"
                  maxLength={100}
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
          {/* Left Column: About the event */}
          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={PartyPopper}>About the event</SectionTitle>
            <div className="space-y-3">
              {/* Who is this event for */}
              <div>
                <FL>Who is this event for?</FL>
                <div className="grid grid-cols-2 gap-2 mt-1">
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
                  hint="Used for your event title and official quotation"
                  error={errors.celebrant_name}
                >
                  <TInput
                    placeholder="e.g. Maria (Birthday), John & Sarah (Wedding)"
                    maxLength={80}
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
                    placeholder="e.g. Family Reunion, Milestone Anniversary"
                    maxLength={50}
                    value={form.event_type_other}
                    onChange={(val) => setForm({ ...form, event_type_other: val })}
                    hasError={!!errors.event_type_other}
                  />
                </Field>
              )}

              {/* Scaffold Size Selection */}
              {!isOffer && scaffoldOptions.length > 0 && (
                <Field
                  label="Scaffold size"
                  required
                  hint={
                    activeScaffoldOption
                      ? `Base setup: ₱${Number(activeScaffoldOption.price || 0).toLocaleString("en-PH")} · Fits ${activeScaffoldOption.guest_min || 1}–${activeScaffoldOption.guest_max || "more"} guests`
                      : "Choose the scaffold size for your event"
                  }
                  error={errors.scaffold_size}
                >
                  <TSelect
                    value={activeScaffoldOption?._id || ""}
                    onChange={handleScaffoldChange}
                    options={scaffoldOptions.map((opt) => {
                      const dims = `${opt.width_ft} × ${opt.length_ft} ft`;
                      const guestStr = opt.guest_min && opt.guest_max
                        ? `${opt.guest_min}–${opt.guest_max} guests`
                        : opt.guest_max
                          ? `up to ${opt.guest_max} guests`
                          : opt.guest_min
                            ? `from ${opt.guest_min} guests`
                            : "";
                      const priceStr = opt.price ? `₱${Number(opt.price).toLocaleString("en-PH")}` : "";
                      const details = [guestStr, priceStr].filter(Boolean).join(" · ");
                      return {
                        value: String(opt._id),
                        label: `${opt.label || dims}${details ? ` (${details})` : ""}`,
                      };
                    })}
                    placeholder="Select scaffold size"
                  />
                </Field>
              )}

              <Field
                label={guestCountLabel(offer)}
                required
                hint={
                  setupCapacity?.message ||
                  (guestMax
                    ? `Guests between ${guestMin || 1} and ${guestMax} supported.`
                    : `Minimum ${guestMin || 1} guest${(guestMin || 1) === 1 ? "" : "s"} supported.`)
                }
                error={errors.guest_count}
              >
                <GuestCounter
                  value={currentCount}
                  onChange={handleGuestChange}
                  min={guestMin || 1}
                  max={guestMax}
                />
              </Field>
            </div>
          </Card>

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
                  placeholder="e.g. 123 Rizal St., Purok 4, Villa Subdivision"
                  maxLength={150}
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

                <Field label="Landmark" hint="Helps our crew locate the venue">
                  <TInput
                    placeholder="e.g. Near Barangay Hall, behind Shell station"
                    maxLength={100}
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
                    placeholder="e.g. Covered Court, Rooftop Terrace, Private Garden"
                    maxLength={60}
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

          {/* Spanning Row: Theme & Palette (when not in Bespoke Custom Setup tab) */}
          {!form.is_custom_setup && (
            <Card className="p-3.5 sm:p-4 lg:col-span-2">
              <SectionTitle
                icon={Palette}
                right={<FieldStatusPill value={form.event_theme} />}
              >
                Theme &amp; styling motif
              </SectionTitle>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Theme or styling motif
                  </label>
                  <ThemePicker
                    value={form.event_theme}
                    onChange={(theme) => setForm((prev) => ({ ...prev, event_theme: theme }))}
                  />
                </div>

                <div className="border-t border-slate-100 pt-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      Color palette
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
      )}
    </StepShell>
  );
}
