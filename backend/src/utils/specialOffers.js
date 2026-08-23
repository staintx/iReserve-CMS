/**
 * Special Offers, in one place.
 *
 * A Special Offer is a **combo pack**: a fixed meal, for a fixed number of
 * guests, at a fixed price per pax. It is a Package with
 * `offer_type: "special"` — not a second package system. It reuses the same
 * collection, the same admin form, the same booking flow and the same
 * quotation, and differs only in how its base food price is worked out and in
 * what the customer is asked for.
 *
 * The three rules that make an offer an offer:
 *
 *   1. Price is per pax and fixed — `price_per_guest × guest_count` is the
 *      base FOOD price, nothing else.
 *   2. The guest count belongs to the combo, not to the customer. A 10-pax
 *      combo is booked for 10 guests; the booking's guest count is that
 *      number, which is why nothing here reads a count off the request.
 *   3. The food is the combo's own list of courses. A course naming one dish
 *      includes it; a course naming several lets the customer choose between
 *      them — but only from that course, and only as many as it asks for.
 *      What makes it a combo rather than a menu is that the combo decides the
 *      courses and the price, not that the customer is offered no choice.
 *
 * A combo is **food and nothing else**. The event-space build a regular package
 * sells — scaffold sizes, setup equipment, a base setup price, package add-ons —
 * is not part of a combo and is never configured on one. Those fields stay on
 * the shared schema because regular packages need them; `PACKAGE_ONLY_FIELDS`
 * below is the one list that keeps them off an offer, applied on every write.
 *
 * This is also why nothing here waives a setup fee: a combo has no setup to
 * waive, and a regular package's setup fee is charged whether or not catering
 * is ordered. Neither kind of record can discount the other's.
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
 * How many guests the combo is built for.
 *
 * This is the combo's own number and the only guest count a Special Offer
 * booking can have. `guest_max` is read only as a fallback for offers the combo
 * migration has not reached yet — a combo saved since carries no guest range at
 * all, because a range is a regular package's way of being quoted.
 */
function offerGuestCount(pkg) {
  return positive(pkg?.guest_count) || positive(pkg?.guest_max) || 0;
}

/** What one guest costs on this combo. */
const offerPricePerPax = (pkg) =>
  isSpecialOffer(pkg) ? positive(pkg?.price_per_guest) : 0;

/**
 * `guest count × price per pax` — the combo's price, and the only figure an
 * offer decides. A combo is food, so this is the whole of what it sells; any
 * further charge on the booking is one the quotation adds, not one the combo
 * carries.
 *
 * Both numbers come from the combo, so this takes no guest count: there is no
 * second answer a request could supply.
 */
function offerBaseFoodPrice(pkg, guestCount) {
  if (!isSpecialOffer(pkg)) return 0;
  const count = positive(guestCount) || offerGuestCount(pkg) || 1;
  return money(offerPricePerPax(pkg) * Math.floor(count));
}

