/**
 * Utility functions for parsing, grouping, and displaying package and inclusion data.
 * Fully aligned with frontend/src/lib/packageDisplay.js and frontend/src/lib/specialOffers.js
 * for 1:1 behavioral consistency across Web and Mobile.
 */
import { formatCurrency } from "./format.js";

export const OFFER_TYPES = { REGULAR: "regular", SPECIAL: "special" };
export const BOOKING_TYPES = { REGULAR: "regular", SPECIAL: "special", CUSTOM: "custom" };

/**
 * Checks whether a package is a Special Offer / Combo Pack.
 * Mirrors website isSpecialOffer helper.
 */
export const isSpecialOffer = (pkg) =>
  pkg?.offer_type === OFFER_TYPES.SPECIAL ||
  pkg?.booking_type === BOOKING_TYPES.SPECIAL ||
  Boolean(pkg?.is_special_offer) ||
  Boolean(pkg?.is_combo) ||
  pkg?.package_type === "Special Offer" ||
  Boolean(pkg?.combo_guest_count) ||
  (Array.isArray(pkg?.offer_food_items) && pkg.offer_food_items.length > 0);

/**
 * What one guest costs on this combo.
 */
export const offerPricePerPax = (pkg) =>
  isSpecialOffer(pkg) ? (Number(pkg?.price_per_guest) || 0) : 0;

/**
 * How many guests the combo is built for.
 */
export const offerGuestCount = (pkg) =>
  Number(pkg?.guest_count) || Number(pkg?.combo_guest_count) || Number(pkg?.guest_max) || 0;

/**
 * Clean wrapping quotes, slashes, and stray array bracket artifacts from a string
 */
export function cleanItemName(val) {
  if (val == null) return "";
  let s = String(val).trim();
  for (let i = 0; i < 4; i++) {
    s = s.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }
  s = s.replace(/^\[+|\]+$/g, "").trim();
  for (let i = 0; i < 4; i++) {
    s = s.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }
  return s;
}

/**
 * The combo's food, in the order the admin arranged it, with array unwrapping and deduplication.
 */
