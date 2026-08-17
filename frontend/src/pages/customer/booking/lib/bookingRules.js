// -----------------------------------------------------------------------------
// Canonical terminology
// -----------------------------------------------------------------------------
// One spelling per concept, everywhere. These strings are the ones the backend
// enum accepts (Inquiry.service_type / Booking.service_type) — do not localise
// them for display without mapping through SERVICE_LABELS.
export const SERVICE_TYPES = {
  FOOD_ONLY: "Food Only",
  SETUP_ONLY: "Event Setup Only",
  FULL_SERVICE: "Food and Event Setup",
};

export const SERVICE_LABELS = {
  [SERVICE_TYPES.FOOD_ONLY]: "Food only",
  [SERVICE_TYPES.SETUP_ONLY]: "Event setup only",
  [SERVICE_TYPES.FULL_SERVICE]: "Food and event setup",
};

// Package.package_type maps to Event Setup Only for setup and full-service flows.
export const PACKAGE_TYPE_BY_SERVICE_TYPE = {
  [SERVICE_TYPES.FOOD_ONLY]: "Food Only",
  [SERVICE_TYPES.SETUP_ONLY]: "Event Setup Only",
  [SERVICE_TYPES.FULL_SERVICE]: "Event Setup Only",
};

// -----------------------------------------------------------------------------
// The catering decision
// -----------------------------------------------------------------------------
// A package is only ever the *starting* configuration. Every setup package
// enters the wizard as "Event Setup Only" (see serviceTypeForPackage), and the
// customer is then asked, on the menu step, whether they want food with it.
// Their answer lives in `include_food` — the service type is a label derived
// from it, never the record of the decision itself.
//
// Reading catering off the service type is what made a customer who chose
// "Add Catering / Food Menu" on a setup package arrive at the quotation builder
// as though they had skipped catering, with their dishes hidden behind a
// service type the admin had to change by hand.

/**
 * Whether the customer asked for food on this request.
 *
 * `include_food` is the answer they actually gave, so it decides this on its
 * own — including on a request still labelled "Event Setup Only", which is what
 * a setup package is called before the customer has answered anything.
 *
 * Only with no answer recorded at all does this fall back: to the dishes if any
 * were chosen, and otherwise to the service type, which is how requests made
 * before the question existed have always been read.
 *
 * Accepts a wizard form, an inquiry, or a booking — they all carry the same
 * fields, with the dishes under `selected_menu` (inquiry) or `menu_items`
 * (booking).
 */
export function cateringRequested(record) {
  if (!record) return false;
  if (record.service_type === SERVICE_TYPES.FOOD_ONLY) return true;
  if (typeof record.include_food === "boolean") return record.include_food;
  const dishes = record.selected_menu || record.menu_items || [];
  if (dishes.length > 0) return true;
  return record.service_type !== SERVICE_TYPES.SETUP_ONLY;
}

/**
 * The service type a request should be stored and quoted under.
 *
 * Derived from the catering answer rather than from where the customer entered
 * the flow, so a setup package plus catering is "Food and Event Setup" without
 * anyone having to say so, and skipping catering settles back to setup only.
 * Food Only has no setup to add and is left alone.
 *
 * Distinct from portal/statusMeta.js#resolveServiceType, which only fills in a
 * label for records that never stored one.
 */
export function serviceTypeForRequest(record) {
  if (record?.service_type === SERVICE_TYPES.FOOD_ONLY) return SERVICE_TYPES.FOOD_ONLY;
  return cateringRequested(record) ? SERVICE_TYPES.FULL_SERVICE : SERVICE_TYPES.SETUP_ONLY;
}

// -----------------------------------------------------------------------------
// What each path is, and what it asks for
// -----------------------------------------------------------------------------
// The landing page's service modal and the wizard's own Service Type step both
// render this, so a customer is never told one thing at the entry point and
// shown another inside the flow. `steps` mirrors the real step list built in
// BookingWizard#wizardSteps — if that changes, change this with it.
export const SERVICE_PATHS = {
  [SERVICE_TYPES.FOOD_ONLY]: {
    title: "Food only",
    description:
      "We cook and deliver to your venue, or you collect from us. No tables, styling, or setup.",
    steps: [
      "Your date and time",
      "Guest count, and delivery or pickup",
      "The dishes you want",
      "Any allergies or dietary needs",
      "Contact details",
    ],
    pricing:
      "Priced per guest by the dishes you pick, so your estimate updates as you choose.",
  },
  [SERVICE_TYPES.SETUP_ONLY]: {
    title: "Event setup only",
    description:
      "Scaffolding, tables, styling, and teardown at your venue. No food.",
    steps: [
      "Your date and time, which we check is free",
      "A setup package and the size you need",
      "Event type, venue, and guest count",
      "Any extras or requests",
      "Contact details",
    ],
    pricing: "Setup is priced by the size you choose, not per guest.",
  },
  [SERVICE_TYPES.FULL_SERVICE]: {
    title: "Food and event setup",
    description:
      "One booking covering the event setup and catering, start to finish.",
    steps: [
      "Your date and time, which we check is free",
      "A setup package and scaffold size",
      "Event type, venue, and guest count",
      "Any dishes you'd like, as many as you want (or skip food)",
      "Any allergies, extras, or requests",
      "Contact details",
    ],
    pricing:
      "Setup is priced by the size you choose, plus per-guest catering for your selected dishes.",
  },
};

