/**
 * Semantic tones for the customer portal.
 *
 * One vocabulary shared by status badges, notices, amounts, icon tiles and
 * actions so a colour always means the same thing across the portal.
 *
 *   success — confirmed, paid, completed
 *   warning — payment due, pending, needs attention
 *   danger  — cancelled, rejected, destructive
 *   info    — informational progress, general primary actions
 *   comms   — messages and conversation
 *   neutral — quiet, archived, secondary
 *
 * Colour is never the only signal: every consumer also renders an icon and a
 * plain-language label.
 */

export const TONE_BADGE = {
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-rose-50 text-rose-900 border-rose-200",
  info: "bg-blue-50 text-blue-900 border-blue-200",
  comms: "bg-purple-50 text-purple-900 border-purple-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

/** Softer surface for full-width notice strips inside a card. */
export const TONE_NOTICE = {
  success: "bg-emerald-50/70 border-emerald-100 text-emerald-900",
  warning: "bg-amber-50/70 border-amber-100 text-amber-900",
  danger: "bg-rose-50/70 border-rose-100 text-rose-900",
  info: "bg-blue-50/70 border-blue-100 text-blue-900",
  comms: "bg-purple-50/70 border-purple-100 text-purple-900",
  neutral: "bg-muted/60 border-border text-muted-foreground",
};

export const TONE_ICON = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
  info: "text-blue-600",
  comms: "text-purple-600",
  neutral: "text-muted-foreground",
};

export const TONE_TEXT = {
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-blue-700",
  comms: "text-purple-700",
  neutral: "text-foreground",
};

/**
 * Tinted square used behind a leading icon (record cards, stat tiles, quick
 * actions). Deliberately low-saturation: these repeat down a list, so they
 * should read as a quiet accent, never as a colour block.
 */
export const TONE_ACCENT = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  info: "bg-blue-50 text-blue-700",
  comms: "bg-purple-50 text-purple-700",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * Selected-state pill for status filter segments (PortalToolbar). A soft
 * pastel fill + darker matching text so the active filter echoes the same
 * colour as the status pills it filters for — recognisable at a glance
 * without turning the toolbar itself into a rainbow of saturated hues.
 * "neutral" (the "All" segment) intentionally has no tint of its own.
 */
export const TONE_SEGMENT_ACTIVE = {
  success: "bg-emerald-100 text-emerald-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-900",
  info: "bg-blue-100 text-blue-900",
  comms: "bg-purple-100 text-purple-900",
  neutral: "bg-card text-foreground shadow-sm ring-1 ring-border",
};
