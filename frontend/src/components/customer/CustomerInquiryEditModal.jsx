import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Palette,
  User,
  Utensils,
  Truck,
  Users,
  Loader2,
  Lock,
  Package as PackageIcon,
  Boxes,
  DollarSign,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Card,
  Field,
  TInput,
  TSelect,
  TTextarea,
  GuestCounter,
  SectionTitle,
  FieldStatusPill,
} from "../../pages/customer/booking/components/BookingSharedUI";
import ThemePicker, { ColorPalettePicker } from "../../pages/customer/booking/components/ThemePicker";
import {
  VENUE_TYPES,
  OTHER_VENUE_TYPE,
  isCustomVenueType,
  contactFieldError,
  SERVICE_TYPES,
} from "../../pages/customer/booking/lib/bookingRules";
import { EVENT_TYPES, OTHER_EVENT_TYPE, matchEventType, isOtherEventType } from "../../lib/eventTypes";
import { getBatangasMunicipalities, getBatangasBarangays, BATANGAS_PROVINCE } from "../../utils/batangas";
import { eventSpaceLabel } from "../../lib/packageDisplay";
import {
  offerFoodByCategory,
  offerInclusions,
  offerPricePerPax,
  offerBaseFoodPrice,
} from "../../lib/specialOffers";
import { formatCurrency } from "../../utils/format";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";

/** One read-only fact in the submitted-request snapshot. Renders nothing for an empty value, so an optional field that was never filled in just doesn't leave a gap. */
function SnapshotRow({ label, value, wide = false }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={wide ? "sm:col-span-2 min-w-0" : "min-w-0"}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

/** Marks a snapshot card as part of the original submission, not something this form can change. */
function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Lock className="h-3 w-3" /> As submitted
    </span>
  );
}

const sanitizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// The "Other" sentinel is a booking-flow presentation concept — the Inquiry
// schema stores whatever was typed as a plain string in `event_type`/
// `venue_type` directly. Reconstructing the sentinel + free-text split here
// mirrors StepEventDetails so an inquiry saved with a custom value edits the
// same way it was entered.
function formFromInquiry(inquiry) {
  const rawEventType = inquiry?.event_type || "";
  const eventTypeIsOther = isOtherEventType(rawEventType);
  const rawVenueType = inquiry?.venue_type || "";
  const venueTypeIsOther = isCustomVenueType({ venue_type: rawVenueType });

  return {
    event_type: eventTypeIsOther ? OTHER_EVENT_TYPE : matchEventType(rawEventType) || rawEventType,
    event_type_other: eventTypeIsOther ? rawEventType : "",
    event_date: toDateInputValue(inquiry?.event_date),
    start_time: inquiry?.start_time || "",
    duration_hours: inquiry?.duration_hours ?? "",
    guest_count: inquiry?.guest_count ?? "",
    service_type: inquiry?.service_type || SERVICE_TYPES.FULL_SERVICE,
    venue_type: venueTypeIsOther ? OTHER_VENUE_TYPE : rawVenueType,
    venue_type_other: venueTypeIsOther ? rawVenueType : "",
    province: inquiry?.province || BATANGAS_PROVINCE,
    municipality: inquiry?.municipality || "",
    barangay: inquiry?.barangay || "",
    street: inquiry?.street || "",
    landmark: inquiry?.landmark || "",
    zip_code: inquiry?.zip_code || "",
    event_theme: inquiry?.event_theme || "",
    event_palette: inquiry?.event_palette || [],
    special_requests: inquiry?.special_requests || "",
    allergies: inquiry?.allergies || "",
    dietary_restrictions: inquiry?.dietary_restrictions || "",
    delivery_method:
      inquiry?.delivery_method ||
      (inquiry?.service_type === SERVICE_TYPES.FOOD_ONLY ? "delivery" : "setup"),
    delivery_instructions: inquiry?.delivery_instructions || "",
    contact_first_name: inquiry?.contact_first_name || "",
    contact_last_name: inquiry?.contact_last_name || "",
    contact_email: inquiry?.contact_email || "",
    contact_phone: inquiry?.contact_phone || "",
    contact_alt_phone: inquiry?.contact_alt_phone || "",
  };
}

