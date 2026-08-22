/**
 * Event themes and colour palettes offered to customers.
 *
 * `event_theme` and `event_palette` were once filled from one bundled preset
 * (picking "Soft & Romantic" forced Blush/Ivory/Champagne along with it), but
 * the Admin Quotation Builder has always treated them as two independent
 * fields — a free-text Theme and a separately-typed, comma-separated Colour
 * palette (components/admin/quotation/QuotationBuilderModal.jsx). A customer
 * who likes a look's colours but not its name, or vice versa, had no way to
 * say so. These are now two separate catalogs so a theme card only ever
 * writes `event_theme` and a palette card only ever writes `event_palette`.
 *
 * `event_theme` was also a free-text box before any of this, and every value
 * real customers saved was unusable ("hthh", "fsfsdf", "dddd", "wewwe").
 * Presets exist so most customers never have to describe a look in an empty
 * field — the swatches are for recognition only, never asked for or stored
 * as hex.
 */
/**
 * Colour palettes a customer can pick on their own, independent of any theme
 * — the same six recognisable combinations the themes above used to force,
 * now offered for their colours alone. `colors` is what goes into
 * `event_palette`; `swatches` is the same recognition aid, never stored.
 */
export const COLOR_PALETTES = [
  {
    id: "blush-ivory-champagne",
    colors: ["Blush", "Ivory", "Champagne"],
    swatches: ["#E8C4C0", "#F6F1E7", "#E5D3A6"],
  },
  {
    id: "navy-ivory-gold",
    colors: ["Navy", "Ivory", "Gold"],
    swatches: ["#1F3255", "#F6F1E7", "#C5A059"],
  },
  {
    id: "sage-cream-white",
    colors: ["Sage", "Cream", "White"],
    swatches: ["#A3B18A", "#F2EAD9", "#FFFFFF"],
  },
  {
    id: "terracotta-kraft-olive",
    colors: ["Terracotta", "Kraft", "Olive"],
    swatches: ["#C06B4F", "#D8C3A5", "#6B7048"],
  },
  {
    id: "coral-sunshine-teal",
    colors: ["Coral", "Sunshine", "Teal"],
    swatches: ["#F2775C", "#F5C542", "#3FA7A0"],
  },
  {
    id: "charcoal-white-silver",
    colors: ["Charcoal", "White", "Silver"],
    swatches: ["#3A3A3C", "#FFFFFF", "#C9CBCD"],
  },
];

/** Sentinel for "something else", on both pickers. */
export const OTHER_PALETTE_ID = "other_palette";

/** Matches a saved `event_palette` array back to one of the presets, order-insensitive. */
export const findPaletteByColors = (colors) => {
  const list = Array.isArray(colors) ? colors : [];
  if (list.length === 0) return null;
  const key = (arr) =>
    arr
      .map((c) => String(c || "").trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join("|");
  const target = key(list);
  if (!target) return null;
  return COLOR_PALETTES.find((p) => key(p.colors) === target) || null;
};
