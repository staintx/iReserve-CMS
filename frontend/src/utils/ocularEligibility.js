/**
 * Centralized Ocular Visit Eligibility Utility
 * 
 * Rules:
 * 1. Opt-In Physical Site Inspection: Default is FALSE unless positive evidence of physical site setup,
 *    equipment logistics, or ocular_visit.is_required === true is established.
 * 2. Explicit Status Allowlist: Only active, actionable booking lifecycle statuses are eligible.
 * 3. Mode Distinction: Schedule New vs. Reschedule modes handle existing ocular statuses appropriately.
 * 4. Upcoming Event Date: Event date must be >= start of today (midnight today). Past events excluded.
 */

// Actionable booking statuses for ocular scheduling
export const ACTIONABLE_OCULAR_BOOKING_STATUSES = [
  "Deposit Pending",
  "deposit pending",
  "deposit_paid",
  "Confirmed",
  "confirmed",
  "Ocular Scheduled",
  "ocular scheduled",
  "Final Payment Pending",
  "final payment pending",
  "Ready for Event",
  "ready for event",
  "converted to booking",
];

/**
 * Opt-In Physical Site Inspection Decision Tree
 * Default is FALSE unless physical inspection/setup need is established.
 * 
 * @param {Object} booking 
 * @returns {Boolean}
 */
export function requiresPhysicalSiteInspection(booking) {
  if (!booking) return false;

  // 1. Explicit override: ocular_visit.is_required === true
  if (booking.ocular_visit?.is_required === true) {
    return true;
  }

  // 2. Pickup or non-setup Food Delivery -> NOT eligible
  const deliveryMethod = booking.delivery_method;
  const serviceType = booking.service_type;
  const eventType = (booking.event_type || "").toLowerCase();

  if (deliveryMethod === "pickup") return false;
  if (serviceType === "Food Only" && deliveryMethod !== "setup") return false;
  if (eventType.includes("food delivery") && deliveryMethod !== "setup") return false;

  // 3. Positive setup/equipment indicators -> ELIGIBLE
  if (
    deliveryMethod === "setup" ||
    serviceType === "Event Setup Only" ||
    serviceType === "Food and Event Setup" ||
    (Array.isArray(booking.service_items) && booking.service_items.length > 0)
  ) {
    return true;
  }

  // 4. Default: false (Opt-in principle)
  return false;
}

/**
 * Determines whether a booking is eligible for ocular scheduling in a given mode.
 * 
 * @param {Object} booking - Booking object
 * @param {String} mode - "schedule_new" | "reschedule"
 * @returns {Boolean}
 */
export function isOcularEligibleBooking(booking, mode = "schedule_new") {
  if (!booking || !booking._id) return false;

  // 1. Status Allowlist Check
  if (!ACTIONABLE_OCULAR_BOOKING_STATUSES.includes(booking.status)) {
    return false;
  }

  // 2. Event Date Check (must be valid, not in the past)
  if (!booking.event_date) return false;
  const eventDate = new Date(booking.event_date);
  if (isNaN(eventDate.getTime())) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (eventDate < startOfToday) return false;

  // 3. Opt-in Physical Site Inspection Check
  if (!requiresPhysicalSiteInspection(booking)) return false;

  // 4. Primary Ocular Status Validation
  const ocular = booking.ocular_visit || {};

  if (mode === "schedule_new") {
    // Ineligible if ocular visit is already completed or already scheduled
    if (ocular.status === "completed" && ocular.outcome === "proceed") return false;
    if (ocular.status === "scheduled" && ocular.scheduled_date) return false;
  } else if (mode === "reschedule") {
    // Reschedule allows existing scheduled or requested ocular visits
    if (ocular.status === "completed" && ocular.outcome === "cancel") return false;
  }

  return true;
}

/**
 * Filters an array of bookings based on ocular eligibility rules for the given mode.
 * 
 * @param {Array} bookings 
 * @param {String} mode - "schedule_new" | "reschedule"
 * @returns {Array}
 */
export function getEligibleOcularBookings(bookings, mode = "schedule_new") {
  if (!Array.isArray(bookings)) return [];
  return bookings.filter((b) => isOcularEligibleBooking(b, mode));
}
