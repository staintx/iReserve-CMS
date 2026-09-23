/**
 * `MenuItem.category` is an unconstrained string (the admin form offers a
 * dropdown but older rows predate it), so the same idea arrives spelled
 * several ways — "Main Course" vs "Main Dishes", "Beverage" vs "Drinks",
 * "Dessert" vs "Desserts". These groups fold those variants into one
 * customer-facing label.
 *
 * This is display/grouping only — nothing is written back and no data is
 * migrated. Anything that doesn't map keeps its own name, so a new category
 * can never go missing from a page.
 *
 * Order matters twice: it is the order a menu reads in, and `resolveGroup`
 * returns the first group whose keywords match. `water` therefore sits before
 * `drinks` so bottled water is never counted as a paid beverage.
 */
export const CATEGORY_GROUPS = [
  { id: "appetizers", label: "Appetizers", match: ["appetizer", "starter", "salad", "finger food", "pica"] },
  { id: "soups", label: "Soups", match: ["soup", "sabaw"] },
  { id: "mains", label: "Main Dishes", match: ["main", "entree", "viand", "ulam", "chicken", "pork", "beef", "seafood", "fish"] },
  { id: "noodles", label: "Noodles & Pasta", match: ["pasta", "noodle", "pancit"] },
  { id: "rice", label: "Rice", match: ["rice", "kanin"] },
  { id: "vegetables", label: "Vegetables", match: ["vegetable", "veggie", "gulay"] },
  { id: "desserts", label: "Desserts", match: ["dessert", "cake", "sweet", "pastry", "panghimagas"] },
  { id: "water", label: "Water", match: ["water", "tubig", "mineral"] },
  { id: "drinks", label: "Drinks", match: ["drink", "beverage", "juice", "shake", "inumin"] },
];

export const OTHER_GROUP_PREFIX = "other:";

const titleCase = (value) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * Resolves a raw category string to a group. Unknown values become their own
 * group rather than being dropped or lumped into a vague "Other".
 */
export function resolveGroup(rawCategory) {
  const raw = String(rawCategory || "").trim();
  if (!raw) return { id: "uncategorised", label: "More Dishes" };

  const cleanRaw = raw.startsWith(OTHER_GROUP_PREFIX)
    ? raw.slice(OTHER_GROUP_PREFIX.length).trim()
    : raw;

  const normalised = cleanRaw.toLowerCase();
  const group = CATEGORY_GROUPS.find((candidate) =>
    candidate.match.some((keyword) => normalised.includes(keyword)),
  );

  if (group) return { id: group.id, label: group.label };
  return { id: `${OTHER_GROUP_PREFIX}${normalised}`, label: titleCase(cleanRaw) };
}

/** Group id for a menu item, resolved from its raw category without forcing into predefined groups. */
export const groupIdFor = (item) => {
  const cat = typeof item === "string" ? item : (item?.category || item?.menu_category);
  return resolveGroup(cat).id;
};

/**
 * Resolves guidance subtitle for a category.
 * If guidance, subtitle, or description is explicitly provided by the category data, it is used.
 * Otherwise, uses the generic subtitle: "Select dishes for your menu."
 */
export function getCategoryGuidance(categoryOrGroup) {
  if (!categoryOrGroup) return "Select dishes for your menu.";

  if (typeof categoryOrGroup === "object") {
    if (categoryOrGroup.guidance) return categoryOrGroup.guidance;
    if (categoryOrGroup.subtitle) return categoryOrGroup.subtitle;
    if (categoryOrGroup.description) return categoryOrGroup.description;
  }

  return "Select dishes for your menu.";
}