// Identical for all three paths, because the backend flow is identical: the
// wizard submits an inquiry, an admin returns a quotation, and the date is only
// held once that quote is accepted and the deposit is paid.
export const WHAT_HAPPENS_NEXT = [
  "You send us the details. Nothing is charged yet.",
  "We price it and send you a quotation to review.",
  "Accept it and pay the deposit, and your date is held.",
];

// -----------------------------------------------------------------------------
// Contact details
// -----------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_REGEX = /^(?:63|0)?9\d{9}$/;

const isValidEmail = (value) => EMAIL_REGEX.test(String(value || "").trim());
const isValidPhone = (value) =>
  PHONE_DIGITS_REGEX.test(String(value || "").replace(/\D/g, ""));

const PHONE_HELP =
  "Use an 11-digit Philippine mobile number starting with 09. Example: 0917 123 4567";

/**
 * Field-level contact messages. Each one says what is wrong and what a correct
 * value looks like, rather than "invalid input".
 *
 * The contact step shows these on blur and the wizard's step gate reuses the
 * same function, so a value can never pass in one place and fail in the other.
 */
export function contactFieldError(field, value) {
  const trimmed = String(value || "").trim();

  switch (field) {
    case "contact_first_name":
      return trimmed ? "" : "Enter the first name of the person we should contact.";
    case "contact_last_name":
      return trimmed ? "" : "Enter the last name of the person we should contact.";
    case "contact_email":
      if (!trimmed) return "Enter an email address. Your quotation is sent here.";
      return isValidEmail(trimmed)
        ? ""
        : "That email address is missing an @ or a domain. Example: maria@gmail.com";
    case "contact_phone":
      if (!trimmed) return "Enter a mobile number we can reach you on.";
      return isValidPhone(trimmed) ? "" : PHONE_HELP;
    case "contact_alt_phone":
      if (!trimmed) return "";
      return isValidPhone(trimmed) ? "" : PHONE_HELP;
    default:
      return "";
  }
}

// -----------------------------------------------------------------------------
// Estimate
// -----------------------------------------------------------------------------
// Mirrors backend/src/controllers/booking.controller.js#calculateBookingPrice,
// which is the authoritative rule:
//   Event Setup Only ...... the scaffold option matching
//                           `selected_scaffold_option_id`, else pkg.setup_price.
//   Any other package ..... pkg.price_per_guest × guest_count.
//   Service items ......... price × quantity, on top in every case.
//
// Two deliberate departures, both grounded in real data rather than invented:
//
//   Food Only has no backend rule at all (calculateBookingPrice returns only
//   service_items when there is no package_id). Every MenuItem.price is a
//   per-pax figure — the admin form labels the field "Price per pax" — so
//   summing the chosen dishes and multiplying by guests is an estimate built
//   entirely from real catalogue values.
//
//   A custom booking with no package has no priceable data at all. The
//   BusinessInfo fields that once filled that gap
//   (custom_event_setup_price / custom_food_and_event_price) are written by the
//   admin settings screen but read by nothing on the backend, and on an
//   unconfigured install they are simply absent. Falling back to their schema
//   defaults meant showing ₱800/guest and ₱15,000 as though a real rate had been
//   quoted. Those are now used only when an admin has actually set them; with no
//   value the estimate says so instead of inventing a number.
//
// The result is explicitly an *estimate*: the admin issues the quotation, and
// Quotation.total_cost (with transport, equipment, decoration, taxes and
// discounts) is the amount that is actually owed.

// The backend applies exactly this fallback in payment.controller.js and
// booking.controller.js, so mirroring it here cannot drift.
export const DEFAULT_DEPOSIT_PERCENTAGE = 20;

const QUOTED_LATER =
  "We price this on your quotation once our team has reviewed your details.";

const num = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Builds the one breakdown every price surface renders — the step sidebar and
 * the review page read the same object, so they can never disagree.
 *
 * `blockers` explains why a total is not yet meaningful (no guest count, no
 * dishes picked). Callers show those instead of a misleading ₱0.
 */
