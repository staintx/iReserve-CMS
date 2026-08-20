/**
 * Special Offers, on the client.
 *
 * Line-for-line mirror of `backend/src/utils/specialOffers.js` — the wizard
 * derives these while the customer books, and the server derives them again on
 * the way into the database. Change one, change the other.
 *
 * A Special Offer is a **combo pack**: a fixed meal, for a fixed number of
 * guests, at a fixed price per pax. It is a Package with
 * `offer_type: "special"` — not a second package system: same collection, same
 * admin form, same booking flow, same quotation. What differs is only:
 *
 *   1. Its price is per pax and fixed — `price_per_guest × guest_count` is the
 *      base FOOD price, and nothing else.
 *   2. Its guest count belongs to the combo, not to the customer. A 10-pax
 *      combo is booked for 10 guests, which is why the wizard shows the count
 *      rather than asking for it.
 *   3. Its food is the combo's own fixed list. The customer picks nothing —
 *      that is what makes it a combo rather than a menu.
 *
 * A combo is **food and nothing else**. The event-space build a regular package
 * sells — scaffold sizes, setup equipment, a base setup price, package add-ons —
 * is not part of a combo, so none of it is read here and none of it is shown to
 * a customer booking one. Regular packages keep all of it, unchanged.
 *
 * This is also why nothing here waives a setup fee: a combo has no setup to
 * waive, and a regular package's setup fee is charged whether or not catering is
 * ordered.
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

/**
 * How many guests the combo is built for — the combo's own number, and the
 * only guest count a Special Offer booking can have. `guest_max` is read only
 * as a fallback for offers the combo migration has not reached yet: a combo
 * saved since carries no guest range at all, because a range is a regular
 * package's way of being quoted.
 */
export function offerGuestCount(pkg) {
  return positive(pkg?.guest_count) || positive(pkg?.guest_max) || 0;
}

/** What one guest costs on this combo. */
export const offerPricePerPax = (pkg) =>
  isSpecialOffer(pkg) ? positive(pkg?.price_per_guest) : 0;

/**
 * `guest count × price per pax` — the combo's price, and the only figure an
 * offer decides. A combo is food, so this is the whole of what it sells; any
 * further charge on the booking is one the quotation adds, not one the combo
 * carries.
 *
 * Both numbers come from the combo, so this takes no guest count.
 */
export function offerBaseFoodPrice(pkg) {
  if (!isSpecialOffer(pkg)) return 0;
  return money(offerPricePerPax(pkg) * Math.floor(offerGuestCount(pkg)));
}

/** The combo's food, in the order the admin arranged it. */
export function offerFoodItems(pkg) {
  return (Array.isArray(pkg?.offer_food_items) ? pkg.offer_food_items : [])
    .filter((item) => item && String(item.item_name || "").trim())
    .map((item, index) => ({
      menu_category: String(item.menu_category || "").trim(),
      item_name: String(item.item_name || "").trim(),
      sort_order: Number.isFinite(Number(item.sort_order))
        ? Number(item.sort_order)
        : index,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * The combo's food grouped by course, in first-appearance order — which is how
 * every customer-facing surface renders it.
 *
 * Accepts a booking's `offer_food_snapshot` as well as an offer, because the
 * snapshot is the same shape: what a request was sold reads exactly like what
 * the combo offers.
 */
export function offerFoodByCategory(pkgOrItems) {
  const items = Array.isArray(pkgOrItems)
    ? offerFoodItems({ offer_food_items: pkgOrItems })
    : offerFoodItems(pkgOrItems);

  const groups = new Map();
  items.forEach((item) => {
    const category = item.menu_category || "Included";
    if (!groups.has(category)) groups.set(category, { category, items: [] });
    groups.get(category).items.push(item.item_name);
  });
  return [...groups.values()];
}

/**
 * The combo's inclusions as the customer reads them.
 *
 * Regular packages store inclusions prefixed with the inventory class they came
 * from ("[Dining & Service Inventory] Plates"). A combo's are typed as plain
 * lines, so the prefix is stripped here for the offers configured the old way.
 */
export const offerInclusions = (pkg) =>
  (Array.isArray(pkg?.inclusions) ? pkg.inclusions : [])
    .map((entry) => String(entry || "").replace(/^\s*\[[^\]]*\]\s*/, "").trim())
    .filter(Boolean);

/**
 * Whether the combo can be booked at all, and why not when it cannot.
 *
 * A combo with no guest count or no price is unfinished configuration, not an
 * offer — the booking button is disabled rather than showing a customer ₱0 or
 * "0 guests".
 */
export function offerIsBookable(pkg) {
  if (!isSpecialOffer(pkg)) return false;
  return (
    pkg.available !== false &&
    offerGuestCount(pkg) > 0 &&
    offerPricePerPax(pkg) > 0
  );
}

/**
 * Why this combo cannot be booked as asked, phrased for the customer. Empty
 * when it can.
 *
 * Mirrors the server's answer, so the wizard can never let through a request
 * the API will refuse. A combo feeds the number of guests it was built for: a
 * request for a different count is a different order, and the answer is another
 * combo or a custom booking rather than a scaled-up price nobody quoted.
 */
export function offerBookingProblem(pkg, guestCount) {
  if (!isSpecialOffer(pkg)) return "";

  if (pkg.available === false) {
    return `${pkg.name} is not available right now. Please choose another combo.`;
  }

  const pax = offerGuestCount(pkg);
  if (pax < 1) {
    return `${pkg.name} has no guest count set yet, so it cannot be booked. Please choose another combo.`;
  }
  if (offerPricePerPax(pkg) <= 0) {
    return `${pkg.name} has no price set yet, so it cannot be booked. Please choose another combo.`;
  }

  const requested = Math.floor(Number(guestCount) || 0);
  if (requested && requested !== pax) {
    return `${pkg.name} is a ${pax}-guest combo. Your booking is for ${requested} guests — book it for ${pax}, or ask us for a custom booking.`;
  }

  return "";
}

/**
 * What to call the guest count field.
 *
 * A combo's count is fixed by the combo, so it is stated rather than estimated.
 * Everywhere else it is an opening figure that can still move at quotation,
 * ocular or revision, so it is the Estimated Guest Count.
 */
export const guestCountLabel = (pkg) =>
  isSpecialOffer(pkg) ? "Guest count" : "Estimated guest count";

export const guestCountHelp = (pkg) =>
  isSpecialOffer(pkg)
    ? "This combo serves a set number of guests, so the count is fixed."
    : "An estimate is fine — we confirm the final count on your quotation.";
