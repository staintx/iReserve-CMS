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
 *   3. Its food is the combo's own list of courses. A course naming one dish
 *      includes it; a course naming several lets the customer choose between
 *      them — but only from that course, and only as many as it asks for.
 *      What makes it a combo rather than a menu is that the combo decides the
 *      courses and the price, not that the customer is offered no choice.
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

export const isSpecialOffer = (pkg) =>
  pkg?.offer_type === OFFER_TYPES.SPECIAL ||
  pkg?.booking_type === BOOKING_TYPES.SPECIAL ||
  Boolean(pkg?.is_special_offer) ||
  (Array.isArray(pkg?.offer_food_items) && pkg.offer_food_items.length > 0);

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

  const isSpecial =
    record?.booking_type === BOOKING_TYPES.SPECIAL ||
    isSpecialOffer(pkg) ||
    (Array.isArray(record?.offer_food_snapshot) && record.offer_food_snapshot.length > 0);

  const type = isSpecial
    ? BOOKING_TYPES.SPECIAL
    : record?.booking_type ||
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
export function offerBaseFoodPrice(pkg, guestCount) {
  if (!isSpecialOffer(pkg)) return 0;
  const count = positive(guestCount) || offerGuestCount(pkg) || 1;
  return money(offerPricePerPax(pkg) * Math.floor(count));
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
 * How many dishes a course asks the customer to choose.
 *
 * The number is written into the course name by the admin — "Main Course
 * (choose 2)" — because a combo's courses are free text rather than a
 * structured field. One is the default: a course that says nothing about
 * choosing is a course with a single pick.
 *
 * Mirrors the same helper in `backend/src/utils/specialOffers.js`, which
 * re-applies it on the way into the database.
 */
export function offerCourseRequirement(category) {
  const match = String(category || "").match(/choose\s*(\d+)/i);
  const count = match ? parseInt(match[1], 10) : 1;
  return Number.isFinite(count) && count > 0 ? count : 1;
}

/**
 * The combo food to show for a request that has already been submitted.
 *
 * Deliberately more conservative than the server's `normalizeOfferSelection`:
 * what the request stored is the record of what was sold, so nothing here
 * rewrites it against a combo that may have been re-plated or renamed since.
 * It fills in only the courses the request never recorded at all and that ask
 * for no choice — which is exactly what a request submitted before the wizard
 * seeded automatically included dishes looks like — and falls back to the
 * combo's own food for a request that stored none.
 *
 * A course the customer was meant to choose from and didn't is left alone:
 * guessing one here would put a dish nobody ordered in front of the kitchen.
 *
 * Returns `[{ menu_category, item_name }]`, the shape the snapshot already
 * has, so `offerFoodByCategory` groups the result directly.
 */
export function offerFoodForDisplay(record, pkg) {
  const snapshot = (
    Array.isArray(record?.offer_food_snapshot) ? record.offer_food_snapshot : []
  ).filter((entry) => String(entry?.item_name || "").trim());

  const courses = offerFoodByCategory(pkg);
  if (courses.length === 0) return snapshot;
  if (snapshot.length === 0) {
    return offerFoodItems(pkg).map(({ menu_category, item_name }) => ({
      menu_category,
      item_name,
    }));
  }

  const byCourse = new Map();
  snapshot.forEach((entry) => {
    // "Included" is `offerFoodByCategory`'s label for an uncategorised course
    // rather than something the admin typed, so a stored blank and that label
    // are the same course.
    const key = String(entry?.menu_category || "").trim() || "Included";
    if (!byCourse.has(key)) byCourse.set(key, []);
    byCourse.get(key).push(entry);
  });

  // Rebuilt in the combo's own course order, so a filled-in course appears
  // where the admin arranged it rather than appended after the meal.
  const ordered = [];
  courses.forEach((course) => {
    const recorded = byCourse.get(course.category);
    if (recorded?.length) {
      ordered.push(...recorded);
      byCourse.delete(course.category);
    } else if (course.items.length === 1) {
      ordered.push({
        menu_category: course.category === "Included" ? "" : course.category,
        item_name: course.items[0],
      });
    }
  });

  // A course the combo no longer has is still what this request was sold, so
  // it is kept rather than dropped.
  byCourse.forEach((entries) => ordered.push(...entries));
  return ordered;
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
 * A combo with no price is unfinished configuration, not an
 * offer — the booking button is disabled rather than showing a customer ₱0.
 */
export function offerIsBookable(pkg) {
  if (!isSpecialOffer(pkg)) return false;
  return (
    pkg.available !== false &&
    offerPricePerPax(pkg) > 0
  );
}

/**
 * Why this combo cannot be booked as asked, phrased for the customer. Empty
 * when it can.
 */
export function offerBookingProblem(pkg, guestCount) {
  if (!isSpecialOffer(pkg)) return "";

  if (pkg.available === false) {
    return `${pkg.name} is not available right now. Please choose another combo.`;
  }

  if (offerPricePerPax(pkg) <= 0) {
    return `${pkg.name} has no price set yet, so it cannot be booked. Please choose another combo.`;
  }

  const requested = Math.floor(Number(guestCount) || 0);
  if (requested < 1) {
    return "Please enter a valid number of guests.";
  }

  if (pkg.guest_min && requested < pkg.guest_min) {
    return `${pkg.name} requires a minimum of ${pkg.guest_min} guests.`;
  }

  return "";
}

/**
 * What to call the guest count field.
 */
export const guestCountLabel = (pkg) =>
  isSpecialOffer(pkg) ? "Guest count (pax)" : "Estimated guest count";

export const guestCountHelp = (pkg) =>
  isSpecialOffer(pkg)
    ? "Enter the number of guests. Food price is calculated per person/plate."
    : "An estimate is fine — we confirm the final count on your quotation.";