export function offerFoodItems(pkg) {
  const rawList = Array.isArray(pkg?.offer_food_items) ? pkg.offer_food_items : [];
  const expanded = [];

  rawList.forEach((item) => {
    if (!item) return;
    const category = cleanItemName(item.menu_category || "");
    const rawName = item.item_name !== undefined ? item.item_name : item.name;

    if (Array.isArray(rawName)) {
      rawName.flat(Infinity).forEach((n) => {
        const clean = cleanItemName(n);
        if (clean) expanded.push({ menu_category: category, item_name: clean });
      });
    } else if (typeof rawName === "string") {
      let trimmed = rawName.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.flat(Infinity).forEach((n) => {
              const clean = cleanItemName(n);
              if (clean) expanded.push({ menu_category: category, item_name: clean });
            });
            return;
          }
        } catch {}
      }
      const clean = cleanItemName(trimmed);
      if (clean) expanded.push({ menu_category: category, item_name: clean });
    }
  });

  const seen = new Set();
  const deduped = [];
  expanded.forEach((item) => {
    const key = `${item.menu_category.toLowerCase()}:::${item.item_name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  return deduped.map((item, index) => ({ ...item, sort_order: index }));
}

/**
 * The combo's food grouped by course/category, in first-appearance order.
 */
export function offerFoodByCategory(pkgOrItems) {
  const items = Array.isArray(pkgOrItems)
    ? offerFoodItems({ offer_food_items: pkgOrItems })
    : offerFoodItems(pkgOrItems);

  const groups = new Map();
  const seenPerCategory = new Map();

  items.forEach((item) => {
    const category = item.menu_category || "Included";
    const catLower = category.toLowerCase();
    const itemLower = item.item_name.toLowerCase();

    let seen = seenPerCategory.get(catLower);
    if (!seen) {
      seen = new Set();
      seenPerCategory.set(catLower, seen);
    }

    if (seen.has(itemLower)) return;
    seen.add(itemLower);

    let group = groups.get(catLower);
    if (!group) {
      group = { category, items: [] };
      groups.set(catLower, group);
    }
    group.items.push(item.item_name);
  });

  return [...groups.values()];
}

/**
 * The combo's inclusions as the customer reads them without raw bracket prefixes.
 */
export const offerInclusions = (pkg) => {
  const list = Array.isArray(pkg?.inclusions) ? pkg.inclusions : [];
  const seen = new Set();
  const result = [];

  list.forEach((entry) => {
    let clean = cleanItemName(entry);
    clean = clean.replace(/^\s*\[[^\]]*\]\s*/, "").trim();
    clean = cleanItemName(clean);
    if (!clean) return;

    const lower = clean.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    result.push(clean);
  });

  return result;
};

const INCLUSION_PATTERN = /^\s*\[([^\]]+)\]\s*(.+?)\s*(?:\(([^()]*)\))?\s*$/;

/**
 * Parses an inclusion string formatted as "[Category] Name (quantity)"
 * into an object: { category, name, qty }
 */
export function parseInclusion(value) {
  let raw = String(value || "").trim();
  if (!raw) return null;

  for (let i = 0; i < 4; i++) {
    raw = raw.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  raw = raw.replace(/^\[+[\s"'\\]*\[/, "[");
  raw = raw.replace(/\]+[\s"'\\]*\]+$/, "]");
  raw = raw.replace(/^\[+[\s"'\\]+/, "[");
  raw = raw.replace(/[\s"'\\]+\]+$/, "]");

  for (let i = 0; i < 4; i++) {
    raw = raw.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  const match = raw.match(INCLUSION_PATTERN);
  if (!match) {
    let cleanName = raw.replace(/^\[+|\]+$/g, "").trim();
    cleanName = cleanName.replace(/^["'\\]+|["'\\]+$/g, "").trim();
    return { category: null, name: cleanName, qty: null };
  }

  let cat = match[1].trim().replace(/^["'\\]+|["'\\]+$/g, "").trim();
  let name = match[2].trim().replace(/^["'\\]+|["'\\]+$/g, "").trim();
  let qty = match[3]?.trim() || null;
  if (qty) qty = qty.replace(/^["'\\]+|["'\\]+$/g, "").trim();

  return {
    category: cat || null,
    name,
    qty,
  };
}

/**
 * Extracts just the display name from an inclusion line.
 */
export function inclusionDisplayName(value) {
  const parsed = parseInclusion(value);
  return parsed ? parsed.name : String(value || "").trim();
}

/**
 * Groups an array of inclusion strings by category.
 * Returns an array of { category: string, items: Array<{ category, name, qty }> }
 */
export function groupInclusions(inclusions) {
  const list = Array.isArray(inclusions) ? inclusions : [];
  const groups = [];
  const byCategory = new Map();
  const seenItemsPerCategory = new Map();

  list.forEach((entry) => {
    const rawVal = typeof entry === "string" ? entry : entry?.name;
    const parsed = parseInclusion(rawVal);
    if (!parsed || !parsed.name) return;

    const catKey = (parsed.category || "General Inclusions").trim();
    const catLower = catKey.toLowerCase();
    const itemKey = `${parsed.name.toLowerCase()}:::${(parsed.qty || "").toLowerCase()}`;

    let seen = seenItemsPerCategory.get(catLower);
    if (!seen) {
      seen = new Set();
      seenItemsPerCategory.set(catLower, seen);
    }

    if (seen.has(itemKey)) return;
    seen.add(itemKey);

    let group = byCategory.get(catLower);
    if (!group) {
      group = { category: catKey, items: [] };
      byCategory.set(catLower, group);
      groups.push(group);
    }
    group.items.push(parsed);
  });

  return groups;
}

/**
 * Filtered scaffold size options for regular packages.
 * Combos sell food only and therefore have no scaffolds.
 */
export const scaffoldOptions = (pkg) => {
  if (isSpecialOffer(pkg)) return [];
  const list = Array.isArray(pkg?.scaffold_size_options) ? pkg.scaffold_size_options : [];
  return list.filter((opt) => (opt?.width_ft && opt?.length_ft) || opt?.label || opt?.price);
};

export const guestRange = (pkg) => {
  if (isSpecialOffer(pkg)) {
    const count = offerGuestCount(pkg);
    return [count || null, count || null];
  }
  const options = scaffoldOptions(pkg);
  const positiveNumbers = (arr) => arr.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const mins = positiveNumbers([pkg?.guest_min, ...options.map((o) => o?.guest_min)]);
  const maxs = positiveNumbers([pkg?.guest_max, ...options.map((o) => o?.guest_max)]);
  return [mins.length ? Math.min(...mins) : null, maxs.length ? Math.max(...maxs) : null];
};

export const capacityLabel = (pkg) => {
  if (isSpecialOffer(pkg)) {
    const count = offerGuestCount(pkg);
    return count ? `${count} pax fixed` : null;
  }
  const [min, max] = guestRange(pkg);
  if (min && max && min !== max) return `${min} – ${max} guests`;
  if (max) return `Up to ${max} guests`;
  return null;
};

export const perGuestPrice = (pkg) => {
  const value = Number(pkg?.price_per_guest);
  return Number.isFinite(value) && value > 0 ? value : null;
};

export const setupFromPrice = (pkg) => {
  const options = scaffoldOptions(pkg);
  const prices = options.map((o) => Number(o?.price)).filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
};

export const priceLabel = (pkg) => {
  if (isSpecialOffer(pkg)) {
    const pax = offerPricePerPax(pkg);
    return pax ? `${formatCurrency(pax)} / pax` : "Contact for pricing";
  }
  const perGuest = perGuestPrice(pkg);
  if (perGuest) return `${formatCurrency(perGuest)} per guest`;

  const setupPrice = Number(pkg?.setup_price);
  if (Number.isFinite(setupPrice) && setupPrice > 0) return `${formatCurrency(setupPrice)} setup fee`;

  const setupFrom = setupFromPrice(pkg);
  if (setupFrom) return `Setup from ${formatCurrency(setupFrom)}`;

  if (pkg?.package_type === "Food Only") return "Priced by menu selection";
  return "Quoted per event";
};

export const packagePriceParts = (pkg) => {
  if (isSpecialOffer(pkg)) {
    const pax = offerPricePerPax(pkg);
    return pax
      ? { amount: formatCurrency(pax), suffix: "per pax", isPerPax: true }
      : { text: "Contact for pricing" };
  }
  const perGuest = perGuestPrice(pkg);
  if (perGuest) {
    return { amount: formatCurrency(perGuest), suffix: "per guest", isPerGuest: true };
  }
  const setupPrice = Number(pkg?.setup_price);
  if (Number.isFinite(setupPrice) && setupPrice > 0) {
    return { amount: formatCurrency(setupPrice), suffix: "base setup", isSetup: true };
  }
  const setupFrom = setupFromPrice(pkg);
  if (setupFrom) {
    return { prefix: "Setup from", amount: formatCurrency(setupFrom), suffix: "", isSetupFrom: true };
  }
  if (pkg?.package_type === "Food Only") {
    return { text: "Priced by menu selection" };
  }
  return { text: "Quoted per event" };
};

export const SERVICE_LABELS = {
  "Food Only": "Food only",
  "Event Setup Only": "Event setup",
  "Food + Event Setup": "Food & setup",
};

export const serviceLabel = (pkg) => {
  if (isSpecialOffer(pkg)) return "Combo pack";
  return SERVICE_LABELS[pkg?.package_type] || pkg?.package_type || "Event setup";
};

export const eventTypeForPackage = (pkg) => {
  if (pkg?.event_type) return pkg.event_type;
  const name = String(pkg?.name || "").toLowerCase();
  if (name.includes("birthday")) return "Birthday";
  if (name.includes("wedding")) return "Wedding";
  if (name.includes("corporate")) return "Corporate";
  if (name.includes("debut")) return "Debut";
  return "";
};

export default {
  isSpecialOffer,
  offerPricePerPax,
  offerGuestCount,
  offerFoodItems,
  offerFoodByCategory,
  offerInclusions,
  parseInclusion,
  inclusionDisplayName,
  groupInclusions,
  scaffoldOptions,
  guestRange,
  capacityLabel,
  perGuestPrice,
  setupFromPrice,
  priceLabel,
  packagePriceParts,
  serviceLabel,
  eventTypeForPackage,
  cleanItemName,
};
