/**
 * Utility functions for parsing, grouping, and displaying package and inclusion data.
 * Ported from frontend/src/lib/packageDisplay.js for mobile consistency.
 */

const INCLUSION_PATTERN = /^\s*\[([^\]]+)\]\s*(.+?)\s*(?:\(([^()]*)\))?\s*$/;

/**
 * Parses an inclusion string formatted as "[Category] Name (quantity)"
 * into an object: { category, name, qty }
 */
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
 * Extracts just the display name from an inclusion line.
 */
export function inclusionDisplayName(value) {
  const parsed = parseInclusion(value);
  return parsed ? parsed.name : String(value || "").trim();
}

/**
 * Groups an array of inclusion strings by category.
 * Returns an array of { category: string|null, items: Array<{ category, name, qty }> }
 */
export function groupInclusions(inclusions) {
  const list = Array.isArray(inclusions) ? inclusions : [];
  const groups = [];
  const byCategory = new Map();

  list.forEach((entry) => {
    const rawVal = typeof entry === "string" ? entry : entry?.name;
    const parsed = parseInclusion(rawVal);
    if (!parsed) return;

    const key = parsed.category || "General Inclusions";
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

export default {
  parseInclusion,
  inclusionDisplayName,
  groupInclusions,
};
