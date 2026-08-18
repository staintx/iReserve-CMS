/**
 * Special Offers, on the client.
 *
 * Line-for-line mirror of `backend/src/utils/specialOffers.js` — the wizard
 * derives these while the customer types, and the server derives them again on
 * the way into the database. Change one, change the other.
 *
 * A Special Offer is a Package with `offer_type: "special"`. It is not a second
 * package system: same collection, same admin form, same booking flow, same
 * quotation. What differs is only:
 *
 *   1. Its price is per person and fixed — `price_per_guest × guest_count` is
 *      the base FOOD price, and nothing else.
 *   2. Its guest count is the real number the price is built from, so the
 *      wording is "Guest Count" (never "Estimated Guest Count") and any
 *      configured `max_guests` is a limit, not guidance.
 *   3. Its food comes from admin-configured rules against the existing menu
 *      catalogue — never a dish list written into this file.
 *
 * Setup stays a separate charge from the food. An offer may mark one scaffold
 * size as carrying no setup fee (`free_setup`), which is a configured property
 * of that size — the setup fee is never waived for ordering food.
 */

export const OFFER_TYPES = { REGULAR: "regular", SPECIAL: "special" };

export const BOOKING_TYPES = {
  REGULAR: "regular",
  SPECIAL: "special",
  CUSTOM: "custom",
};

export const BOOKING_TYPE_LABELS = {
  [BOOKING_TYPES.REGULAR]: "Regular Package",
  [BOOKING_TYPES.SPECIAL]: "Special Offer",
  [BOOKING_TYPES.CUSTOM]: "Custom",
};

const positive = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const money = (value) => Math.round(positive(value) * 100) / 100;

export const isSpecialOffer = (pkg) => pkg?.offer_type === OFFER_TYPES.SPECIAL;

/** The booking type of a request, read from its package — never from a name. */
export function bookingTypeForPackage(pkg) {
  if (!pkg) return BOOKING_TYPES.CUSTOM;
  return isSpecialOffer(pkg) ? BOOKING_TYPES.SPECIAL : BOOKING_TYPES.REGULAR;
}

/**
 * How a request identifies itself in the admin lists: the package or offer it
 * came from, and which of the three kinds it is.
 *
 * `booking_type` is what the server stored. Records written before the field
 * existed fall back to the package relation, which is still the relation and
 * not the name.
 */
export function bookingIdentity(record) {
  const pkg =
    record?.package_id && typeof record.package_id === "object"
      ? record.package_id
      : null;

  const type =
    record?.booking_type ||
    (record?.package_id ? bookingTypeForPackage(pkg) : BOOKING_TYPES.CUSTOM);

  const name =
    type === BOOKING_TYPES.CUSTOM
      ? "Custom Booking"
      : pkg?.name || record?.package_name_snapshot || "Package";

  return { type, name, label: BOOKING_TYPE_LABELS[type] || "Custom" };
}

/** The hard guest cap, when the offer configures one. */
export function offerGuestCap(pkg) {
  return positive(pkg?.max_guests) || positive(pkg?.guest_max) || null;
}

/** The offer's price per person. */
export const offerPricePerPerson = (pkg) =>
  isSpecialOffer(pkg) ? positive(pkg?.price_per_guest) : 0;

/**
 * `guest_count × price per person` — the offer's base price, and the only
 * figure an offer itself decides. Set-up, equipment, crew, add-ons and any
 * other charge are settled on the quotation.
 */
export function offerBaseFoodPrice(pkg, guestCount) {
  if (!isSpecialOffer(pkg)) return 0;
  return money(offerPricePerPerson(pkg) * Math.floor(positive(guestCount)));
}

export function scaffoldOptionOf(pkg, optionId) {
  const options = Array.isArray(pkg?.scaffold_size_options)
    ? pkg.scaffold_size_options
    : [];
  if (!options.length || !optionId) return null;
  return options.find((option) => String(option?._id) === String(optionId)) || null;
}

/**
 * Whether this request's set-up is covered by the offer, and what to call it.
 *
 * There is deliberately no amount. A scaffold option is a supported size and
 * its capacity — it carries no price, because what an uncovered size costs is
 * decided on the quotation. Free set-up belongs to a *size*, never to ordering
 * food: the set-up fee is not waived for catering.
 */
export function offerSetupCharge(pkg, optionId) {
  const option = scaffoldOptionOf(pkg, optionId);
  return {
    isFree: Boolean(option?.free_setup),
    label: option?.label || "Setup",
    hasSize: Boolean(option),
  };
}

/** The sizes this offer covers the set-up for at no charge. */
export const freeSetupOptions = (pkg) =>
  (Array.isArray(pkg?.scaffold_size_options) ? pkg.scaffold_size_options : []).filter(
    (option) => option?.free_setup,
  );

/** Rules as stored, filtered to the usable ones. */
export const offerMenuRules = (pkg) =>
  (Array.isArray(pkg?.offer_menu_rules) ? pkg.offer_menu_rules : []).filter(
    (rule) => rule && String(rule.label || "").trim(),
  );

/** The rules the customer actually picks from, in configured order. */
export const selectableOfferRules = (pkg) =>
  offerMenuRules(pkg).filter(
    (rule) =>
      rule.selectable !== false &&
      Math.floor(Number(rule.required_count) || 0) > 0 &&
      (Array.isArray(rule.menu_items) ? rule.menu_items.length : 0) > 0,
  );

const idOf = (value) => String(value?._id || value || "");

/**
 * Progress against one rule: which of its allowed items are chosen, and how
 * many the rule still wants. The wizard renders this and the step gate reads
 * it, so a selection can never look complete in one place and not the other.
 */
export function offerRuleProgress(rule, selectedIds) {
  const chosen = new Set((selectedIds || []).map(idOf).filter(Boolean));
  const allowed = (Array.isArray(rule?.menu_items) ? rule.menu_items : []).map(idOf);
  const picked = allowed.filter((id) => chosen.has(id));
  const required = Math.max(0, Math.floor(Number(rule?.required_count) || 0));

  return {
    allowed,
    picked,
    required,
    complete: picked.length === required,
    remaining: Math.max(0, required - picked.length),
  };
}

/**
 * Every unmet food rule, phrased for the customer. Empty when the selection
 * satisfies the offer.
 */
export function validateOfferSelection(pkg, selectedIds) {
  if (!isSpecialOffer(pkg)) return [];

  return selectableOfferRules(pkg).reduce((problems, rule) => {
    const { picked, required } = offerRuleProgress(rule, selectedIds);
    if (picked.length !== required) {
      problems.push(
        `${rule.label}: choose exactly ${required} ${
          required === 1 ? "item" : "items"
        } (you chose ${picked.length}).`,
      );
    }
    return problems;
  }, []);
}

/**
 * What to call the guest count field.
 *
 * A Special Offer's price is built directly from this number, so it is the
 * Guest Count. Everywhere else it is an opening figure that can still move at
 * quotation, ocular or revision, so it is the Estimated Guest Count.
 */
export const guestCountLabel = (pkg) =>
  isSpecialOffer(pkg) ? "Guest count" : "Estimated guest count";

export const guestCountHelp = (pkg) =>
  isSpecialOffer(pkg)
    ? "Your price is this number times the per-person rate."
    : "An estimate is fine — we confirm the final count on your quotation.";
