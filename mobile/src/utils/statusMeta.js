/**
 * Status and Service Type Metadata Resolver for Mobile
 * Aligned 1:1 with frontend/src/components/customer/portal/statusMeta.js
 */
import { isSpecialOffer } from "./packageDisplay.js";

export const INQUIRY_STATUS_GROUPS = {
  pending_review: ["Pending Review", "Under Review", "Revision Requested"],
  quote_ready: ["Quotation Sent"],
  accepted: ["Quote Accepted", "Awaiting Final Confirmation"],
  cancelled: ["Cancelled", "Quote Rejected", "Expired"],
};

export const BOOKING_STATUS_GROUPS = {
  confirmed: [
    "confirmed",
    "converted to booking",
    "preparing",
    "food prep",
    "food preparation",
    "out for delivery",
    "in transit",
    "ready for delivery",
    "delivered",
    "ongoing",
    "ocular scheduled",
    "ready for event",
    "deposit_paid",
    "final payment pending",
  ],
  deposit_needed: ["deposit pending", "pending deposit", "customer_accepted"],
  completed: ["completed", "event completed"],
  cancelled: ["cancelled", "canceled", "rejected", "refunded"],
};

export const isPastDay = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return startOfDay < startOfToday;
};

export const isDepositConfirmed = (inquiry) => {
  return Boolean(
    inquiry?.payment_status === "deposit_paid" ||
    inquiry?.payment_status === "fully_paid" ||
    inquiry?.is_deposit_paid
  );
};

export const isConvertedBooking = (inquiry) => {
  return inquiry?.status === "Converted to Booking" || Boolean(inquiry?.converted_booking_id);
};

export const isCancelledInquiry = (inquiry) => {
  if (["Cancelled", "Quote Rejected", "Expired"].includes(inquiry?.status)) return true;
  if (inquiry?.event_date && isPastDay(inquiry.event_date) && !isConvertedBooking(inquiry)) return true;
  return false;
};

/**
 * Returns canonical inquiry status group:
 * 'pending_review' | 'quote_ready' | 'accepted' | 'cancelled' | 'converted'
 */
export const inquiryStatusGroup = (inquiry) => {
  if (!inquiry) return "pending_review";
  if (isConvertedBooking(inquiry)) return "converted";
  if (isCancelledInquiry(inquiry)) return "cancelled";

  const status = inquiry.status;

  // Accepted requires customer quotation acceptance AND confirmed deposit payment
  if (
    ["Quote Accepted", "Awaiting Final Confirmation"].includes(status) &&
    isDepositConfirmed(inquiry)
  ) {
    return "accepted";
  }

  // Quotation ready for customer or accepted pending deposit confirmation
  if (
    status === "Quotation Sent" ||
    ["Quote Accepted", "Awaiting Final Confirmation"].includes(status)
  ) {
    return "quote_ready";
  }

  // Default: Pending review (includes "Pending Review", "Under Review", "Revision Requested")
  return "pending_review";
};

/**
 * Returns canonical booking status group:
 * 'confirmed' | 'deposit_needed' | 'completed' | 'cancelled' | 'other'
 */
export const bookingStatusGroup = (booking) => {
  const raw = String(booking?.status || "").toLowerCase();
  const match = Object.entries(BOOKING_STATUS_GROUPS).find(([, values]) => values.includes(raw));
  if (match) return match[0];
  if (["deposit_paid", "final payment pending"].includes(raw)) return "confirmed";
  if (!["cancelled", "canceled", "rejected", "refunded", "completed", "event completed"].includes(raw)) {
    return "confirmed";
  }
  return "other";
};

/**
 * Canonical Service Type resolver used across Web and Mobile
 */
