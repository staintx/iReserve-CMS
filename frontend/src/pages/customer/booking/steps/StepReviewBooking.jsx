import { Pencil } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Card, SH, InfoNote, StepShell } from "../components/BookingSharedUI";
import { focusRing } from "../lib/bookingUI";
import EstimateSummary from "../components/EstimateSummary";
import { cn } from "@/lib/utils";
import { policyHighlights } from "@/lib/policy";
import {
  guestCountLabel,
  offerFoodByCategory,
  offerInclusions,
  offerPricePerPax,
  offerBaseFoodPrice,
} from "@/lib/specialOffers";
import {
  SERVICE_TYPES,
  SERVICE_LABELS,
  cateringRequested,
  resolveVenueType,
  serviceTypeForRequest,
} from "../lib/bookingRules";

/**
 * One fact. Two columns on desktop so a section of four short values reads as a
 * block rather than four full-width rows.
 */
function Row({ label, value, wide = false }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-semibold text-slate-800 leading-snug">
        {value || <span className="text-slate-400 font-normal">Not provided</span>}
      </dd>
    </div>
  );
}

/**
 * A flat section inside the single review panel.
 */
function Section({ title, onEdit, children }) {
  return (
    <section className="px-3.5 py-2.5 sm:px-4 sm:py-3">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          {title}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[#4C81E0] transition-colors hover:bg-blue-50 cursor-pointer",
              focusRing,
            )}
          >
            <Pencil size={11} />
            Edit
            <span className="sr-only"> {title}</span>
          </button>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {children}
      </dl>
    </section>
  );
}

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";
  const [rawHours, minutes] = String(value).split(":");
  const hours = parseInt(rawHours, 10);
  if (Number.isNaN(hours)) return value;
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
};

