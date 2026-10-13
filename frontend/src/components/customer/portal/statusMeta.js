import {
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  CalendarCheck,
  ChefHat,
  FileCheck2,
  Utensils,
  Layers,
  PartyPopper,
  Truck,
} from "lucide-react";
import { isSpecialOffer } from "../../../lib/specialOffers";
import { isBookingAwaitingDeposit } from "../../../utils/bookingDeposit";

/**
 * Translates raw backend statuses into what a customer actually needs to know:
 * a semantic tone, a plain-English label, and a sentence explaining the state
 * (including "you don't need to do anything").
 *
 * Statuses only — no action wiring — so Dashboard, Inquiries and Bookings all
 * describe the same record identically.
 */


/**
 * Canonical Service Type resolver used across all customer and admin surfaces.
 *
 * Rules:
 * FOR SPECIAL OFFERS:
 *  - Display ONLY the actual Special Offer name: `<Special Offer Name>` (e.g. "Student Budget Menu")
 *  - The "+ Menu" indicator does NOT appear for Special Offers (only applicable to regular Packages).
 *
 * FOR PACKAGE-BASED INQUIRIES:
 *  - Customer selected a package WITHOUT a menu: `<Package Name>` (e.g. "Birthday Package 1")
 *  - Customer selected a package AND added a menu: `<Package Name> + Menu` (e.g. "Birthday Package 1 + Menu")
 *  - "+ Menu" only appears when the customer actually selected/added dishes/menu items.
 *  - Never return "Food Only", "Event Setup Only", or "Food and Event Setup" for package-based inquiries.
 *
 * FOR CUSTOM QUOTE INQUIRIES:
 *  - Always prefix with "Custom Quote - ":
 *    → "Custom Quote - Food Only"
 *    → "Custom Quote - Event Setup Only"
 *    → "Custom Quote - Food and Event Setup"
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
  // The "+ Menu" indicator/option should NOT appear for Special Offers as it only applies to regular Packages.
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

    // Check if customer actually selected / added a menu
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

export const serviceIcon = (serviceType) => {
  const norm = String(serviceType || "").replace(/^Custom Quote\s*-\s*/i, "").trim();
  if (norm === "Food Only") return Utensils;
  if (norm === "Event Setup Only" || norm === "Regular Package" || (!norm.includes("+ Menu") && !norm.startsWith("Custom Quote"))) return Layers;
  return PartyPopper;
};

/** Helpers for service type differentiation */
export const isFoodOnly = (serviceType) => {
  const norm = String(serviceType || "").replace(/^Custom Quote\s*-\s*/i, "").trim().toLowerCase();
  return norm === "food only" || norm === "food";
};

export const isSetupOnly = (serviceType) => {
  const norm = String(serviceType || "").replace(/^Custom Quote\s*-\s*/i, "").trim().toLowerCase();
  return norm === "event setup only" || norm === "setup only" || norm === "setup";
};

export const isOcularRequired = (serviceType) => !isFoodOnly(serviceType);
export const isCoordinatorRequired = (serviceType) => !isFoodOnly(serviceType);
export const isMenuRequired = (serviceType) => !isSetupOnly(serviceType);

/** Friendly label for the event itself, e.g. "Sarah's Birthday", "John & Maria's Wedding", or "Glenn's Wedding". */
export const recordTitle = (record) => {
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
  return `${owner}${eventName || "Event"}`;
};

/* ── Bookings ─────────────────────────────────────────────────── */

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

export const bookingStatusGroup = (booking) => {
  const raw = (booking?.status || "").toLowerCase();
  const match = Object.entries(BOOKING_STATUS_GROUPS).find(([, values]) => values.includes(raw));
  if (match) return match[0];
  if (["deposit_paid", "final payment pending"].includes(raw)) return "confirmed";
  if (!isBookingAwaitingDeposit(booking) && !["cancelled", "canceled", "rejected", "refunded", "completed", "event completed"].includes(raw)) {
    return "confirmed";
  }
  return "other";
};

/**
 * @param {object} booking
 * @param {{ balance?: number }} money outstanding balance, so the wording can
 *   distinguish "reserved, still to pay" from "reserved, nothing to do".
 */
