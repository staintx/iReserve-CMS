import { groupIdFor } from "@/lib/menuCategories";

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

// Package.package_type uses a different spelling for the combined service than
// service_type does, so map explicitly rather than comparing raw strings.
export const PACKAGE_TYPE_BY_SERVICE_TYPE = {
  [SERVICE_TYPES.FOOD_ONLY]: "Food Only",
  [SERVICE_TYPES.SETUP_ONLY]: "Event Setup Only",
  [SERVICE_TYPES.FULL_SERVICE]: "Food + Event Setup",
};

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
      "One booking covering the catering and the full event setup, start to finish.",
    steps: [
      "Your date and time, which we check is free",
      "A package to start from, if you want one",
      "Event type, venue, and guest count",
      "Your courses: 3 mains, 1 vegetable, 2 desserts",
      "Any allergies, extras, or requests",
      "Contact details",
    ],
    pricing:
      "Priced per guest. Starting from a package fixes that rate up front.",
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
// Food and Event Setup course rules
// -----------------------------------------------------------------------------
// Fixed-count courses for the combined service. The counts are the business
// rule; the *effective* requirement is capped by what the admin currently
// offers (see effectiveRequirement) so an under-stocked category can never make
// the flow impossible to complete.
export const COURSE_RULES = [
  {
    key: "main",
    groupId: "mains",
    label: "Main Courses",
    required: 3,
    help: "Pick three main dishes. These are served to every guest.",
  },
  {
    key: "vegetable",
    groupId: "vegetables",
    label: "Vegetables",
    required: 1,
    help: "Pick one vegetable dish.",
  },
  {
    key: "dessert",
    groupId: "desserts",
    label: "Desserts",
    required: 2,
    help: "Pick two desserts.",
  },
];

// Drinks have no count rule anywhere in the system, so none is invented here:
// they are an open, optional choice. Water is included at no charge and is
// never selectable — it is shown in the summary so customers know it is there.
export const DRINKS_GROUP_ID = "drinks";
export const WATER_GROUP_ID = "water";

/** Menu items belonging to one course group, in catalog order. */
export const itemsInGroup = (menuItems, groupId) =>
  (menuItems || []).filter((item) => groupIdFor(item) === groupId);

/** Selected items belonging to one course group. */
export const selectedInGroup = (selectedMenu, groupId) =>
  (selectedMenu || []).filter((item) => groupIdFor(item) === groupId);

/**
 * How many items a customer must actually pick for a course.
 *
 * The rule says three mains; if the admin only has two main dishes available
 * today, three is unreachable. Capping at what is offered keeps the flow
 * completable and matches the wording of the rule ("from the items currently
 * offered"). The backend applies the identical cap.
 */
export const effectiveRequirement = (rule, availableCount) =>
  Math.min(rule.required, availableCount);

/**
 * Per-course progress for the combined service.
 * Returns one entry per rule, whether or not the category has any items.
 */
export function courseProgress(selectedMenu, menuItems) {
  return COURSE_RULES.map((rule) => {
    const available = itemsInGroup(menuItems, rule.groupId);
    const selected = selectedInGroup(selectedMenu, rule.groupId);
    const required = effectiveRequirement(rule, available.length);
    return {
      ...rule,
      available,
      selected,
      selectedCount: selected.length,
      required,
      unavailable: available.length === 0,
      satisfied: selected.length === required,
      remaining: required - selected.length,
    };
  });
}

/**
 * Validates the combined-service course selection. Messages name the course and
 * the exact number still needed rather than saying the selection is invalid.
 */