/**
 * Lets a customer correct their own inquiry's event details while it is still
 * pre-quotation (see CUSTOMER_EDITABLE_STATUSES on the backend). Deliberately
 * narrower than the booking wizard: package, menu, and setup size were chosen
 * once and stay fixed here — changing those means cancelling and sending a
 * new request. The backend re-checks everything this form assumes (blocked
 * dates, the Special Offer guest-count lock), so this validation is for a
 * good experience, not the actual guardrail.
 */
export default function CustomerInquiryEditModal({ open, inquiry, onClose, onSaved }) {
  const { notify } = useToast();
  const [form, setForm] = useState(() => formFromInquiry(inquiry));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(formFromInquiry(inquiry));
      setErrors({});
      setTouched({});
    }
  }, [open, inquiry]);

  const isOffer = inquiry?.booking_type === "special";
  const isCustomBooking = inquiry?.booking_type === "custom";
  // Delivery method only means something for a custom, Food Only request — a
  // package always includes on-site setup, so there is nothing to choose.
  const showDelivery = isCustomBooking && form.service_type === SERVICE_TYPES.FOOD_ONLY;
  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(() => getBatangasBarangays(form.municipality), [form.municipality]);

  // --- Read-only snapshot of what was actually submitted. Package, menu,
  // add-ons, and scaffold size are never editable here (see
  // CUSTOMER_EDITABLE_FIELDS on the backend), so these are derived straight
  // from `inquiry` rather than `form` — nothing below ever feeds handleSubmit.
  const submittedPackage =
    inquiry?.package_id && typeof inquiry.package_id === "object" ? inquiry.package_id : null;
  const packageName = submittedPackage?.name || inquiry?.package_name_snapshot || "";
  const eventSpace = inquiry ? eventSpaceLabel(inquiry, submittedPackage) : "";
  const selectedMenu = Array.isArray(inquiry?.selected_menu) ? inquiry.selected_menu : [];
  const menuNames = selectedMenu
    .map((item) => (item && typeof item === "object" ? item.name : null))
    .filter(Boolean);
  const serviceItems = Array.isArray(inquiry?.service_items) ? inquiry.service_items : [];
  const inventoryItems = Array.isArray(inquiry?.inventory_items) ? inquiry.inventory_items : [];
  const addOnLabel = (item) =>
    Number(item.quantity) > 1 ? `${item.name} × ${item.quantity}` : item.name;
  const includesFood = inquiry?.include_food !== false;
  const hasCustomSetupDetails =
    Boolean(inquiry?.is_custom_setup) &&
    (Boolean(inquiry?.custom_setup_notes) ||
      (inquiry?.custom_setup_scope || []).length > 0 ||
      Boolean(inquiry?.budget_range) ||
      (inquiry?.inspiration_images || []).length > 0);

  const isVenueTypeOther = form.venue_type === OTHER_VENUE_TYPE;
  const isPickup = showDelivery && form.delivery_method === "pickup";

  const errorFor = (field) => errors[field] || (touched[field] ? contactFieldError(field, form[field]) : "");
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const handlePhoneChange = (field, raw) => setForm((prev) => ({ ...prev, [field]: sanitizePhone(raw) }));
  const primaryPhoneFilled = !!form.contact_phone?.trim();

  const validate = () => {
    const next = {};
    if (!form.event_type || (form.event_type === OTHER_EVENT_TYPE && !form.event_type_other.trim())) {
      next.event_type = "Select or describe your event type.";
    }
    if (!form.event_date) next.event_date = "Pick your event date.";
    if (!form.start_time) next.start_time = "Pick a start time.";
    if (!isOffer && (!form.guest_count || Number(form.guest_count) <= 0)) {
      next.guest_count = "Enter your guest count.";
    }
    if (!isPickup) {
      if (!form.municipality) next.municipality = "Choose the municipality of the venue.";
      if (!form.barangay) next.barangay = "Choose the barangay of the venue.";
    }
    ["contact_first_name", "contact_last_name", "contact_email", "contact_phone"].forEach((field) => {
      const err = contactFieldError(field, form[field]);
      if (err) next[field] = err;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setTouched((prev) => ({
      ...prev,
      contact_first_name: true,
      contact_last_name: true,
      contact_email: true,
      contact_phone: true,
    }));
    if (!validate()) {
      notify("Please fix the highlighted fields.", "error");
      return;
    }

    const payload = {
      event_type: form.event_type === OTHER_EVENT_TYPE ? form.event_type_other.trim() : form.event_type,
      event_date: form.event_date,
      start_time: form.start_time,
      venue_type: form.venue_type === OTHER_VENUE_TYPE ? form.venue_type_other.trim() : form.venue_type,
      province: form.province,
      municipality: isPickup ? "" : form.municipality,
      barangay: isPickup ? "" : form.barangay,
      street: form.street,
      landmark: form.landmark,
      zip_code: form.zip_code,
      event_theme: form.event_theme,
      event_palette: form.event_palette,
      special_requests: form.special_requests,
      allergies: form.allergies,
      dietary_restrictions: form.dietary_restrictions,
      contact_first_name: form.contact_first_name.trim(),
      contact_last_name: form.contact_last_name.trim(),
      contact_email: form.contact_email.trim(),
      contact_phone: form.contact_phone,
      contact_alt_phone: form.contact_alt_phone,
    };

    if (form.duration_hours !== "") payload.duration_hours = Number(form.duration_hours);
    if (!isOffer) {
      payload.guest_count = Number(form.guest_count);
      payload.service_type = form.service_type;
    }
    if (showDelivery) {
      payload.delivery_method = form.delivery_method;
      payload.delivery_instructions = form.delivery_instructions;
    }

    try {
      setSaving(true);
      await CustomerAPI.updateInquiry(inquiry._id, payload);
      notify("Your request has been updated.", "success");
      onSaved?.();
      onClose?.();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update your request.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!inquiry) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="block w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit request details</DialogTitle>
          <DialogDescription>
            {inquiry.reference ? `${inquiry.reference} — ` : ""}
            Here's everything you submitted. Sections marked "As submitted" can't be changed here — update the editable details below instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* --- Read-only snapshot: everything originally submitted that this
              form cannot change. Shown first so a customer sees the whole
              request before touching anything, distinguished from the
              editable cards below by the dashed border and "As submitted"
              badge. */}
          <div className="space-y-3">
            {(packageName || eventSpace || hasCustomSetupDetails) && (
              <Card className="border-dashed p-4">
                <SectionTitle icon={PackageIcon} right={<LockedBadge />}>
                  Service &amp; package
                </SectionTitle>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {packageName && <SnapshotRow label={isOffer ? "Combo" : "Package"} value={packageName} />}
                  {eventSpace && <SnapshotRow label="Event space / scaffold size" value={eventSpace} />}
                  {inquiry.is_custom_setup && (
                    <SnapshotRow label="Setup concept" value="100% Bespoke Custom Setup" wide />
                  )}
                  {(inquiry.custom_setup_scope || []).length > 0 && (
                    <SnapshotRow label="Setup scope" value={inquiry.custom_setup_scope.join(", ")} wide />
                  )}
                  {inquiry.budget_range && <SnapshotRow label="Target budget" value={inquiry.budget_range} />}
                </dl>
                {inquiry.custom_setup_notes && (
                  <div className="mt-3">
                    <SnapshotRow label="Custom setup notes" value={inquiry.custom_setup_notes} wide />
                  </div>
                )}
                {(inquiry.inspiration_images || []).length > 0 && (
                  <div className="mt-3">
                    <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Inspiration photos
                    </dt>
                    <div className="flex flex-wrap gap-2">
                      {inquiry.inspiration_images.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Inspiration ${idx + 1}`}
                          className="h-14 w-14 rounded-lg border border-border object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {isOffer ? (
              <Card className="border-dashed p-4">
                <SectionTitle icon={Utensils} right={<LockedBadge />}>
                  Combo meal &amp; selections
                </SectionTitle>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SnapshotRow
                    label="Food pricing"
                    value={
                      offerPricePerPax(submittedPackage) > 0
                        ? `${formatCurrency(offerPricePerPax(submittedPackage))} / pax · ${formatCurrency(
                            offerBaseFoodPrice(submittedPackage, inquiry.guest_count),
                          )} for ${inquiry.guest_count} ${inquiry.guest_count === 1 ? "guest" : "guests"}`
                        : "To be confirmed on your quotation"
                    }
                    wide
                  />
                  {offerFoodByCategory(submittedPackage).map((course) => {
                    const chosen = (inquiry.offer_food_snapshot || []).filter(
                      (entry) => entry.menu_category === course.category,
                    );
                    const displayVal =
                      chosen.length > 0
                        ? chosen.map((c) => c.item_name).join(", ")
                        : course.items.join(", ");
                    return <SnapshotRow key={course.category} label={course.category} value={displayVal} wide />;
                  })}
                  {offerInclusions(submittedPackage).length > 0 && (
                    <SnapshotRow label="Inclusions" value={offerInclusions(submittedPackage).join(", ")} wide />
                  )}
                </dl>
              </Card>
            ) : (
              includesFood && (
                <Card className="border-dashed p-4">
                  <SectionTitle icon={Utensils} right={<LockedBadge />}>
                    Food &amp; menu
                  </SectionTitle>
                  <SnapshotRow
                    label="Dishes"
                    value={
                      menuNames.length > 0
                        ? menuNames.join(", ")
                        : "None selected. Our team will suggest options with your quotation."
                    }
                    wide
                  />
                </Card>
              )
            )}

            {(serviceItems.length > 0 || inventoryItems.length > 0) && (
              <Card className="border-dashed p-4">
                <SectionTitle icon={Boxes} right={<LockedBadge />}>
                  Add-ons &amp; equipment
                </SectionTitle>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {serviceItems.length > 0 && (
                    <SnapshotRow label="Add-ons" value={serviceItems.map(addOnLabel).join(", ")} wide />
                  )}
                  {inventoryItems.length > 0 && (
                    <SnapshotRow label="Reserved equipment" value={inventoryItems.map(addOnLabel).join(", ")} wide />
                  )}
                </dl>
              </Card>
            )}

            {Number(inquiry.estimated_total) > 0 && (
              <Card className="border-dashed p-4">
                <SectionTitle icon={DollarSign} right={<LockedBadge />}>
                  Estimate shown at submission
                </SectionTitle>
                <SnapshotRow label="Estimated total" value={formatCurrency(inquiry.estimated_total)} />
              </Card>
            )}
          </div>

          <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Editable details
          </p>

          <Card className="p-4">
            <SectionTitle icon={CalendarDays}>Event</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Event type" required error={errors.event_type}>
                <TSelect
                  value={form.event_type}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      event_type: val,
                      event_type_other: val === OTHER_EVENT_TYPE ? prev.event_type_other : "",
                    }))
                  }
                  options={EVENT_TYPES}
                  placeholder="Select event type"
                  hasError={!!errors.event_type}
                />
              </Field>

              {form.event_type === OTHER_EVENT_TYPE && (
                <Field label="Which kind of event?" required>
                  <TInput
                    placeholder="e.g. Reunion"
                    value={form.event_type_other}
                    onChange={(val) => setForm((prev) => ({ ...prev, event_type_other: val }))}
                  />
                </Field>
              )}

              <Field label="Event date" required error={errors.event_date}>
                <TInput
                  type="date"
                  min={toDateInputValue(new Date())}
                  value={form.event_date}
                  onChange={(val) => setForm((prev) => ({ ...prev, event_date: val }))}
                  hasError={!!errors.event_date}
                />
              </Field>

              <Field label="Start time" required error={errors.start_time}>
                <TInput
                  type="time"
                  value={form.start_time}
                  onChange={(val) => setForm((prev) => ({ ...prev, start_time: val }))}
                  hasError={!!errors.start_time}
                />
              </Field>

              <Field label="Duration (hours)" hint="Optional.">
                <TInput
                  type="number"
                  min="1"
                  value={form.duration_hours}
                  onChange={(val) => setForm((prev) => ({ ...prev, duration_hours: val }))}
                />
              </Field>

              <Field
                label="Guest count"
                required={!isOffer}
                error={errors.guest_count}
                hint={isOffer ? "Fixed by your Special Offer combo." : undefined}
              >
                {isOffer ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <strong className="text-sm">{inquiry.guest_count} guests</strong>
                  </div>
                ) : (
                  <GuestCounter
                    value={Number(form.guest_count) || 1}
                    onChange={(val) => setForm((prev) => ({ ...prev, guest_count: val }))}
                    min={1}
                    max={1000}
                  />
                )}
              </Field>

              {!isOffer && (
                <Field label="Service type" hint="What you'd like included.">
                  <TSelect
                    value={form.service_type}
                    onChange={(val) => setForm((prev) => ({ ...prev, service_type: val }))}
                    options={[SERVICE_TYPES.FOOD_ONLY, SERVICE_TYPES.SETUP_ONLY, SERVICE_TYPES.FULL_SERVICE]}
                  />
                </Field>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle icon={MapPin}>Venue</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Municipality" required={!isPickup} error={errors.municipality}>
                  <TSelect
                    value={form.municipality}
                    onChange={(val) => setForm((prev) => ({ ...prev, municipality: val, barangay: "" }))}
                    options={municipalities}
                    placeholder="Select municipality"
                    hasError={!!errors.municipality}
                  />
                </Field>
                <Field
                  label="Barangay"
                  required={!isPickup}
                  hint={!form.municipality ? "Select a municipality first" : undefined}
                  error={errors.barangay}
                >
                  <TSelect
                    value={form.barangay}
                    onChange={(val) => setForm((prev) => ({ ...prev, barangay: val }))}
                    options={barangays}
                    placeholder="Select barangay"
                    disabled={!form.municipality}
                    hasError={!!errors.barangay}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Street and building" className="sm:col-span-2">
                  <TInput
                    value={form.street}
                    onChange={(val) => setForm((prev) => ({ ...prev, street: val }))}
                    placeholder="e.g. Purok 4, Lopez Building"
                  />
                </Field>
                <Field label="ZIP code" hint="Optional.">
                  <TInput
                    value={form.zip_code}
                    onChange={(val) => setForm((prev) => ({ ...prev, zip_code: val }))}
                    placeholder="e.g. 4200"
                  />
                </Field>
              </div>

              <Field label="Venue type" hint="Optional.">
                <TSelect
                  value={form.venue_type}
                  onChange={(val) => setForm((prev) => ({ ...prev, venue_type: val }))}
                  options={VENUE_TYPES}
                  placeholder="Select venue type"
                />
              </Field>

              {isVenueTypeOther && (
                <Field label="Please specify your venue type">
                  <TInput
                    value={form.venue_type_other}
                    onChange={(val) => setForm((prev) => ({ ...prev, venue_type_other: val }))}
                    placeholder="e.g. Rooftop terrace"
                  />
                </Field>
              )}

              <Field label="Landmark" hint="Optional.">
                <TInput
                  value={form.landmark}
                  onChange={(val) => setForm((prev) => ({ ...prev, landmark: val }))}
                  placeholder="e.g. Across the municipal hall"
                />
              </Field>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle icon={Palette}>Theme and colour palette</SectionTitle>
            <p className="mb-3 text-[13px] text-muted-foreground">
              Two independent, optional choices — change either one without affecting the other.
            </p>

            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h4 className="text-[12px] font-semibold text-foreground">Theme</h4>
              <FieldStatusPill value={form.event_theme} />
            </div>
            <ThemePicker
              value={form.event_theme}
              onChange={(theme) => setForm((prev) => ({ ...prev, event_theme: theme }))}
            />

            <div className="mt-4 mb-1.5 flex items-center justify-between gap-3 border-t border-border pt-4">
              <h4 className="text-[12px] font-semibold text-foreground">Color palette</h4>
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

          <Card className="p-4">
            <SectionTitle icon={Utensils}>Requests and dietary needs</SectionTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Special requests" hint="Optional.">
                <TTextarea
                  value={form.special_requests}
                  onChange={(val) => setForm((prev) => ({ ...prev, special_requests: val }))}
                  rows={3}
                />
              </Field>
              <Field label="Allergies" hint="Optional.">
                <TTextarea
                  value={form.allergies}
                  onChange={(val) => setForm((prev) => ({ ...prev, allergies: val }))}
                  rows={3}
                />
              </Field>
              <Field label="Dietary restrictions" hint="Optional." className="md:col-span-2">
                <TTextarea
                  value={form.dietary_restrictions}
                  onChange={(val) => setForm((prev) => ({ ...prev, dietary_restrictions: val }))}
                  rows={3}
                />
              </Field>
            </div>
          </Card>

          {showDelivery && (
            <Card className="p-4">
              <SectionTitle icon={Truck}>Delivery</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Method">
                  <TSelect
                    value={form.delivery_method}
                    onChange={(val) => setForm((prev) => ({ ...prev, delivery_method: val }))}
                    options={[
                      { value: "delivery", label: "Deliver to my address" },
                      { value: "pickup", label: "I'll pick it up" },
                    ]}
                  />
                </Field>
                {!isPickup && (
                  <Field label="Delivery instructions" hint="Optional.">
                    <TTextarea
                      value={form.delivery_instructions}
                      onChange={(val) => setForm((prev) => ({ ...prev, delivery_instructions: val }))}
                      rows={2}
                    />
                  </Field>
                )}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <SectionTitle icon={User}>Contact</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="First name" required error={errorFor("contact_first_name")}>
                <TInput
                  value={form.contact_first_name}
                  onChange={(val) => setForm((prev) => ({ ...prev, contact_first_name: val }))}
                  onBlur={() => handleBlur("contact_first_name")}
                  hasError={!!errorFor("contact_first_name")}
                />
              </Field>
              <Field label="Last name" required error={errorFor("contact_last_name")}>
                <TInput
                  value={form.contact_last_name}
                  onChange={(val) => setForm((prev) => ({ ...prev, contact_last_name: val }))}
                  onBlur={() => handleBlur("contact_last_name")}
                  hasError={!!errorFor("contact_last_name")}
                />
              </Field>
              <Field label="Email address" required error={errorFor("contact_email")}>
                <TInput
                  type="email"
                  value={form.contact_email}
                  onChange={(val) => setForm((prev) => ({ ...prev, contact_email: val }))}
                  onBlur={() => handleBlur("contact_email")}
                  hasError={!!errorFor("contact_email")}
                />
              </Field>
              <Field label="Mobile number" required error={errorFor("contact_phone")}>
                <TInput
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.contact_phone}
                  onChange={(val) => handlePhoneChange("contact_phone", val)}
                  onBlur={() => handleBlur("contact_phone")}
                  hasError={!!errorFor("contact_phone")}
                />
              </Field>
              <Field
                label="Backup number"
                error={errorFor("contact_alt_phone")}
                hint={!primaryPhoneFilled ? "Enter primary mobile number first" : "Optional."}
              >
                <TInput
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.contact_alt_phone}
                  onChange={(val) => handlePhoneChange("contact_alt_phone", val)}
                  onBlur={() => handleBlur("contact_alt_phone")}
                  disabled={!primaryPhoneFilled}
                  hasError={!!errorFor("contact_alt_phone")}
                />
              </Field>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
