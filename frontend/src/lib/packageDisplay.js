/**
 * Shared, honest presentation of package data for the customer-facing pages.
 *
 * The rules here come from what the admin form actually collects
 * (components/admin/ui/PackageModal.jsx), which differs by package type:
 *
 *   Food Only          — no package-level price; priced from the menu items
 *                        the customer chooses. guest_min/guest_max apply.
 *   Event Setup Only   — price and guest capacity both live on each entry in
 *                        scaffold_size_options; package-level guest fields
 *                        are not collected.
 *   Food + Event Setup — price_per_guest applies, setup included.
 *
 * Reading only `price_per_guest` (as the pages used to) made two of the three
 * types render "Contact for pricing" even though their prices are on record.
 */

export const peso = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
};

export const positiveNumbers = (values) =>
  values.map(Number).filter((n) => Number.isFinite(n) && n > 0);

const scaffoldOptions = (pkg) =>
  Array.isArray(pkg?.scaffold_size_options) ? pkg.scaffold_size_options : [];

/**
 * The event space the booking is for, as one label.
 *
 * "Event space size" and "scaffold size" are the same thing said two ways: the
 * footprint the customer picked off the package, stored on the request as
 * `scaffold_width` / `scaffold_length` with the option's own id beside them.
 * They are deliberately resolved to a single string here so no screen can grow
 * two fields for one fact and let them disagree.
 *
 * Read in the order the booking itself decided it: the dimensions stored on the
 * request, because that is what the customer chose and what they were priced
 * on; then the package option those dimensions came from, for a request that
 * saved only the id; and finally the option's own label, which is free text an
 * admin wrote ("20 x 40", "Large"). Returns "" when the booking has no event
 * space at all — a combo pack sells food, and food has no footprint — which is
 * the signal to show nothing rather than an empty row.
 */
export function eventSpaceLabel(request, pkg) {
  const dimension = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  };

  const option = scaffoldOptions(pkg).find(
    (entry) => String(entry?._id) === String(request?.selected_scaffold_option_id)
  );

  const width = dimension(request?.scaffold_width) ?? dimension(option?.width_ft);
  const length = dimension(request?.scaffold_length) ?? dimension(option?.length_ft);
  if (width && length) return `${width}ft × ${length}ft`;

  const label = String(option?.label || "").trim();
  if (label) return label;

  // Some requests recorded only the area. It is still the same one fact, so it
  // is stated rather than dropped.
  const area = dimension(request?.scaffold_base_area) ?? dimension(option?.area_ft2);
  return area ? `${area} sq ft` : "";
}

/**
 * Guest capacity as [min, max]; either end may be null.
 *
 * `size` and `max_guests` are deliberately never read: neither is in the
 * Package schema nor the admin form, and stale `size` values are scaffold
 * dimensions in feet ("20x20"), which the old UI rendered as a guest count.
 */
export function guestRange(pkg) {
  const options = scaffoldOptions(pkg);
  const mins = positiveNumbers([pkg?.guest_min, ...options.map((o) => o?.guest_min)]);
  const maxs = positiveNumbers([pkg?.guest_max, ...options.map((o) => o?.guest_max)]);

  return [mins.length ? Math.min(...mins) : null, maxs.length ? Math.max(...maxs) : null];
}

export function capacityLabel(pkg) {
  const [min, max] = guestRange(pkg);
  if (min && max) return min === max ? `${min} guests` : `${min}–${max} guests`;
  if (max) return `Up to ${max} guests`;
  if (min) return `From ${min} guests`;
  return null;
}

/** The per-guest price, when this package is priced that way. */
export function perGuestPrice(pkg) {
  const value = Number(pkg?.price_per_guest);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** The cheapest scaffold option price, when this package is priced that way. */
export function setupFromPrice(pkg) {
  const prices = positiveNumbers(scaffoldOptions(pkg).map((o) => o?.price));
  return prices.length ? Math.min(...prices) : null;
}

export function priceLabel(pkg) {
  const perGuest = perGuestPrice(pkg);
  if (perGuest) return `${peso(perGuest)} per guest`;

  const setupFrom = setupFromPrice(pkg);
  if (setupFrom) return `Setup from ${peso(setupFrom)}`;

  if (pkg?.package_type === "Food Only") return "Priced by menu selection";
  return "Quoted per event";
}

/**
 * Inclusions are stored as plain strings, but the admin form composes each one
 * as `[Category] Name (qty)` — see handleAddInclusion in PackageModal.jsx. The
 * customer pages used to print that raw, brackets and all. Parsing it back out
 * gives real grouped inclusions with no backend change.
 *
 * Anything that doesn't fit the pattern (hand-typed, or written before the
 * form used it) is kept verbatim under no category rather than dropped.
 */
const INCLUSION_PATTERN = /^\s*\[([^\]]+)\]\s*(.+?)\s*(?:\(([^()]*)\))?\s*$/;

export function parseInclusion(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const match = raw.match(INCLUSION_PATTERN);
  if (!match) return { category: null, name: raw, qty: null };

  return {
    category: match[1].trim() || null,
    name: match[2].trim(),
    qty: match[3]?.trim() || null,
  };
}