export function validateCourseSelection(selectedMenu, menuItems) {
  const issues = courseProgress(selectedMenu, menuItems)
    .filter((course) => !course.unavailable && !course.satisfied)
    .map((course) => {
      const short = course.required - course.selectedCount;
      // Phrased "from <Course>" so the sentence reads correctly whether one or
      // several are still missing, without needing singular/plural forms.
      return short > 0
        ? `Choose ${short} more from ${course.label} (${course.selectedCount} of ${course.required} selected).`
        : `Remove ${Math.abs(short)} from ${course.label}. You can pick ${course.required}.`;
    });

  return { valid: issues.length === 0, issues };
}

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

  if (isCustomBooking) {
    if (serviceType === SERVICE_TYPES.SETUP_ONLY) {
      // The chosen scaffold footprint is what the Package step tells the
      // customer sets the setup price, so it takes precedence. Falling straight
      // through to the package or business-wide price ignored that choice and
      // showed a total that contradicted the size card they had just selected.
      // Prefer the price stored on the form, but fall back to looking the
      // selected option up on the package. That keeps older drafts (saved
      // before the price was recorded) costing the same as a fresh selection.
      const selectedOption = (packageDetails?.scaffold_size_options || []).find(
        (option) =>
          String(option?._id) === String(form?.selected_scaffold_option_id),
      );
      const scaffoldPrice =
        num(form?.scaffold_price) || num(selectedOption?.price);
      const packagePrice = num(packageDetails?.setup_price);
      const packageName = packageDetails?.name;

      let label;
      let detail;
      let amount;

      if (scaffoldPrice > 0) {
        amount = scaffoldPrice;
        label = packageName || "Event setup";
        const width = form?.scaffold_width || selectedOption?.width_ft;
        const length = form?.scaffold_length || selectedOption?.length_ft;
        const size =
          width && length
            ? `${width}ft x ${length}ft setup`
            : "Selected setup size";
        detail = `${size}, not charged per guest`;
      } else if (packageId && packagePrice > 0) {
        amount = packagePrice;
        label = packageName || "Event setup package";
        detail = "Fixed price, not charged per guest";
      } else {
        // Nothing priceable: no scaffold option and no package price. Only the
        // admin's configured custom rate counts, and only if it really exists.
        const configured = num(businessInfo?.custom_event_setup_price);
        if (configured > 0) {
          amount = configured;
          label = packageName || "Custom event setup";
          detail = packageName
            ? "Indicative price, confirmed on your quotation"
            : "Fixed price, not charged per guest";
        } else {
          amount = 0;
          blockers.push(
            packageName
              ? `${packageName} does not have a set price yet. ${QUOTED_LATER}`
              : QUOTED_LATER,
          );
        }
      }

      if (amount > 0) lines.push({ id: "setup", label, detail, amount });
    } else if (serviceType === SERVICE_TYPES.FULL_SERVICE) {
      const packageRate = num(packageDetails?.price_per_guest);
      const usesPackage = Boolean(packageId) && packageRate > 0;
      // Only the package rate, or a rate the admin has actually configured, is
      // real. With neither, this booking is genuinely priced on the quotation.
      const rate = usesPackage
        ? packageRate
        : num(businessInfo?.custom_food_and_event_price);

      if (rate <= 0) {
        blockers.push(QUOTED_LATER);
      } else if (guests <= 0) {
        blockers.push("Add your guest count to see a price.");
      } else {
        lines.push({
          id: "full-service",
          label: usesPackage
            ? packageDetails?.name || "Selected package"
            : "Food and event setup",
          detail: `${guests} guests x ${rate.toLocaleString("en-PH")} per guest`,
          amount: rate * guests,
        });
      }
    } else if (serviceType === SERVICE_TYPES.FOOD_ONLY) {
      const dishes = form?.selected_menu || [];
      const perGuest = dishes.reduce((sum, item) => sum + num(item?.price), 0);
      if (dishes.length === 0) {
        blockers.push("Choose your dishes to see a price.");
      } else if (guests <= 0) {
        blockers.push("Add your guest count to see a price.");
      } else if (perGuest <= 0) {
        // Every chosen dish has no price on it, so multiplying gives ₱0 rather
        // than a real total.
        blockers.push(`Your dishes are not individually priced. ${QUOTED_LATER}`);
      } else {
        lines.push({
          id: "food",
          label: `${dishes.length} ${dishes.length === 1 ? "dish" : "dishes"}`,
          detail: `${guests} guests x ${perGuest.toLocaleString("en-PH")} per guest`,
          amount: perGuest * guests,
        });
      }
    }
  } else {
    // Started from a package page. The price passed through router state can be
    // stale or missing, so the package document wins when it has a figure.
    const isSetupPackage = packageDetails?.package_type === "Event Setup Only";
    const base = isSetupPackage
      ? num(packageDetails?.setup_price) || num(standardPackagePrice)
      : num(packageDetails?.price_per_guest) || num(standardPackagePrice);

    if (base <= 0) {
      blockers.push(QUOTED_LATER);
    } else if (!isSetupPackage && guests <= 0) {
      blockers.push("Add your guest count to see a price.");
    } else {
      lines.push({
        id: "package",
        label: packageDetails?.name || "Selected package",
        detail: isSetupPackage
          ? "Fixed package price"
          : `${guests} guests x ${base.toLocaleString("en-PH")} per guest`,
        amount: isSetupPackage ? base : base * guests,
      });
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
  };
}
