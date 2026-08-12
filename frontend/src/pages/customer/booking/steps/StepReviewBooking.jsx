import { Pencil } from "lucide-react";
import { Card, SH, InfoNote, StepShell } from "../components/BookingSharedUI";
import { focusRing } from "../lib/bookingUI";
import EstimateSummary from "../components/EstimateSummary";
import { cn } from "@/lib/utils";
import { policyHighlights } from "@/lib/policy";
import {
  SERVICE_TYPES,
  SERVICE_LABELS,
  COURSE_RULES,
  selectedInGroup,
  DRINKS_GROUP_ID,
} from "../lib/bookingRules";

/**
 * One fact. Two columns on desktop so a section of four short values reads as a
 * block rather than four full-width rows.
 */
function Row({ label, value, wide = false }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] text-[#1E293B]">
        {value || <span className="text-[#94A3B8]">Not provided</span>}
      </dd>
    </div>
  );
}

/**
 * A flat section inside the single review panel.
 *
 * These were seven separate cards, which put a border and a shadow around every
 * pair of facts and stacked into a very tall page. One panel with dividers
 * keeps each group distinct without the card-on-card weight, and `onEdit` is
 * omitted whenever no step in this customer's path owns the section.
 */
function Section({ title, onEdit, children }) {
  return (
    <section className="px-4 py-3.5 sm:px-5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#1E293B]">
          {title}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-[#4C81E0] transition-colors hover:bg-[#4C81E0]/10",
              focusRing,
            )}
          >
            <Pencil size={13} />
            Edit
            <span className="sr-only"> {title}</span>
          </button>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
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
}) {
  const isFoodOnly = form.service_type === SERVICE_TYPES.FOOD_ONLY;
  const isFullService = form.service_type === SERVICE_TYPES.FULL_SERVICE;
  const isSetupOnly = form.service_type === SERVICE_TYPES.SETUP_ONLY;
  const isPickup = isFoodOnly && form.delivery_method === "pickup";

  const guestCount = parseInt(form.guest_count, 10) || 0;
  const selectedMenu = form.selected_menu || [];
  const drinks = selectedInGroup(selectedMenu, DRINKS_GROUP_ID);

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

  const setupSize =
    form.scaffold_width && form.scaffold_length
      ? `${form.scaffold_width}ft x ${form.scaffold_length}ft`
      : "";

  const theme = String(form.event_theme || "").trim();
  const themeValue =
    theme && form.event_palette?.length
      ? `${theme} (${form.event_palette.join(", ")})`
      : theme;

  const edit = (target) => (target ? () => onEditStep(target) : undefined);

  const checkboxClass = cn(
    "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#CBD5E1] accent-[#4C81E0]",
    focusRing,
  );

  const hasExtras = addOns.length > 0 || Boolean(form.special_requests);
  const hasDietary =
    Boolean(form.allergies) || Boolean(form.dietary_restrictions);
  const showPackageSection = Boolean(packageName || setupSize);

  return (
    <StepShell>
      <SH title="Check Your Details" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start">
        <Card className="divide-y divide-[#E2E8F0] p-0">
          <Section
            title={showPackageSection ? "Service and package" : "Service"}
            onEdit={edit(editTargets.packageSetup || editTargets.service)}
          >
            <Row
              label="Service"
              value={SERVICE_LABELS[form.service_type] || form.service_type}
            />
            <Row
              label="Guests"
              value={guestCount ? `${guestCount} guests` : ""}
            />
            {showPackageSection && <Row label="Package" value={packageName} />}
            {setupSize && <Row label="Setup size" value={setupSize} />}
          </Section>

          <Section title="Date and time" onEdit={edit(editTargets.schedule)}>
            <Row label="Date" value={formatDate(form.event_date)} />
            <Row label="Start time" value={formatTime(form.start_time)} />
          </Section>

          <Section
            title={isFoodOnly ? "Delivery" : "Venue"}
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
                  label={isFoodOnly ? "Deliver to" : "Address"}
                  value={address}
                  wide
                />
                {form.landmark && <Row label="Landmark" value={form.landmark} />}
                {!isFoodOnly && form.venue_type && (
                  <Row label="Venue type" value={form.venue_type} />
                )}
                {isFoodOnly && form.delivery_instructions && (
                  <Row
                    label="Delivery notes"
                    value={form.delivery_instructions}
                    wide
                  />
                )}
              </>
            )}
            {!isFoodOnly && <Row label="Event type" value={eventType} />}
            {!isFoodOnly && themeValue && (
              <Row label="Theme" value={themeValue} />
            )}
          </Section>

          {!isSetupOnly && (
            <Section title="Food" onEdit={edit(editTargets.food)}>
              {isFullService ? (
                <>
                  {COURSE_RULES.map((rule) => (
                    <Row
                      key={rule.key}
                      label={rule.label}
                      value={selectedInGroup(selectedMenu, rule.groupId)
                        .map((item) => item.name)
                        .join(", ")}
                    />
                  ))}
                  <Row
                    label="Drinks"
                    value={
                      drinks.length > 0
                        ? drinks.map((item) => item.name).join(", ")
                        : "None beyond the included water"
                    }
                  />
                  <Row label="Water" value="Included free" />
                </>
              ) : (
                <Row
                  label="Dishes"
                  wide
                  value={
                    selectedMenu.length > 0
                      ? selectedMenu.map((item) => item.name).join(", ")
                      : "None selected. We will suggest options with your quotation."
                  }
                />
              )}
            </Section>
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

        {/* The estimate and everything needed to submit sit together, in the
            order the customer needs them: what it costs, what they are agreeing
            to, then the action in the bar below. Agreements and the policy
            points used to be two cards with the estimate between them, which
            left a long gap and read as unrelated. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-[150px]">
          <EstimateSummary estimate={estimate} variant="review" />

          <Card id="booking-agreements" className="p-4 sm:p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#1E293B]">
              Before you submit
            </h3>

            <ul className="mb-4 space-y-2.5">
              {policyHighlights(estimate.depositPercentage).map((highlight) => (
                <li key={highlight.title} className="flex gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#C5A059]"
                  />
                  <p className="text-[13px] leading-relaxed text-[#64748B]">
                    <span className="font-semibold text-[#1E293B]">
                      {highlight.title}.
                    </span>{" "}
                    {highlight.body}
                  </p>
                </li>
              ))}
            </ul>

            {errors.agreements && (
              <InfoNote tone="danger" className="mb-3">
                {errors.agreements}
              </InfoNote>
            )}

            <div className="space-y-1 border-t border-[#E2E8F0] pt-3">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-[#F8FAFC]">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={agreements.terms}
                  onChange={(event) =>
                    setAgreements({ ...agreements, terms: event.target.checked })
                  }
                />
                <span className="text-[13px] leading-relaxed text-[#64748B]">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onShowTerms();
                    }}
                    className={cn(
                      "rounded font-semibold text-[#4C81E0] hover:underline",
                      focusRing,
                    )}
                  >
                    Terms &amp; Conditions
                  </button>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-[#F8FAFC]">
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
                <span className="text-[13px] leading-relaxed text-[#64748B]">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      onShowPrivacy();
                    }}
                    className={cn(
                      "rounded font-semibold text-[#4C81E0] hover:underline",
                      focusRing,
                    )}
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