/**
 * The part of an inclusion line a person would call its name.
 *
 * An inclusion is stored as one string that carries three facts at once —
 * `[Event Setup & Furniture] Round Tables (6)` is a category, a name and a
 * quantity. When each of those has its own place on screen, showing the whole
 * string again in the name field repeats the category under a heading that
 * already says it and the quantity beside a box that already holds it. This
 * returns just the middle part, so the name field shows a name.
 *
 * A line with no category is returned whole: there is no prefix to strip, and
 * its quantity may be written into the name itself ("6 Round Tables"), where
 * removing it would leave the line saying less than it did.
 */
export function inclusionDisplayName(value) {
  const parsed = parseInclusion(value);
  return parsed ? parsed.name : "";
}

/**
 * The same inclusion line with its name replaced, category and quantity intact.
 *
 * The inverse of `inclusionDisplayName`: what the admin types goes back into
 * the middle of the stored string, so editing a name in a grouped list cannot
 * silently drop the category the group is built from or the quantity the price
 * is calculated against.
 */
export function withInclusionName(value, displayName) {
  const parsed = parseInclusion(value);
  const typed = String(displayName ?? "");
  if (!parsed || !parsed.category) return typed;
  const quantity = parsed.qty ? ` (${parsed.qty})` : "";
  return `[${parsed.category}] ${typed.trim()}${quantity}`;
}

/**
 * Where the number lives inside an inclusion line, if it has one.
 *
 * Inclusions are free text, and the quantity is written into that text rather
 * than stored beside it — "[Event Setup] Round Tables (6)" from the package
 * form, but also "6 Round Tables" or "Round Tables x6" when someone typed the
 * line by hand. The builder has to be able to both read that number and put a
 * different one back without disturbing the rest of the line, so what is
 * located here is the number's position, not just its value.
 *
 * Each pattern captures (prefix)(number)(suffix), which makes the number's
 * offset the prefix's length — no searching the matched text for digits that
 * may also appear in a category name.
 */
const QUANTITY_PATTERNS = [
  // "Round Tables (6)", "[Event Setup] Round Tables (6 pcs)" — the last parens
  /^(.*\()(\d+(?:\.\d+)?)([^()]*\)\s*)$/,
  // "Round Tables x6", "Round Tables × 6"
  /^(.*[x×]\s*)(\d+(?:\.\d+)?)(\s*)$/i,
  // "6 Round Tables", "[Event Setup] 6 Round Tables"
  /^((?:\[[^\]]*\]\s*)?)(\d+(?:\.\d+)?)(\s+\S.*)$/,
];

/**
 * The quantity an inclusion line states, and where it sits in the string.
 *
 * Returns null for a line with no quantity at all ("Professional crew",
 * "Buffet setup"), which is the signal that the line has nothing to adjust —
 * quantity pricing is offered only where a quantity was actually quoted.
 */
export function parseInclusionQuantity(value) {
  const raw = String(value || "");
  for (const pattern of QUANTITY_PATTERNS) {
    const match = raw.match(pattern);
    if (!match) continue;
    const quantity = Number(match[2]);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    return { quantity, start: match[1].length, end: match[1].length + match[2].length };
  }
  return null;
}

/**
 * The same inclusion line with its quantity replaced.
 *
 * Splices the new number into the position the parse found, so the category,
 * the wording and the unit ("6 pcs" -> "3 pcs") all survive untouched. A line
 * with no quantity is returned as it was.
 */
export function withInclusionQuantity(value, quantity) {
  const raw = String(value || "");
  const found = parseInclusionQuantity(raw);
  if (!found) return raw;
  return `${raw.slice(0, found.start)}${quantity}${raw.slice(found.end)}`;
}

/** Inclusions grouped by category, in the order the categories first appear. */
export function groupInclusions(inclusions) {
  const list = Array.isArray(inclusions) ? inclusions : [];
  const groups = [];
  const byCategory = new Map();

  list.forEach((entry) => {
    const parsed = parseInclusion(entry);
    if (!parsed) return;

    const key = parsed.category || "";
    let group = byCategory.get(key);
    if (!group) {
      group = { category: parsed.category, items: [] };
      byCategory.set(key, group);
      groups.push(group);
    }
    group.items.push(parsed);
  });

  return groups;
}

export const SERVICE_LABELS = {
  "Food Only": "Food only",
  "Event Setup Only": "Event setup",
  "Food + Event Setup": "Event setup",
};

export const serviceLabel = (pkg) => SERVICE_LABELS[pkg?.package_type] || "Event setup";

/**
 * The booking wizard filters candidate packages by `service_type`.
 */
export function serviceTypeForPackage(pkg) {
  if (pkg?.package_type === "Food Only") return "Food Only";
  return "Event Setup Only";
}

/** Event type as stored, falling back to what the package name implies. */
export function eventTypeForPackage(pkg) {
  if (pkg?.event_type) return pkg.event_type;
  const name = String(pkg?.name || "").toLowerCase();
  if (name.includes("birthday")) return "Birthday";
  if (name.includes("wedding")) return "Wedding";
  if (name.includes("corporate")) return "Corporate";
  return "";
}
