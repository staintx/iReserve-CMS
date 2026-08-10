/**
 * Event themes offered to customers.
 *
 * `event_theme` was a free-text box, and every value real customers have ever
 * saved is unusable ("hthh", "fsfsdf", "dddd", "wewwe"). Asking someone to
 * describe a styling direction in an empty field gets nothing an event
 * coordinator can act on.
 *
 * These are palettes rather than a colour picker: the customer recognises a
 * look and picks it, without needing colour theory or hex values. The swatches
 * are for recognition only, never asked for or stored as hex.
 *
 * Coverage is drawn from the event types the system actually books
 * (Birthday, Wedding, Corporate) plus the garden and rustic venues in
 * StepEventDetails' venue list.
 *
 * `name` is what goes into `event_theme` (a String on both Inquiry and
 * Booking, and what the admin already reads as "Theme / Motif"). `colors` goes
 * into `event_palette` so staff receive the palette as structured data instead
 * of having to parse a sentence.
 */
export const EVENT_THEMES = [
  {
    id: "romantic",
    name: "Soft & Romantic",
    colors: ["Blush", "Ivory", "Champagne"],
    swatches: ["#E8C4C0", "#F6F1E7", "#E5D3A6"],
  },
  {
    id: "classic",
    name: "Classic & Elegant",
    colors: ["Navy", "Ivory", "Gold"],
    swatches: ["#1F3255", "#F6F1E7", "#C5A059"],
  },
  {
    id: "natural",
    name: "Fresh & Natural",
    colors: ["Sage", "Cream", "White"],
    swatches: ["#A3B18A", "#F2EAD9", "#FFFFFF"],
  },
  {
    id: "rustic",
    name: "Warm & Rustic",
    colors: ["Terracotta", "Kraft", "Olive"],
    swatches: ["#C06B4F", "#D8C3A5", "#6B7048"],
  },
  {
    id: "festive",
    name: "Bright & Festive",
    colors: ["Coral", "Sunshine", "Teal"],
    swatches: ["#F2775C", "#F5C542", "#3FA7A0"],
  },
  {
    id: "modern",
    name: "Modern & Minimal",
    colors: ["Charcoal", "White", "Silver"],
    swatches: ["#3A3A3C", "#FFFFFF", "#C9CBCD"],
  },
];

/** Sentinel for "none of these", which reopens the free-text path. */
export const CUSTOM_THEME_ID = "custom";

export const findThemeByName = (name) =>
  EVENT_THEMES.find(
    (theme) => theme.name.toLowerCase() === String(name || "").trim().toLowerCase(),
  ) || null;
