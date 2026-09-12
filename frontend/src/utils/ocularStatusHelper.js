import { requiresPhysicalSiteInspection } from "./ocularEligibility.js";
import { formatEventDate } from "./format.js";

/**
 * Returns standardized ocular action/status metadata for any booking.
 * Dynamically computes next action states:
 * - "action_required": Ocular needed but not yet scheduled
 * - "requested": Customer requested date, pending admin confirmation
 * - "scheduled": Ocular visit is confirmed on a specific date
 * - "completed": Ocular inspection completed
 * - null: Not applicable (e.g. food delivery/pickup, ocular skipped, or cancelled)
 *
 * @param {Object} booking 
 * @returns {Object|null}
 */
export function getBookingOcularActionMeta(booking) {
  if (!booking) return null;

  const rawStatus = (booking.status || "").toLowerCase();
  if (["cancelled", "refunded"].includes(rawStatus)) {
    return null;
  }

  // If ocular was explicitly skipped by the customer, no action is needed
  if (booking.ocular_visit?.status === "skipped") {
    return null;
  }

  // 1. Ocular is completed
  if (booking.ocular_visit?.status === "completed") {
    return {
      state: "completed",
      tone: "success",
      badgeText: "Ocular Completed",
      headline: "COMPLETED",
      subheadline: "Ocular inspection completed",
      description: "Site inspection has been completed and venue logistics are verified.",
      dotColor: "bg-emerald-500",
      isActionRequired: false,
      scheduledDate: booking.ocular_visit?.scheduled_date,
      scheduledTime: booking.ocular_visit?.scheduled_time,
    };
  }

  // 2. Ocular is scheduled with confirmed date/time
  const isOcularScheduled =
    booking.ocular_visit?.status === "scheduled" ||
    rawStatus === "ocular scheduled" ||
    Boolean(booking.ocular_visit?.scheduled_date && booking.ocular_visit?.status !== "pending" && booking.ocular_visit?.status !== "requested");

  if (isOcularScheduled) {
    const dateFormatted = booking.ocular_visit?.scheduled_date
      ? formatEventDate(booking.ocular_visit.scheduled_date)
      : "";
    const timeStr = booking.ocular_visit?.scheduled_time || "";

    return {
      state: "scheduled",
      tone: "info",
      badgeText: dateFormatted ? `Ocular Scheduled — ${dateFormatted}` : "Ocular Scheduled",
      headline: "OCULAR SCHEDULED",
      subheadline: dateFormatted ? `Ocular scheduled for ${dateFormatted}` : "Ocular visit scheduled",
      description: dateFormatted
        ? `Site inspection confirmed for ${dateFormatted}${timeStr ? ` at ${timeStr}` : ""}. Our team will meet you at the venue.`
        : "Site inspection confirmed with our team.",
      dotColor: "bg-blue-600",
      isActionRequired: false,
      scheduledDate: booking.ocular_visit?.scheduled_date,
      scheduledTime: timeStr,
    };
  }

  // 3. Ocular was requested by customer and is pending catering team review
  if (booking.ocular_visit?.status === "requested") {
    const dateFormatted = booking.ocular_visit?.scheduled_date
      ? formatEventDate(booking.ocular_visit.scheduled_date)
      : "";

    return {
      state: "requested",
      tone: "warning",
      badgeText: "Ocular Requested — Under Review",
      headline: "NEXT STEP",
      subheadline: "Ocular visit requested — pending review",
      description: dateFormatted
        ? `Your requested site visit for ${dateFormatted} is under review by our catering team.`
        : "Your requested site visit schedule is under review by our catering team.",
      dotColor: "bg-amber-500",
      isActionRequired: false,
      scheduledDate: booking.ocular_visit?.scheduled_date,
      scheduledTime: booking.ocular_visit?.scheduled_time,
    };
  }

  // 4. Check if the booking requires an ocular visit
  const requiresOcular = requiresPhysicalSiteInspection(booking);
  if (!requiresOcular) {
    return null;
  }

  // If the booking itself is already marked completed, don't show action required
  if (rawStatus === "completed") {
    return null;
  }

  // 5. Action Required: Confirmed booking where ocular needs to be scheduled
  return {
    state: "action_required",
    tone: "action_required",
    badgeText: "Action Required — Ocular visit needed",
    headline: "NEXT STEP",
    subheadline: "Ocular visit needs to be scheduled",
    description: "An ocular visit needs to be scheduled with our team before your event setup.",
    dotColor: "bg-orange-500",
    isActionRequired: true,
  };
}

export { requiresPhysicalSiteInspection };