export const bookingStatusMeta = (booking, { balance = 0 } = {}) => {
  const raw = (booking?.status || "").toLowerCase();

  if (["confirmed", "converted to booking"].includes(raw)) {
    return {
      tone: "success",
      label: "Confirmed & Reserved",
      icon: CheckCircle2,
      // A reserved booking with a balance is good news with a future task, not
      // a warning — it stays quiet and lets the amber amount and Pay button
      // carry the money signal. Amber is reserved for what's urgent now.
      notice:
        balance > 0
          ? { tone: "neutral", title: "Your date is reserved.", text: "The remaining balance is due the same day after your event has been completed." }
          : { tone: "success", title: "Your date is reserved.", text: "Everything is paid — nothing is needed from you right now." },
    };
  }

  if (["deposit pending", "pending deposit", "customer_accepted"].includes(raw)) {
    return {
      tone: "warning",
      label: "Deposit Needed",
      icon: CreditCard,
      notice: { tone: "warning", title: "Deposit needed.", text: "Pay the deposit to lock in your event date." },
    };
  }

  // Once an event is reserved, the only thing that can still be owed is money —
  // so the closing sentence depends on the balance, never on the stage.
  const nothingOrBalance = balance > 0
    ? "The remaining balance is due the same day after your event has been completed."
    : "No action is needed from you right now.";

  if (raw === "ocular scheduled") {
    return {
      tone: "info",
      label: "Site Visit Scheduled",
      icon: CalendarCheck,
      notice: { tone: "info", title: "Site visit scheduled.", text: `We'll meet you at your venue on the agreed date. ${nothingOrBalance}` },
    };
  }

  if (["out for delivery", "in transit", "ready for delivery"].includes(raw)) {
    return {
      tone: "info",
      label: "Out for Delivery",
      icon: Truck,
      notice: {
        tone: "info",
        title: "Your food order is on the way!",
        text: `Our delivery courier has been dispatched to your drop-off location. ${nothingOrBalance}`
      },
    };
  }

  if (["preparing", "food prep", "food preparation"].includes(raw)) {
    return {
      tone: "info",
      label: "Food Prep in Progress",
      icon: ChefHat,
      notice: {
        tone: balance > 0 ? "neutral" : "info",
        title: "We're preparing your food in the kitchen.",
        text: `Our culinary team is actively preparing and packing your party trays. ${nothingOrBalance}`
      },
    };
  }

  if (raw === "ongoing") {
    const isPast = (() => {
      if (!booking?.event_date) return false;
      const d = new Date(booking.event_date);
      if (Number.isNaN(d.getTime())) return false;
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return new Date() > endOfDay;
    })();

    if (isPast) {
      return {
        tone: "neutral",
        label: "Concluded",
        icon: CheckCircle2,
        notice: balance > 0
          ? { tone: "warning", title: "Balance remaining.", text: "Your event has concluded. Please settle your remaining balance." }
          : null,
      };
    }
    return { tone: "info", label: "Happening Now", icon: ChefHat, notice: null };
  }

  if (raw === "pending completion") {
    return {
      tone: balance > 0 ? "warning" : "neutral",
      label: "Pending Completion",
      icon: CheckCircle2,
      notice: balance > 0
        ? { tone: "warning", title: "Event concluded. Remaining balance due.", text: "Your event has concluded. Please settle your remaining balance to complete your booking." }
        : { tone: "neutral", title: "Event concluded.", text: "Your event has concluded. Our team is finalizing equipment and billing wrap-up." },
    };
  }

  if (["ready for event", "delivered"].includes(raw)) {
    return {
      tone: "success",
      label: raw === "delivered" ? "Delivered" : "Ready For Event",
      icon: CheckCircle2,
      notice: {
        tone: "success",
        title: raw === "delivered" ? "Food order delivered!" : "You're all set.",
        text: raw === "delivered" ? `Your order has arrived at the venue. ${nothingOrBalance}` : "Everything is prepared and ready for your event."
      },
    };
  }

  if (["completed", "event completed"].includes(raw)) {
    return {
      tone: "neutral",
      label: "Completed",
      icon: CheckCircle2,
      notice: balance > 0
        ? { tone: "warning", title: "Balance remaining.", text: "Please settle your remaining balance." }
        : null,
    };
  }

  if (["cancelled", "canceled", "rejected", "refunded"].includes(raw)) {
    const penaltyAmt = Number(booking?.cancellation_penalty_amount || 0);
    const penaltyReason = booking?.cancellation_penalty_reason || booking?.cancellation_reason || booking?.cancellation_request?.admin_notes || "";
    const isRefunded = raw === "refunded" || booking?.payment_status === "refunded";

    let notice = null;
    if (penaltyAmt > 0) {
      notice = {
        tone: "danger",
        title: "Reservation Cancelled — Deposit Forfeited",
        text: penaltyReason
          ? `In accordance with our Cancellation Policy, collected payment of ₱${penaltyAmt.toLocaleString("en-PH")} was forfeited as a penalty (${penaltyReason}).`
          : `In accordance with our Cancellation Policy, collected payment of ₱${penaltyAmt.toLocaleString("en-PH")} was forfeited to cover reservation and preparation costs.`,
      };
    } else if (isRefunded) {
      notice = {
        tone: "info",
        title: "Reservation Cancelled & Refunded",
        text: "Your reservation was cancelled and an eligible refund has been processed to your account.",
      };
    } else if (penaltyReason) {
      notice = {
        tone: "neutral",
        title: "Reservation Cancelled",
        text: `Reason: ${penaltyReason}`,
      };
    }

    return {
      tone: "danger",
      label: raw === "refunded" ? "Refunded" : "Cancelled",
      icon: XCircle,
      notice,
    };
  }

  if (booking?.ocular_visit?.outcome === "revise") {
    return {
      tone: "warning",
      label: "Revision Requested (Ocular)",
      icon: CalendarCheck,
      notice: { tone: "warning", title: "Site visit complete — Revision requested.", text: "Based on our site inspection and venue measurement, an updated setup proposal is awaiting your review." },
    };
  }

  if (booking?.ocular_visit?.status === "requested") {
    return {
      tone: "info",
      label: "Site Visit Requested",
      icon: CalendarCheck,
      notice: { tone: "info", title: "Site visit requested.", text: "We'll confirm your preferred schedule shortly." },
    };
  }

  return {
    tone: "neutral",
    label: booking?.status ? toTitleCase(booking.status) : "In Progress",
    icon: Clock,
    notice: null,
  };
};