/** The combo's food, in the order the admin arranged it. */
function offerFoodItems(pkg) {
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
 * The combo's food grouped by course, in first-appearance order.
 *
 * Grouping presents the stored order rather than re-sorting it, so the customer
 * sees the courses in the sequence the admin built them.
 */
function offerFoodByCategory(pkg) {
  const groups = new Map();
  offerFoodItems(pkg).forEach((item) => {
    const category = item.menu_category || "Included";
    if (!groups.has(category)) groups.set(category, { category, items: [] });
    groups.get(category).items.push(item.item_name);
  });
  return [...groups.values()];
}

/**
 * What is written onto a booking so it still reads correctly after the combo
 * is edited or taken down. The package relation stays the source of truth.
 */
const offerFoodSnapshot = (pkg) =>
  offerFoodItems(pkg).map(({ menu_category, item_name }) => ({
    menu_category,
    item_name,
  }));

/**
 * How many dishes a course asks the customer to choose.
 *
 * The number is written into the course name by the admin — "Main Course
 * (choose 2)" — because a combo's courses are free text rather than a
 * structured field. One is the default: a course that says nothing about
 * choosing is a course with a single pick.
 *
 * Mirrors the same helper in `frontend/src/lib/specialOffers.js`. The wizard
 * validates against it and this re-applies it on the way into the database.
 */
function offerCourseRequirement(category) {
  const match = String(category || "").match(/choose\s*(\d+)/i);
  const count = match ? parseInt(match[1], 10) : 1;
  return Number.isFinite(count) && count > 0 ? count : 1;
}

/**
 * The food a combo request is actually sold, settled course by course.
 *
 * A combo's courses come in two kinds: one listing a single dish includes it
 * automatically, one listing several asks the customer to pick. The wizard
 * shows both but only ever submitted the picks — an automatically included
 * dish was labelled "included with this combo" on screen and then left out of
 * the payload. Because the old fallback fired only for an entirely empty
 * snapshot, a combo mixing the two kinds stored a partial meal and nothing
 * ever recovered it: the missing courses travelled on into the quotation
 * builder and then into the booking's own menu, so the kitchen never saw them.
 *
 * The snapshot is therefore settled here rather than accepted as sent:
 *
 *   - only dishes the course actually lists survive, so a crafted payload
 *     cannot put arbitrary food on a fixed-price combo;
 *   - no course keeps more dishes than it asks for;
 *   - a course with no valid pick falls back to its own first dishes, which
 *     includes a single-dish course automatically and gives a multi-dish
 *     course a deterministic default rather than every option it offers.
 */
function normalizeOfferSelection(pkg, submitted) {
  const courses = offerFoodByCategory(pkg);
  if (courses.length === 0) return [];

  const picks = Array.isArray(submitted) ? submitted : [];
  const selection = [];

  courses.forEach((course) => {
    const required = offerCourseRequirement(course.category);
    const taken = new Set();
    const chosen = [];

    picks.forEach((entry) => {
      if (chosen.length >= required) return;
      // "Included" is `offerFoodByCategory`'s label for an uncategorised
      // course rather than something the admin typed, so a stored blank and
      // that label are the same course.
      const category = String(entry?.menu_category || "").trim() || "Included";
      if (category !== course.category) return;

      // Matched case-insensitively against the course's own dishes: the name
      // that gets stored is the combo's spelling, not the browser's.
      const name = String(entry?.item_name || "").trim().toLowerCase();
      const offered = course.items.find((item) => item.toLowerCase() === name);
      if (!offered || taken.has(offered.toLowerCase())) return;

      taken.add(offered.toLowerCase());
      chosen.push(offered);
    });

    const settled = chosen.length > 0 ? chosen : course.items.slice(0, required);
    settled.forEach((item_name) => {
      selection.push({
        // The display label is never written back onto the record, so a course
        // the admin left unnamed stays unnamed.
        menu_category: course.category === "Included" ? "" : course.category,
        item_name,
      });
    });
  });

  return selection;
}

/**
 * The combo's inclusions as the customer reads them.
 *
 * Regular packages store inclusions prefixed with the inventory class they came
 * from ("[Dining & Service Inventory] Plates"). A combo's are typed as plain
 * lines, so the prefix is stripped here for the offers configured the old way.
 */
const offerInclusions = (pkg) =>
  (Array.isArray(pkg?.inclusions) ? pkg.inclusions : [])
    .map((entry) => String(entry || "").replace(/^\s*\[[^\]]*\]\s*/, "").trim())
    .filter(Boolean);

/**
 * Package fields a combo never carries.
 *
 * Every one of these describes the event-space build a regular package sells:
 * the sizes it comes in, the equipment reserved for it, what that setup costs,
 * the extras sold alongside it, the catalogue dishes it links to, and the guest
 * range it is quoted against. A combo answers none of those questions — it is a
 * fixed meal for a fixed number of guests — so they are cleared rather than
 * left on the record to be inherited by accident.
 *
 * They stay on the shared schema because regular packages depend on them. This
 * list is the boundary, applied by `comboPayload` on every write.
 */
const PACKAGE_ONLY_FIELDS = [
  "scaffold_size_options",
  "default_scaffold_option_id",
  "setup_equipment",
  "setup_price",
  "add_ons",
  "menu_items",
  "guest_min",
  "guest_max",
];