export function buildEstimate({
  form,
  packageDetails,
  businessInfo,
  isCustomBooking,
  standardPackagePrice = 0,
}) {
  const guests = num(form?.guest_count);
  const serviceType = form?.service_type;
  const lines = [];
  const blockers = [];

  const depositPercentage =
    businessInfo?.deposit_percentage ?? DEFAULT_DEPOSIT_PERCENTAGE;

  const packageId = form?.package_id || packageDetails?._id || null;
  const selectedOption = (packageDetails?.scaffold_size_options || []).find(
    (option) =>
      String(option?._id) === String(form?.selected_scaffold_option_id),
  );
  const scaffoldPrice =
    num(form?.scaffold_price) || num(selectedOption?.price);
  const packagePrice = num(packageDetails?.setup_price);
  const packageName = packageDetails?.name;

  if (serviceType === SERVICE_TYPES.FOOD_ONLY) {
    const dishes = form?.selected_menu || [];
    if (dishes.length === 0) {
      blockers.push("Choose your dishes to receive a quotation.");
    } else if (guests <= 0) {
      blockers.push("Add your guest count for your catering inquiry.");
    } else {
      lines.push({
        id: "food",
        label: `Catering menu (${dishes.length} ${dishes.length === 1 ? "dish" : "dishes"})`,
        detail: `Price to be set on official quotation for ${guests} guests`,
        amount: 0,
        isQuotedLater: true,
      });
      blockers.push(
        "Your per-guest catering rate will be confirmed by our team on your official quotation.",
      );
    }
  } else {
    // Setup Only or Food and Event Setup (Full Service). The service type here
    // is only where the customer started; their catering answer is what counts.
    const isFoodIncluded = cateringRequested(form);
    const dishes = form?.selected_menu || [];
    const hasFoodChosen = isFoodIncluded && dishes.length > 0;

    let setupAmount = 0;
    const isCustom = Boolean(form?.is_custom_setup);
    let setupLabel = isCustom
      ? (form?.event_theme ? `Custom Event Setup (${form.event_theme})` : "100% Custom Event Setup")
      : (packageName || "Event setup");
    let setupDetail = "Fixed setup price";

    if (!isCustom && scaffoldPrice > 0) {
      setupAmount = scaffoldPrice;
      const width = form?.scaffold_width || selectedOption?.width_ft;
      const length = form?.scaffold_length || selectedOption?.length_ft;
      const size =
        width && length
          ? `${width}ft x ${length}ft setup`
          : "Selected setup size";
      setupDetail = `${size}, not charged per guest`;
    } else if (!isCustom && packageId && packagePrice > 0) {
      setupAmount = packagePrice;
      setupDetail = "Fixed setup price, not charged per guest";
    } else {
      const configured = num(businessInfo?.custom_event_setup_price);
      if (configured > 0) {
        setupAmount = configured;
        setupLabel = packageName || "Custom event setup";
        setupDetail = packageName
          ? "Indicative price, confirmed on your quotation"
          : "Fixed price, not charged per guest";
      } else {
        setupAmount = 0;
        if (!isCustomBooking && standardPackagePrice > 0) {
          setupAmount = num(standardPackagePrice);
        }
      }
    }

    // Setup fee: computed the same way whether or not food is also ordered.
    // Pricing is Setup Fee + Food Fee — the setup is never waived for
    // ordering food, it is simply a separate line from the food estimate.
    if (isCustom) {
      lines.push({
        id: "setup",
        label: setupLabel,
        detail: "Custom design & styling to be priced on official quotation",
        amount: 0,
        isQuotedLater: true,
      });
      blockers.push(
        "Your bespoke event setup proposal will be prepared and priced by our design team on your official quotation.",
      );
    } else if (setupAmount > 0) {
      lines.push({
        id: "setup",
        label: setupLabel,
        detail: setupDetail,
        amount: setupAmount,
      });
    } else if (!isFoodIncluded) {
      blockers.push(
        packageName
          ? `${packageName} does not have a set price yet. ${QUOTED_LATER}`
          : QUOTED_LATER,
      );
    }

    // Food fee: additional to the setup fee above, whenever dishes are chosen.
    if (hasFoodChosen) {
      lines.push({
        id: "food",
        label: `Catering menu (${dishes.length} ${dishes.length === 1 ? "dish" : "dishes"})`,
        detail: `Price to be set on official quotation for ${guests > 0 ? `${guests} guests` : "your guests"}`,
        amount: 0,
        isQuotedLater: true,
      });

      blockers.push(
        "Your per-guest catering rate will be set and confirmed on your official quotation based on your menu selection.",
      );
    }
  }

  const addOns = [
    ...(form?.selected_package_addons || []),
    ...(form?.additional_services || []),
  ];
  addOns.forEach((addOn, index) => {
    const quantity = num(addOn?.quantity) || 1;
    const amount = num(addOn?.price) * quantity;
    if (amount <= 0) return;
    lines.push({
      id: `addon-${addOn?.item_id || addOn?.name || index}`,
      label: addOn?.name || "Add-on",
      detail: quantity > 1 ? `${quantity} x ${num(addOn?.price).toLocaleString("en-PH")}` : null,
      amount,
      isAddOn: true,
    });
  });

  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  return {
    lines,
    blockers,
    total,
    hasTotal: blockers.length === 0 && total > 0,
    depositPercentage,
    depositAmount: (total * depositPercentage) / 100,
    guests,
  };
}
