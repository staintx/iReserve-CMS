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
  "Event Setup Only": "Event setup only",
  "Food + Event Setup": "Food + setup",
};

export const serviceLabel = (pkg) => SERVICE_LABELS[pkg?.package_type] || null;

/**
 * The booking wizard filters candidate packages by `service_type`, whose
 * vocabulary differs from `package_type` for the combined option — see
 * PACKAGE_TYPE_BY_SERVICE_TYPE in booking/steps/StepPackageSelection.jsx.
 */
export function serviceTypeForPackage(pkg) {
  if (pkg?.package_type === "Food Only") return "Food Only";
  if (pkg?.package_type === "Event Setup Only") return "Event Setup Only";
  return "Food and Event Setup";
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