/**
 * Request fields that only mean something on an event-space build, and so are
 * never stored on a combo booking: which scaffold size was picked, how big it
 * is, and what it cost.
 */
const PACKAGE_ONLY_REQUEST_FIELDS = [
  "selected_scaffold_option_id",
  "scaffold_width",
  "scaffold_length",
  "scaffold_base_area",
  "scaffold_price",
];

/**
 * The cleared value for a package-only field.
 *
 * Arrays empty and scalars null rather than undefined, because mongoose drops
 * undefined from an update: clearing has to be a value the write actually
 * carries, or a package converted to a combo keeps its scaffold sizes forever.
 */
const clearedValue = (field) =>
  ["scaffold_size_options", "setup_equipment", "add_ons", "menu_items"].includes(
    field,
  )
    ? []
    : null;

/**
 * A combo's payload: what was sent, minus everything only a regular package
 * uses, plus the one classification a combo always has.
 *
 * One function so create, update, and any future write cannot disagree about
 * where the line between the two kinds of record falls.
 */
function comboPayload(payload = {}) {
  const next = { ...payload };
  PACKAGE_ONLY_FIELDS.forEach((field) => {
    next[field] = clearedValue(field);
  });
  // A combo is food. Nothing about it is an event-space build, so it is not
  // filed as one.
  next.package_type = "Food Only";
  return next;
}

/**
 * The same boundary for an inquiry or booking made against a combo, applied to
 * the request in place.
 *
 * In place because the callers hold the payload they are about to save and need
 * these keys *gone* from it — copying the survivors into a new object would
 * leave the originals sitting on the record it is built from.
 */
function applyComboRequestBoundary(target) {
  if (!target) return target;
  PACKAGE_ONLY_REQUEST_FIELDS.forEach((field) => {
    delete target[field];
  });
  // Equipment is reserved from a package's setup_equipment, which a combo has
  // none of — anything here came from somewhere else and is not this booking's.
  target.inventory_items = [];
  return target;
}

/**
 * Why this combo cannot be booked as asked, phrased for the customer. Empty
 * when it can.
 *
 * A combo feeds the number of guests it was built for, so a request for a
 * different count is not a version of this combo — it is a different order,
 * and the answer is another combo or a custom booking. Nothing here scales a
 * combo up or invents a multi-unit price: neither is a rule the product has.
 */
function offerBookingProblem(pkg, guestCount) {
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
 * Parses the combo's food as it arrives from the admin form. Food items travel
 * as JSON in a multipart body, so this is the one place that decides what a
 * food item is.
 */
function normalizeOfferFoodItems(raw) {
  let items = raw;
  if (typeof raw === "string") {
    try {
      items = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      menu_category: String(item?.menu_category || "").trim(),
      item_name: String(item?.item_name || "").trim(),
    }))
    .filter((item) => item.item_name)
    // Position is the admin's arrangement, renumbered on save so a removed row
    // never leaves a gap that later reorders the list by itself.
    .map((item, index) => ({ ...item, sort_order: index }));
}

/** Plain inclusion lines, deduped and emptied of blanks. */
function normalizeOfferInclusions(raw) {
  let items = raw;
  if (typeof raw === "string") {
    items = raw.split(",");
  }
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  return items
    .map((entry) => String(entry || "").trim())
    .filter((entry) => {
      if (!entry || seen.has(entry.toLowerCase())) return false;
      seen.add(entry.toLowerCase());
      return true;
    });
}

module.exports = {
  OFFER_TYPES,
  BOOKING_TYPES,
  BOOKING_TYPE_LABELS,
  isSpecialOffer,
  bookingTypeForPackage,
  offerGuestCount,
  offerPricePerPax,
  offerBaseFoodPrice,
  offerFoodItems,
  offerFoodByCategory,
  offerFoodSnapshot,
  offerCourseRequirement,
  normalizeOfferSelection,
  offerInclusions,
  PACKAGE_ONLY_FIELDS,
  PACKAGE_ONLY_REQUEST_FIELDS,
  comboPayload,
  applyComboRequestBoundary,
  offerBookingProblem,
  normalizeOfferFoodItems,
  normalizeOfferInclusions,
  money,
};
