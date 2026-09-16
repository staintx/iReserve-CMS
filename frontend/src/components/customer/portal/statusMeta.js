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
} from "lucide-react";

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

  // Check if explicitly custom inquiry
  const isExplicitCustom =
    record?.booking_type === "custom" ||
    record?.is_custom_setup === true;

  // Extract dynamic package name if available
  const rawPkgName =
    record?.package_name_snapshot ||
    pkg?.name ||
    (typeof record?.package_name === "string" && !/^custom\b/i.test(record.package_name) ? record.package_name : null) ||
    record?.package_details?.name ||
    record?.package?.name ||
    null;

  // Determine if package-based inquiry
  const hasPackageRef = Boolean(
    (record?.package_id && record.package_id !== "none") ||
    record?.had_package_selection ||
    rawPkgName
  );

  const isPackage =
    !isExplicitCustom &&
    (record?.booking_type === "regular" ||
     record?.booking_type === "special" ||
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
        (Array.isArray(record?.offer_food_snapshot) && record.offer_food_snapshot.length > 0) ||
        (Array.isArray(pkg?.menu_items) && pkg.menu_items.length > 0) ||
        (Array.isArray(pkg?.offer_food_items) && pkg.offer_food_items.length > 0)
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
  confirmed: ["confirmed", "converted to booking", "preparing", "ongoing", "ocular scheduled", "ready for event"],
  deposit_needed: ["deposit pending", "pending deposit", "customer_accepted"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export const bookingStatusGroup = (booking) => {
  const raw = (booking?.status || "").toLowerCase();
  const match = Object.entries(BOOKING_STATUS_GROUPS).find(([, values]) => values.includes(raw));
  return match ? match[0] : "other";
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

  if (raw === "preparing") {
    return {
      tone: "info",
      label: "Being Prepared",
      icon: ChefHat,
      notice: { tone: balance > 0 ? "neutral" : "info", title: "We're preparing your event.", text: nothingOrBalance },
    };
  }

  if (raw === "ongoing") {
    return { tone: "info", label: "Happening Now", icon: ChefHat, notice: null };
  }

  if (raw === "ready for event") {
    return {
      tone: "success",
      label: "Ready For Event",
      icon: CheckCircle2,
      notice: { tone: "success", title: "You're all set.", text: "Everything is prepared and ready for your event." },
    };
  }

  if (raw === "completed") {
    return {
      tone: "neutral",
      label: "Completed",
      icon: CheckCircle2,
      notice: { tone: "neutral", title: "This event is complete.", text: "Thank you for celebrating with us." },
    };
  }

  if (raw === "cancelled") {
    return {
      tone: "danger",
      label: "Cancelled",
      icon: XCircle,
      notice: { tone: "neutral", title: "This booking was cancelled.", text: "Message us if you'd like to rebook." },
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
  return ["Cancelled", "Quote Rejected", "Expired"].includes(inquiry?.status);
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
    return {
      group: "cancelled",
      tone: "danger",
      label: "Cancelled",
      icon: XCircle,
      notice: {
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
    return {
      group: "quote_ready",
      tone: isAcceptedPendingDeposit ? "warning" : "info",
      label: "Quotation ready",
      icon: FileCheck2,
      notice: isAcceptedPendingDeposit
        ? {
            tone: "warning",
            title: "Quotation accepted · Awaiting deposit",
            text: "Please complete the required deposit payment to confirm your booking.",
          }
        : {
            tone: "info",
            title: "Your quotation is ready.",
            text: "Review the pricing and accept it to continue to booking.",
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
