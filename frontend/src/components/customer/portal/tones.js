/**
 * Semantic tones for the customer portal.
 *
 * One vocabulary shared by status badges, notices and amounts so a colour
 * always means the same thing across Dashboard / Inquiries / Bookings.
 *
 *   success — done, confirmed, nothing to worry about
 *   warning — waiting on us or on the customer
 *   danger  — cancelled / rejected
 *   info    — neutral, informational progress
 *   neutral — quiet, archived, no signal
 *
 * Colour is never the only signal: every consumer also renders an icon and a
 * plain-language label.
 */

export const TONE_BADGE = {
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-rose-50 text-rose-900 border-rose-200",
  info: "bg-blue-50 text-blue-900 border-blue-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

/** Softer surface for full-width notice strips inside a card. */
export const TONE_NOTICE = {
  success: "bg-emerald-50/70 border-emerald-100 text-emerald-900",
  warning: "bg-amber-50/70 border-amber-100 text-amber-900",
  danger: "bg-rose-50/70 border-rose-100 text-rose-900",
  info: "bg-blue-50/70 border-blue-100 text-blue-900",
  neutral: "bg-muted/60 border-border text-muted-foreground",
};

export const TONE_ICON = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
  info: "text-blue-600",
  neutral: "text-muted-foreground",
};

export const TONE_TEXT = {
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
  info: "text-blue-700",
  neutral: "text-foreground",
};
