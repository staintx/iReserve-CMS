/**
 * Food Menu Category Constants & Ordering Utilities
 *
 * Ensures consistent category ordering across Admin Menu Management,
 * Menu Modals, and Prepare Quotation builder.
 * "Main Course" is strictly prioritized to always appear first.
 */

export const DEFAULT_FOOD_CATEGORIES = [
  "Main Course",
  "Appetizer",
  "Soup",
  "Salad",
  "Vegetable",
  "Pasta",
  "Rice",
  "Dessert",
  "Beverage",
  "Drinking Water",
];

/**
 * Returns numeric priority for a food category.
 * Main Course is always 0 (highest priority).
 * Default categories follow their canonical sequence (1, 2, 3...).
 * Custom/unknown categories follow at 100+.
 */
export function getCategoryPriority(category) {
  if (!category) return 999;
  const normalized = String(category).trim().toLowerCase();
  if (normalized === "main course" || normalized === "main" || normalized === "main courses") {
    return 0;
  }
  const index = DEFAULT_FOOD_CATEGORIES.findIndex(
    (c) => c.toLowerCase() === normalized
  );
  if (index !== -1) {
    return index;
  }
  return 100;
}

/**
 * Comparator to sort categories consistently, always placing "Main Course" first.
 */
export function compareCategories(catA, catB) {
  const prioA = getCategoryPriority(catA);
  const prioB = getCategoryPriority(catB);
  if (prioA !== prioB) return prioA - prioB;
  return String(catA || "").localeCompare(String(catB || ""));
}

/**
 * Sorts food menu items so items under "Main Course" always come first,
 * followed by items in subsequent categories.
 */
export function sortMenuItemsByCategory(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const catComp = compareCategories(a.category, b.category);
    if (catComp !== 0) return catComp;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}