export default function StepReviewBooking({
  form,
  packageName,
  pickupAddress,
  estimate,
  agreements,
  setAgreements,
  onShowTerms,
  onShowPrivacy,
  onEditStep,
  editTargets = {},
  errors = {},
  setTurnstileToken,
  turnstileRef = null,
  offer = null,
  deliveryMethod = "setup",
}) {
  // What is actually being booked, which on a setup package is only settled by
  // the customer's answer on the menu step. Reviewing the raw service type
  // showed "Event setup only" — and hid the Food and Catering section outright
  // — to a customer who had just picked their dishes.
  const serviceType = serviceTypeForRequest(form);
  const includesFood = cateringRequested(form);

  /**
   * Whether this booking has a venue to describe or an address to deliver to.
   *
   * A different question from what is being sold, and read from how the order
   * is fulfilled — the same split the server draws in utils/venue.js. It used
   * to be read off the service type, which was fine while "Food Only" only ever
   * meant a delivery; a combo pack sells food *and* is served at the venue, and
   * keying the layout off the service type would have hidden the event type and
   * venue the customer had just entered two steps earlier.
   */
  const atVenue = deliveryMethod === "setup";
  const isPickup = deliveryMethod === "pickup";

  const guestCount = parseInt(form.guest_count, 10) || 0;
  const selectedMenu = form.selected_menu || [];

  const address =
    [form.street, form.barangay, form.municipality, form.province]
      .filter(Boolean)
      .join(", ") || "";

  const addOns = [
    ...(form.selected_package_addons || []),
    ...(form.additional_services || []),
  ];

  const eventType =
    form.event_type === "Other" ? form.event_type_other : form.event_type;

  // The one Event Space / Scaffold Size fact, taken straight off the estimate
  // the customer has been reading since the package step — the package's own
  // size, not a choice the customer made — so the last screen before
  // submission cannot show a different size than the one shown earlier, and
  // the size is never something they have to infer from the package name.
  const eventSpace = estimate?.eventSpace || "";

  const venueType = resolveVenueType(form);

  // Independent fields, shown as independent facts — a customer who picked a
  // palette without a theme, or vice versa, should still see their own answer
  // confirmed rather than the two run together.
  const theme = String(form.event_theme || "").trim();
  const paletteValue =
    Array.isArray(form.event_palette) && form.event_palette.length > 0
      ? form.event_palette.join(", ")
      : "";

  const edit = (target) => (target ? () => onEditStep(target) : undefined);

  const checkboxClass = cn(
    "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#CBD5E1] accent-[#4C81E0]",
    focusRing,
  );

  const hasExtras = addOns.length > 0 || Boolean(form.special_requests);
  const hasDietary =
    Boolean(form.allergies) || Boolean(form.dietary_restrictions);
  const showPackageSection = Boolean(packageName || eventSpace);

  const isFoodOnly =
    serviceType === SERVICE_TYPES.FOOD_ONLY ||
    form.service_type === SERVICE_TYPES.FOOD_ONLY;

  return (
    <StepShell width="wide">
      <SH
        title="Check Your Details"
        sub="Review your event inquiry details before submitting. You can click Edit on any section to make changes."
      />

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
          {/* Section 1: Service & Package / Concept */}
          {isFoodOnly ? (
            <Section title="Service Type" onEdit={edit(editTargets.service)}>
              <Row
                label="Service"
                value={SERVICE_LABELS[serviceType] || serviceType}
              />
            </Section>
          ) : (
            <Section
              title={
                form.is_custom_setup
                  ? "Custom Event Setup & Styling"
                  : showPackageSection
                    ? "Service and package"
                    : "Service"
              }
              onEdit={edit(editTargets.packageSetup || editTargets.service)}
            >
              <Row
                label="Service"
                value={SERVICE_LABELS[serviceType] || serviceType}
              />
              <Row
                label={guestCountLabel(offer)}
                value={guestCount ? `${guestCount} guests` : ""}
              />
              {form.is_custom_setup ? (
                <>
                  <Row
                    label="Setup Concept"
                    value="100% Bespoke Custom Setup (Priced on quotation)"
                    wide
                  />
                  {form.event_theme && (
                    <Row label="Theme & Motif" value={form.event_theme} wide />
                  )}
                  {Array.isArray(form.event_palette) &&
                    form.event_palette.length > 0 && (
                      <Row
                        label="Color Palette"
                        value={form.event_palette.join(", ")}
                        wide
                      />
                    )}
                  {Array.isArray(form.custom_setup_scope) &&
                    form.custom_setup_scope.length > 0 && (
                      <Row
                        label="Setup Scope"
                        value={form.custom_setup_scope.join(", ")}
                        wide
                      />
                    )}
                  {form.budget_range && (
                    <Row label="Target Budget" value={form.budget_range} />
                  )}
                  {Array.isArray(form.inspiration_images) &&
                    form.inspiration_images.length > 0 && (
                      <div className="col-span-full pt-1">
                        <dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Inspiration Pegs ({form.inspiration_images.length})
                        </dt>
                        <dd className="flex flex-wrap gap-1.5">
                          {form.inspiration_images.map((imgUrl, i) => (
                            <img
                              key={i}
                              src={imgUrl}
                              alt={`Inspiration ${i + 1}`}
                              className="h-12 w-12 rounded-md border border-slate-200 object-cover shadow-2xs"
                            />
                          ))}
                        </dd>
                      </div>
                    )}
                </>
              ) : (
                <>
                  {showPackageSection && (
                    <Row label="Setup Package" value={packageName} />
                  )}
                  {eventSpace && (
                    <Row label="Event space / scaffold size" value={eventSpace} />
                  )}
                </>
              )}
            </Section>
          )}

          {/* Section 2: Date & Time */}
          <Section title="Date and time" onEdit={edit(editTargets.schedule)}>
            <Row label="Date" value={formatDate(form.event_date)} />
            <Row label="Start time" value={formatTime(form.start_time)} />
          </Section>

          {/* Section 3: Delivery or Venue Details */}
          {isFoodOnly ? (
            <Section
              title="Guests & Delivery"
              onEdit={edit(editTargets.details)}
            >
              <Row
                label="Estimated guest count"
                value={guestCount ? `${guestCount} guests` : ""}
              />
              {isPickup ? (
                <Row
                  label="Collection method"
                  value={
                    pickupAddress
                      ? `Pick up from ${pickupAddress}`
                      : "Pick up from our kitchen, address to follow"
                  }
                  wide
                />
              ) : (
                <>
                  <Row label="Deliver to" value={address} wide />
                  {form.landmark && <Row label="Landmark" value={form.landmark} />}
                  {form.delivery_instructions && (
                    <Row
                      label="Delivery notes"
                      value={form.delivery_instructions}
                      wide
                    />
                  )}
                </>
              )}
            </Section>
          ) : (
            <Section
              title={atVenue ? "Venue & Event Details" : "Delivery"}
              onEdit={edit(editTargets.details)}
            >
              {isPickup ? (
                <Row
                  label="Collect from"
                  value={pickupAddress || "Our kitchen, address to follow"}
                  wide
                />
              ) : (
                <>
                  <Row
                    label={atVenue ? "Address" : "Deliver to"}
                    value={address}
                    wide
                  />
                  {form.landmark && (
                    <Row label="Landmark" value={form.landmark} />
                  )}
                  {atVenue && venueType && (
                    <Row label="Venue type" value={venueType} />
                  )}
                  {!atVenue && form.delivery_instructions && (
                    <Row
                      label="Delivery notes"
                      value={form.delivery_instructions}
                      wide
                    />
                  )}
                </>
              )}
              {atVenue && <Row label="Event type" value={eventType} />}
              {atVenue && !form.is_custom_setup && theme && (
                <Row label="Theme" value={theme} />
              )}
              {atVenue && !form.is_custom_setup && paletteValue && (
                <Row label="Color palette" value={paletteValue} />
              )}
            </Section>
          )}

          {/* Combo Meal / Offer */}
          {offer ? (
            <Section title="Combo Meal & Selections" onEdit={edit(editTargets.packageSetup)}>
              <Row label="Combo" value={offer.name} />
              <Row
                label="Service option"
                value={
                  form.service_type === SERVICE_TYPES.FULL_SERVICE
                    ? "With Event Setup"
                    : form.delivery_method === "pickup"
                      ? "Food only (Pick Up)"
                      : "Food only (Delivery)"
                }
              />
              <Row
                label="Food pricing"
                value={
                  offerPricePerPax(offer) > 0
                    ? `₱${offerPricePerPax(offer).toLocaleString("en-PH")} / pax · ₱${offerBaseFoodPrice(
                        offer,
                        guestCount,
                      ).toLocaleString("en-PH")} for ${guestCount} ${guestCount === 1 ? "guest" : "guests"}`
                    : "To be confirmed on your quotation"
                }
                wide
              />
              {offerFoodByCategory(offer).map((course) => {
                const chosen = (form.offer_food_snapshot || []).filter(
                  (entry) => entry.menu_category === course.category,
                );
                const displayVal =
                  chosen.length > 0
                    ? chosen.map((c) => c.item_name).join(", ")
                    : course.items.length === 1
                      ? course.items[0]
                      : course.items.join(", ");

                return (
                  <Row
                    key={course.category}
                    label={course.category}
                    value={displayVal}
                    wide
                  />
                );
              })}
              {offerInclusions(offer).length > 0 && (
                <Row
                  label="Inclusions"
                  value={offerInclusions(offer).join(", ")}
                  wide
                />
              )}
            </Section>
          ) : (
            (includesFood || form.service_type !== SERVICE_TYPES.SETUP_ONLY) && (
              <Section title="Food & Catering" onEdit={edit(editTargets.food)}>
                {!includesFood ? (
                  <Row
                    label="Catering"
                    wide
                    value="No catering selected (Event Setup Only)"
                  />
                ) : (
                  <>
                    <Row
                      label="Dishes"
                      wide
                      value={
                        selectedMenu.length > 0
                          ? selectedMenu.map((item) => item.name).join(", ")
                          : "None selected. We will suggest options with your quotation."
                      }
                    />
                    <Row
                      label="Pricing"
                      wide
                      value="Per-guest price will be set by caterer on your official quotation"
                    />
                  </>
                )}
              </Section>
            )
          )}

          {hasDietary && (
            <Section
              title="Allergies and dietary needs"
              onEdit={edit(editTargets.dietary)}
            >
              {form.allergies && (
                <Row label="Allergies" value={form.allergies} />
              )}
              {form.dietary_restrictions && (
                <Row label="Restrictions" value={form.dietary_restrictions} />
              )}
            </Section>
          )}

          {hasExtras && (
            <Section
              title="Extras and requests"
              onEdit={edit(editTargets.extras)}
            >
              {addOns.length > 0 && (
                <Row
                  label="Add-ons"
                  value={addOns
                    .map((addOn) =>
                      Number(addOn.quantity) > 1
                        ? `${addOn.name} x ${addOn.quantity}`
                        : addOn.name,
                    )
                    .join(", ")}
                />
              )}
              {form.special_requests && (
                <Row label="Notes" value={form.special_requests} wide />
              )}
            </Section>
          )}

          <Section title="Contact" onEdit={edit(editTargets.contact)}>
            <Row
              label="Name"
              value={`${form.contact_first_name || ""} ${form.contact_last_name || ""}`.trim()}
            />
            <Row label="Mobile" value={form.contact_phone} />
            <Row label="Email" value={form.contact_email} wide />
            {form.contact_alt_phone && (
              <Row label="Backup number" value={form.contact_alt_phone} />
            )}
          </Section>
        </Card>

        {/* Sidebar: Cost + Before You Submit */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-[120px]">
          <EstimateSummary estimate={estimate} variant="review" />

          <Card id="booking-agreements" className="p-3.5 sm:p-4">
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-800">
              Before you submit
            </h3>

            <ul className="mb-3 space-y-1.5 text-xs text-slate-600">
              {policyHighlights(estimate.depositPercentage).map((highlight) => (
                <li key={highlight.title} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4C81E0]"
                  />
                  <p className="leading-snug">
                    <strong className="font-semibold text-slate-800">
                      {highlight.title}:
                    </strong>{" "}
                    {highlight.body}
                  </p>
                </li>
              ))}
            </ul>

            {errors.agreements && (
              <InfoNote tone="danger" className="mb-2.5">
                {errors.agreements}
              </InfoNote>
            )}

            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
              <label className="flex cursor-pointer items-start gap-2 rounded-md p-1 transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={agreements.terms}
                  onChange={(event) =>
                    setAgreements({ ...agreements, terms: event.target.checked })
                  }
                />
                <span className="text-xs text-slate-600 leading-snug">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onShowTerms();
                    }}
                    className={cn(
                      "font-semibold text-[#4C81E0] hover:underline cursor-pointer",
                      focusRing,
                    )}
                  >
                    Terms &amp; Conditions
                  </button>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-md p-1 transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={agreements.privacy}
                  onChange={(event) =>
                    setAgreements({
                      ...agreements,
                      privacy: event.target.checked,
                    })
                  }
                />
                <span className="text-xs text-slate-600 leading-snug">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onShowPrivacy();
                    }}
                    className={cn(
                      "font-semibold text-[#4C81E0] hover:underline cursor-pointer",
                      focusRing,
                    )}
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>

            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <div className="mt-3 flex justify-center border-t border-slate-100 pt-3">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setTurnstileToken && setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken && setTurnstileToken("")}
                  onError={() => setTurnstileToken && setTurnstileToken("")}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
