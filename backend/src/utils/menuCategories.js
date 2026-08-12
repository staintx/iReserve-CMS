/**
 * Course taxonomy for `MenuItem.category`, which is a free-text string.
 *
 * This is the server-side counterpart of
 * `frontend/src/lib/menuCategories.js` — the two lists must stay in step. It
 * lives here as well because the combined-service course rule (3 mains, 1
 * vegetable, 2 desserts) is validated server-side, and the backend cannot take
 * the client's word for which course a dish belongs to.
 *
 * Order matters: `resolveGroupId` returns the first group whose keywords match,
 * and `water` sits before `drinks` so bottled water is never counted as a paid
 * beverage.
 */
const CATEGORY_GROUPS = [
  { id: "appetizers", match: ["appetizer", "starter", "salad", "finger food", "pica"] },
  { id: "soups", match: ["soup", "sabaw"] },
  { id: "mains", match: ["main", "entree", "viand", "ulam", "chicken", "pork", "beef", "seafood", "fish"] },
  { id: "noodles", match: ["pasta", "noodle", "pancit"] },
  { id: "rice", match: ["rice", "kanin"] },
  { id: "vegetables", match: ["vegetable", "veggie", "gulay"] },
  { id: "desserts", match: ["dessert", "cake", "sweet", "pastry", "panghimagas"] },
  { id: "water", match: ["water", "tubig", "mineral"] },
  { id: "drinks", match: ["drink", "beverage", "juice", "shake", "inumin"] },
];

function resolveGroupId(rawCategory) {
  const normalised = String(rawCategory || "").trim().toLowerCase();
  if (!normalised) return "uncategorised";
  const group = CATEGORY_GROUPS.find((candidate) =>
    candidate.match.some((keyword) => normalised.includes(keyword)),
  );
  return group ? group.id : `other:${normalised}`;
}

/**
 * Fixed-count courses for "Food and Event Setup".
 *
 * Water is included at no charge and is never selected, and drinks have no
 * count rule anywhere in the system — neither appears here, and neither is
 * invented.
 */
const COURSE_RULES = [
  { key: "main", groupId: "mains", label: "main courses", required: 3 },
  { key: "vegetable", groupId: "vegetables", label: "vegetable", required: 1 },
  { key: "dessert", groupId: "desserts", label: "desserts", required: 2 },
];

module.exports = { CATEGORY_GROUPS, resolveGroupId, COURSE_RULES };
