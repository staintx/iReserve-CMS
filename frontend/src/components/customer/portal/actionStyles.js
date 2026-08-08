/**
 * Semantic action styling for the customer portal.
 *
 * Importance is carried by the button *variant* (solid = primary step, outline
 * = secondary, ghost = tertiary); meaning is carried by these colours. Applied
 * as className overrides on the shared <Button> so the admin portal's button
 * styles stay untouched.
 *
 *   PAY      amber solid — the money action, tied to the amber "Amount due"
 *   MESSAGE  purple outline — conversation
 *   DANGER   red ghost — cancel / destructive
 *   QUIET    neutral outline — everything else
 *
 * Anything that is simply "the next step" keeps the default blue Button.
 */

/**
 * Paying is a positive financial action, so it gets semantic green rather than
 * the brand blue (reserved for primary/navigation) or amber (reserved for
 * "needs attention"). Emerald-700 keeps white label text at ~5.5:1 and reads
 * as a deep, trustworthy green instead of a saturated neon one.
 */
export const ACTION_PAY =
  "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700/40";

/** Outline green for a payment action that must not outrank the primary step. */
export const ACTION_PAY_SECONDARY =
  "border-emerald-300 bg-card text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900";

export const ACTION_MESSAGE =
  "border-purple-200 bg-card text-purple-700 hover:bg-purple-50 hover:text-purple-800";

export const ACTION_DANGER =
  "text-destructive hover:bg-destructive/10 hover:text-destructive";

export const ACTION_QUIET =
  "border-border bg-card text-foreground hover:bg-muted hover:text-foreground";

/**
 * Solid navy for the active "service type" filter chip (PortalToolbar) — a
 * calmer, deeper read than the site's default brand blue (--color-primary,
 * #4C81E0). Chosen over the raw primary token specifically because
 * primary + white text only reaches ~3.8:1 (fails WCAG AA for this text
 * size); this shade holds ~5.3:1 while staying visibly the same blue family.
 */
export const FILTER_ACTIVE_BRAND =
  "border-[#3D6BB8] bg-[#3D6BB8] text-white";
