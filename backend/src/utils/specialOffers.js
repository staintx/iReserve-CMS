/**
 * Special Offers, in one place.
 *
 * A Special Offer is a Package with `offer_type: "special"`. It is not a second
 * package system: it reuses the same collection, the same admin form, the same
 * booking flow and the same quotation, and differs only in how its base food
 * price is worked out and in what the customer is asked for.
 *
 * The three rules that make an offer an offer:
 *
 *   1. Price is per person and fixed — `price_per_guest × guest_count` is the
 *      base FOOD price, nothing else.
 *   2. The guest count is the real number, not an estimate, so `max_guests`
 *      (when configured) is enforced rather than advisory.
 *   3. The food is chosen from admin-configured rules against the existing menu
 *      catalogue — never a hardcoded dish list.
 *
 * Setup is always a separate charge from the food. An offer may declare that a
 * particular scaffold size carries no setup fee (`free_setup` on the option),
 * which is a configured property of that size, not a rule about catering. The
 * setup fee is never waived for ordering food.
 *
 * Mirrors `frontend/src/lib/specialOffers.js` — the two must agree, because the
 * wizard derives these before submitting and this derives them again on the way
 * into the database.
 */

const OFFER_TYPES = { REGULAR: "regular", SPECIAL: "special" };

/** What kind of request an inquiry/booking is, for admin-side identification. */
const BOOKING_TYPES = {
  REGULAR: "regular",
  SPECIAL: "special",
  CUSTOM: "custom",
};

const BOOKING_TYPE_LABELS = {
  [BOOKING_TYPES.REGULAR]: "Regular Package",
  [BOOKING_TYPES.SPECIAL]: "Special Offer",
  [BOOKING_TYPES.CUSTOM]: "Custom",
};

const positive = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const money = (value) => Math.round(positive(value) * 100) / 100;

const isSpecialOffer = (pkg) => pkg?.offer_type === OFFER_TYPES.SPECIAL;

/**
 * The booking type of a request, read from the package relation rather than
 * from its name. A request with no package is a custom booking.
 */
function bookingTypeForPackage(pkg) {
  if (!pkg) return BOOKING_TYPES.CUSTOM;
  return isSpecialOffer(pkg) ? BOOKING_TYPES.SPECIAL : BOOKING_TYPES.REGULAR;
}

/**
 * The hard guest cap, when one is configured. `max_guests` is the offer's own
 * field; `guest_max` is read as a fallback so an offer configured through the
 * shared capacity field still enforces something real.
 */
function offerGuestCap(pkg) {
  return positive(pkg?.max_guests) || positive(pkg?.guest_max) || null;
}

/**
 * `guest_count × price per person` — the offer's base price, and the only
 * figure an offer itself decides. Everything else (setup, equipment, crew,
 * add-ons, other charges) is settled on the quotation.
 */
function offerBaseFoodPrice(pkg, guestCount) {
  if (!isSpecialOffer(pkg)) return 0;
  return money(positive(pkg?.price_per_guest) * Math.floor(positive(guestCount)));
}

/** The scaffold option a request selected, if it names one. */
function scaffoldOptionOf(pkg, optionId) {
  const options = Array.isArray(pkg?.scaffold_size_options)
    ? pkg.scaffold_size_options
    : [];
  if (!options.length) return null;
  if (!optionId) return null;
  return (
    options.find((option) => String(option?._id) === String(optionId)) || null
  );
}

/**
 * Whether this request's setup is covered by the offer, and what to call it.
 *
 * An offer configures which sizes it supports and, optionally, which one it
 * throws the setup in for — "20x40 = FREE SET-UP" is that flag on that size,
 * which is how the rule lives as data rather than as dimensions in code.
 *
 * There is deliberately no amount here. A scaffold option carries no price: any
 * charge for a size the offer does not cover is decided on the quotation, which
 * is the pricing authority. Returning a number would mean inventing one.
 *
 * Free setup belongs to a *size*, never to ordering food — the setup fee is not
 * waived for catering, only for the size the offer says it covers.
 */
function offerSetupCharge(pkg, optionId) {
  const option = scaffoldOptionOf(pkg, optionId);
  return {
    isFree: Boolean(option?.free_setup),
    label: option?.label || "Setup",
    hasSize: Boolean(option),
  };
}

/** Rules as stored, filtered to the usable ones. */
function offerMenuRules(pkg) {
  return (Array.isArray(pkg?.offer_menu_rules) ? pkg.offer_menu_rules : []).filter(
    (rule) => rule && String(rule.label || "").trim(),
  );
}

const idOf = (value) => String(value?._id || value || "");

/**
 * Whether a set of chosen dish ids satisfies the offer's food rules.
 *
 * Returns a list of human-readable problems — empty when the selection is
 * valid. Rules the admin marked `selectable: false` (rice, water: included and
 * never chosen) are skipped, and a rule with no allowed items configured yet
 * cannot be enforced, so it is skipped too rather than blocking every booking.
 */
function validateOfferSelection(pkg, selectedIds) {
  if (!isSpecialOffer(pkg)) return [];

  const chosen = new Set((selectedIds || []).map(idOf).filter(Boolean));
  const problems = [];

  offerMenuRules(pkg).forEach((rule) => {
    if (rule.selectable === false) return;

    const allowed = (Array.isArray(rule.menu_items) ? rule.menu_items : []).map(idOf);
    if (allowed.length === 0) return;

    const required = Math.max(0, Math.floor(Number(rule.required_count) || 0));
    if (required === 0) return;

    const picked = allowed.filter((id) => chosen.has(id));
    if (picked.length !== required) {
      problems.push(
        `${rule.label}: choose exactly ${required} ${
          required === 1 ? "item" : "items"
        } (you chose ${picked.length}).`,
      );
    }
  });

  return problems;
}

/**
 * Parses the rules as they arrive from the admin form. Rules travel as JSON in
 * a multipart body, so this is the one place that decides what a rule is.
 */
function normalizeOfferMenuRules(raw) {
  let rules = raw;
  if (typeof raw === "string") {
    try {
      rules = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rules)) return [];

  return rules
    .map((rule) => {
      const required = Math.max(0, Math.floor(Number(rule?.required_count) || 0));
      return {
        // Which course of the menu this rule draws from. Kept so the admin form
        // can reopen a saved rule showing the same list it was built from.
        group_id: String(rule?.group_id || "").trim(),
        label: String(rule?.label || "").trim(),
        required_count: required,
        // One number decides this: a course the customer picks nothing from is
        // a course that simply comes with the offer.
        selectable: required > 0,
        note: String(rule?.note || "").trim(),
        menu_items: (Array.isArray(rule?.menu_items) ? rule.menu_items : [])
          .map(idOf)
          .filter(Boolean),
      };
    })
    .filter((rule) => rule.label);
}

module.exports = {
  OFFER_TYPES,
  BOOKING_TYPES,
  BOOKING_TYPE_LABELS,
  isSpecialOffer,
  bookingTypeForPackage,
  offerGuestCap,
  offerBaseFoodPrice,
  offerSetupCharge,
  offerMenuRules,
  scaffoldOptionOf,
  validateOfferSelection,
  normalizeOfferMenuRules,
  money,
};
