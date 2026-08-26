// -----------------------------------------------------------------------------
// Booking flow design tokens
// -----------------------------------------------------------------------------
// Spacing scale ....... 4 / 8 / 12 / 16 / 24 (gap-1 … gap-6)
// Radius .............. controls: rounded-md (6px) · cards: rounded-lg (8px)
// Control height ...... h-9 / h-9.5 (36-38px) — compact, dense, professional
// Shadow .............. shadow-sm on resting surfaces, shadow-md on raised
// Typography .......... UI typeface throughout, never the Playfair display
//                       face: booking is transactional and has to be scanned,
//                       not admired. Step title 18-20px semibold · section
//                       13px semibold · body/control 14px · label 11px
//                       uppercase · help 12px
//
// These live apart from BookingSharedUI.jsx so that file exports components
// only and keeps fast refresh working.

export const ACCENT = "#4C81E0";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C81E0] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Consistent peso formatting across the flow. */
export const formatPeso = (value, { decimals = 0 } = {}) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
