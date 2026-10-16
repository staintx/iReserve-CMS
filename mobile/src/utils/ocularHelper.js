/**
 * Ocular Visit Utilities for Mobile
 * Aligned 1:1 with frontend/src/utils/ocularEligibility.js, ocularStatusHelper.js, and bookingDeposit.js
 */

export const ACTIONABLE_OCULAR_BOOKING_STATUSES = [
  "Deposit Pending",
  "deposit pending",
  "pending deposit",
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

export const PRE_DEPOSIT_BOOKING_STATUSES = [
  "deposit pending",
  "pending deposit",
  "customer_accepted",
];

export const DEPOSIT_SETTLED_PAYMENT_STATUSES = [
  "deposit_paid",
  "fully_paid",
  "partially_paid",
  "refund_requested",
  "refunded",
];

/**
 * True while the booking is still waiting for its initial reservation deposit.
 * Mirrors backend/src/utils/bookingDeposit.js
 */
export function isBookingAwaitingDeposit(booking) {
  if (!booking) return false;
  const status = String(booking.status || "").toLowerCase();
  if (!PRE_DEPOSIT_BOOKING_STATUSES.includes(status)) return false;
  return !DEPOSIT_SETTLED_PAYMENT_STATUSES.includes(booking.payment_status);
}

/**
 * Opt-In Physical Site Inspection Check
 * Default is FALSE unless positive evidence of physical site setup,
 * equipment logistics, or ocular_visit.is_required === true is established.
 */
export function requiresPhysicalSiteInspection(booking) {
  if (!booking) return false;

  // 1. Explicit override
  if (booking.ocular_visit?.is_required === true) {
    return true;
  }

  const deliveryMethod = String(booking.delivery_method || "").toLowerCase();
  const rawServiceType = String(booking.service_type || "").trim().toLowerCase();
  const eventType = String(booking.event_type || "").toLowerCase();

  const isFoodOnly =
    rawServiceType === "food only" ||
    rawServiceType === "food" ||
    rawServiceType === "food_only";

  const isSetupOrFull =
    rawServiceType.includes("setup") ||
    rawServiceType.includes("full") ||
    rawServiceType === "food and event setup" ||
    rawServiceType === "event setup only";

  if (deliveryMethod === "pickup") return false;
  if (isFoodOnly && deliveryMethod !== "setup") return false;
  if (eventType.includes("food delivery") && !isSetupOrFull && deliveryMethod !== "setup") return false;

  // Positive setup/equipment indicators -> ELIGIBLE
  if (
    deliveryMethod === "setup" ||
    isSetupOrFull ||
    (Array.isArray(booking.service_items) && booking.service_items.length > 0)
  ) {
    return true;
  }

  return false;
}

/**
 * Parses date string or Date object into YYYY-MM-DD
 */
export const toDateKey = (val) => {
  if (!val) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Calculates selectable date range and scheduling constraints for an ocular visit.
 */
export function getOcularDateLimits(booking) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  // Minimum allowed date: Tomorrow (today + 1 day)
  const minAllowedDate = new Date(today);
  minAllowedDate.setDate(minAllowedDate.getDate() + 1);
  const minAllowedDateKey = toDateKey(minAllowedDate);

  const eventDateObj = booking?.event_date ? new Date(booking.event_date) : null;
  const isWedding = Boolean(
    String(booking?.event_type || "").toLowerCase().includes("wedding") ||
    String(booking?.package_name || "").toLowerCase().includes("wedding") ||
    String(booking?.package_id?.name || "").toLowerCase().includes("wedding")
  );

  let maxAllowedDate = null;
  let maxAllowedDateKey = "";

  if (eventDateObj && !isNaN(eventDateObj.getTime())) {
    maxAllowedDate = new Date(eventDateObj);
    maxAllowedDate.setHours(0, 0, 0, 0);
    // Weddings: at least 7 days before event date; others: 1 day before
    const daysPrior = isWedding ? 7 : 1;
    maxAllowedDate.setDate(maxAllowedDate.getDate() - daysPrior);
    maxAllowedDateKey = toDateKey(maxAllowedDate);
  }

  const hasAvailableDates = Boolean(
    maxAllowedDateKey ? minAllowedDateKey <= maxAllowedDateKey : true
  );

  return {
    todayKey,
    minAllowedDate,
    minAllowedDateKey,
    maxAllowedDate,
    maxAllowedDateKey,
    isWedding,
    hasAvailableDates,
  };
}

/**
 * Standardized metadata resolver for customer booking ocular visit state.
 */
export function getBookingOcularActionMeta(booking) {
  if (!booking) return null;

  const rawStatus = String(booking.status || "").toLowerCase();
  if (["cancelled", "canceled", "rejected", "refunded"].includes(rawStatus)) {
    return null;
  }

  // 1. Explicitly skipped
  if (booking.ocular_visit?.status === "skipped") {
    return {
      state: "skipped",
      tone: "neutral",
      badgeText: "Ocular Skipped",
      headline: "OPTIONAL",
      subheadline: "Ocular inspection was skipped",
      description: "Site ocular inspection was skipped by customer request. Event preparation will proceed based on venue specifications.",
      isActionRequired: false,
      canReschedule: true,
    };
  }

  // 2. Completed
  if (booking.ocular_visit?.status === "completed") {
    return {
      state: "completed",
      tone: "success",
      badgeText: "Ocular Completed",
      headline: "COMPLETED",
      subheadline: "Ocular inspection completed",
      description: "Site inspection has been completed and venue logistics are verified.",
      outcome: booking.ocular_visit?.outcome || "Proceed",
      notes: booking.ocular_visit?.notes || "",
      isActionRequired: false,
      scheduledDate: booking.ocular_visit?.scheduled_date,
      scheduledTime: booking.ocular_visit?.scheduled_time,
    };
  }

  // 3. Scheduled / Confirmed
  const isScheduled =
    booking.ocular_visit?.status === "scheduled" ||
    rawStatus === "ocular scheduled" ||
    Boolean(
      booking.ocular_visit?.scheduled_date &&
      booking.ocular_visit?.status !== "pending" &&
      booking.ocular_visit?.status !== "requested"
    );

  if (isScheduled) {
    return {
      state: "scheduled",
      tone: "info",
      badgeText: "Ocular Scheduled",
      headline: "OCULAR SCHEDULED",
      subheadline: "Ocular visit scheduled",
      description: "Site inspection confirmed with our team. Our coordinator will meet you at the venue.",
      notes: booking.ocular_visit?.notes || "",
      isActionRequired: false,
      canReschedule: true,
      scheduledDate: booking.ocular_visit?.scheduled_date,
      scheduledTime: booking.ocular_visit?.scheduled_time || "",
    };
  }

  // 4. Requested by customer, pending review
  if (booking.ocular_visit?.status === "requested") {
    return {
      state: "requested",
      tone: "warning",
      badgeText: "Ocular Requested — Pending Review",
      headline: "NEXT STEP",
      subheadline: "Ocular visit requested — pending review",
      description: "Your requested site visit schedule is under review by our catering coordinator.",
      notes: booking.ocular_visit?.notes || "",
      isActionRequired: false,
      canReschedule: true,
      scheduledDate: booking.ocular_visit?.scheduled_date,
      scheduledTime: booking.ocular_visit?.scheduled_time || "",
    };
  }

  // 5. Check if physical site inspection is applicable
  const requiresOcular = requiresPhysicalSiteInspection(booking);
  if (!requiresOcular) {
    return {
      state: "not_required",
      tone: "neutral",
      badgeText: "Ocular Not Required",
      headline: "DELIVERY",
      subheadline: "On-site inspection not required",
      description: "An on-site ocular inspection is not required for this delivery booking. Food will be delivered packed and warm to your location.",
      isActionRequired: false,
    };
  }

  if (rawStatus === "completed" || rawStatus === "event completed") {
    return null;
  }

  if (isBookingAwaitingDeposit(booking)) {
    return {
      state: "awaiting_deposit",
      tone: "warning",
      badgeText: "Deposit Required First",
      headline: "DEPOSIT NEEDED",
      subheadline: "Deposit required before ocular scheduling",
      description: "Please pay the required reservation deposit first. An ocular visit can only be scheduled once your booking is confirmed.",
      isActionRequired: false,
    };
  }

  // 6. Action Required: Confirmed booking where ocular needs scheduling
  return {
    state: "action_required",
    tone: "action_required",
    badgeText: "Action Required — Ocular Needed",
    headline: "NEXT STEP",
    subheadline: "Schedule venue ocular inspection",
    description: "An on-site inspection ensures electrical outlets, table layout, and setup boundaries match your expectations.",
    isActionRequired: true,
    canSkip: !booking.ocular_visit?.is_required,
  };
}