export const resolveServiceType = (record) => {
  if (!record) return "Custom Quote - Food and Event Setup";

  const pkg =
    record?.package_id && typeof record.package_id === "object"
      ? record.package_id
      : null;

  // Extract dynamic package/offer name if available
  const rawPkgName =
    record?.package_name_snapshot ||
    pkg?.name ||
    (typeof record?.package_name === "string" && !/^custom\b/i.test(record.package_name) ? record.package_name : null) ||
    record?.package_details?.name ||
    record?.package?.name ||
    null;

  // Special Offers: display ONLY the actual Special Offer name.
  const isOffer =
    record?.booking_type === "special" ||
    isSpecialOffer(pkg) ||
    pkg?.offer_type === "special" ||
    pkg?.booking_type === "special" ||
    Boolean(pkg?.is_special_offer) ||
    Boolean(record?.is_special_offer) ||
    (Array.isArray(pkg?.offer_food_items) && pkg.offer_food_items.length > 0) ||
    (Array.isArray(record?.offer_food_snapshot) && record.offer_food_snapshot.length > 0) ||
    record?.event_type === "Special Offer Catering" ||
    record?.event_type === "Special Offer Event" ||
    record?.service === "Special Offer";

  if (isOffer) {
    return rawPkgName || pkg?.name || "Special Offer";
  }

  // Check if explicitly custom inquiry
  const isExplicitCustom =
    record?.booking_type === "custom" ||
    record?.is_custom_setup === true;

  // Determine if package-based inquiry
  const hasPackageRef = Boolean(
    (record?.package_id && record.package_id !== "none") ||
    record?.had_package_selection ||
    rawPkgName
  );

  const isPackage =
    !isExplicitCustom &&
    (record?.booking_type === "regular" ||
     (hasPackageRef && record?.booking_type !== "custom"));

  if (isPackage) {
    const packageName = rawPkgName || pkg?.name || "Package";
    const foodExplicitlySkipped = record?.include_food === false;

    const hasSelectedMenu =
      !foodExplicitlySkipped &&
      Boolean(
        (Array.isArray(record?.selected_menu) && record.selected_menu.length > 0) ||
        (Array.isArray(record?.menu_items) && record.menu_items.length > 0) ||
        (Array.isArray(record?.selected_menu_items) && record.selected_menu_items.length > 0) ||
        (Array.isArray(pkg?.menu_items) && pkg.menu_items.length > 0)
      );

    if (hasSelectedMenu) {
      return `${packageName} + Menu`;
    }
    return packageName;
  }

  // --- CUSTOM QUOTE INQUIRY ---
  let cleanType = "Food and Event Setup";
  const raw = String(record?.service_type || "")
    .replace(/^Custom Quote\s*-\s*/i, "")
    .trim();

  const lower = raw.toLowerCase();
  if (lower === "food only" || lower === "food" || lower === "food_only") {
    cleanType = "Food Only";
  } else if (
    lower === "event setup only" ||
    lower === "setup only" ||
    lower === "event_only" ||
    lower === "setup"
  ) {
    cleanType = "Event Setup Only";
  } else if (
    lower === "food and event setup" ||
    lower === "food & setup" ||
    lower === "food_event" ||
    lower === "full" ||
    lower === "full_service"
  ) {
    cleanType = "Food and Event Setup";
  } else if (
    record?.event_type?.toLowerCase().includes("food delivery") ||
    (record?.delivery_method && record.delivery_method !== "setup")
  ) {
    cleanType = "Food Only";
  } else if (record?.include_food === false) {
    cleanType = "Event Setup Only";
  } else {
    cleanType = "Food and Event Setup";
  }

  return `Custom Quote - ${cleanType}`;
};

/** Friendly event title */
export const recordTitle = (record) => {
  if (!record) return "Catering Event";
  if (record.event_name) return record.event_name;
  const eventName = record?.event_type === "Other" ? record?.event_type_other : record?.event_type;
  const celebrant = record?.celebrant_name?.trim();
  if (celebrant) {
    if (eventName && celebrant.toLowerCase().includes(eventName.toLowerCase())) {
      return celebrant;
    }
    const suffix = celebrant.endsWith("s") || celebrant.endsWith("S") ? "'" : "'s";
    return `${celebrant}${suffix} ${eventName || "Event"}`;
  }
  const owner = record?.contact_first_name ? `${record.contact_first_name}'s ` : "";
  return `${owner}${eventName || "Catering Event"}`;
};