/* ── Inquiries ────────────────────────────────────────────────── */

export const INQUIRY_STATUS_GROUPS = {
  pending_review: ["Pending Review", "Under Review", "Revision Requested"],
  quote_ready: ["Quotation Sent"],
  accepted: ["Quote Accepted", "Awaiting Final Confirmation"],
  cancelled: ["Cancelled", "Quote Rejected", "Expired"],
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

export const inquiryStatusMeta = (inquiry) => {
  const group = inquiryStatusGroup(inquiry);

  if (group === "converted") {
    return {
      group: "converted",
      tone: "success",
      label: "Booked",
      icon: CheckCircle2,
      notice: {
        tone: "success",
        title: "This request is now a booking.",
        text: "You can track and manage this event under My Bookings.",
      },
    };
  }

  if (group === "cancelled") {
    const isExpired = inquiry?.status === "Expired" || (inquiry?.event_date && isPastDay(inquiry.event_date));
    return {
      group: "cancelled",
      tone: isExpired ? "neutral" : "danger",
      label: isExpired ? "Expired" : "Cancelled",
      icon: isExpired ? Clock : XCircle,
      notice: isExpired
        ? {
            tone: "neutral",
            title: "This inquiry has expired.",
            text: "The requested event date has passed without confirmation. You can submit a new inquiry whenever you're ready.",
          }
        : {
            tone: "neutral",
            title: "This request is closed.",
            text: "Send a new request any time you're ready.",
          },
    };
  }

  if (group === "accepted") {
    return {
      group: "accepted",
      tone: "success",
      label: "Accepted",
      icon: CheckCircle2,
      notice: {
        tone: "success",
        title: "Quotation accepted & deposit confirmed.",
        text: "Your deposit payment has been confirmed. Our team is finalizing your booking.",
      },
    };
  }

  if (group === "quote_ready") {
    const isAcceptedPendingDeposit = ["Quote Accepted", "Awaiting Final Confirmation"].includes(inquiry?.status);
    if (isAcceptedPendingDeposit) {
      return {
        group: "quote_ready",
        tone: "warning",
        label: "Quote Accepted · Deposit Due",
        actionRequired: true,
        actionLabel: "Deposit Required",
        icon: Clock,
        notice: {
          tone: "warning",
          title: "Quotation accepted · Deposit required",
          text: "Please complete the required deposit payment to secure your event date on our calendar.",
        },
      };
    }

    return {
      group: "quote_ready",
      tone: "info",
      label: "Quotation Ready",
      actionRequired: true,
      actionLabel: "Action Required",
      icon: FileCheck2,
      notice: {
        tone: "info",
        title: "Your quotation is ready.",
        text: "Review the itemized proposal to lock your pricing.",
      },
    };
  }

  // group === "pending_review"
  const isRevision = inquiry?.status === "Revision Requested";
  return {
    group: "pending_review",
    tone: "warning",
    label: "Pending review",
    icon: Clock,
    notice: isRevision
      ? {
          tone: "warning",
          title: "Revision in progress.",
          text: "Our team is reviewing your requested revisions and will prepare an updated quotation.",
        }
      : {
          tone: "warning",
          title: "Inquiry received — Pending review",
          text: "Your inquiry has been submitted and is awaiting initial review by our team.",
        },
  };
};

function toTitleCase(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
