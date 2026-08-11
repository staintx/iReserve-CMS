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
  Sparkles,
} from "lucide-react";

/**
 * Translates raw backend statuses into what a customer actually needs to know:
 * a semantic tone, a plain-English label, and a sentence explaining the state
 * (including "you don't need to do anything").
 *
 * Statuses only — no action wiring — so Dashboard, Inquiries and Bookings all
 * describe the same record identically.
 */

/** Service type is derived in several places; keep the rule in one function. */
export const resolveServiceType = (record) =>
  record?.service_type ||
  (record?.event_type?.toLowerCase().includes("food delivery") || record?.delivery_method !== "setup"
    ? "Food Only"
    : !record?.include_food
      ? "Event Setup Only"
      : "Food and Event Setup");

export const serviceIcon = (serviceType) => {
  if (serviceType === "Food Only") return Utensils;
  if (serviceType === "Event Setup Only") return Layers;
  return Sparkles;
};

/** Friendly label for the event itself, e.g. "Glenn's Wedding". */
export const recordTitle = (record) => {
  const eventName = record?.event_type === "Other" ? record?.event_type_other : record?.event_type;
  const owner = record?.contact_first_name ? `${record.contact_first_name}'s ` : "";
  return `${owner}${eventName || "Event"}`;
};

/* ── Bookings ─────────────────────────────────────────────────── */

export const BOOKING_STATUS_GROUPS = {
  confirmed: ["confirmed", "converted to booking", "preparing", "ongoing", "ocular scheduled"],
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
          ? { tone: "neutral", title: "Your date is reserved.", text: "The remaining balance is due before your event setup." }
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
    ? "The remaining balance is due before your event setup."
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
  quote_ready: ["Quotation Sent"],
  under_review: ["Pending Review", "Under Review", "Waiting for Customer", "Revision Requested"],
  accepted: ["Quote Accepted", "Awaiting Final Confirmation", "Converted to Booking"],
  closed: ["Cancelled", "Quote Rejected", "Expired"],
};

export const inquiryStatusGroup = (inquiry) => {
  const match = Object.entries(INQUIRY_STATUS_GROUPS).find(([, values]) => values.includes(inquiry?.status));
  return match ? match[0] : "other";
};

export const inquiryStatusMeta = (inquiry) => {
  switch (inquiry?.status) {
    case "Quotation Sent":
      return {
        tone: "info",
        label: "Quote Ready",
        icon: FileCheck2,
        notice: { tone: "info", title: "Your quote is ready.", text: "Review the pricing and accept it to continue to booking." },
      };

    case "Pending Review":
      return {
        tone: "warning",
        label: "Pending Review",
        icon: Clock,
        notice: { tone: "warning", title: "Inquiry Received — Pending Review", text: "Your inquiry has been submitted and is awaiting initial review by our team." },
      };

    case "Under Review":
      return {
        tone: "info",
        label: "Under Review",
        icon: Clock,
        notice: { tone: "info", title: "Under Review by Admin", text: "Our team is currently reviewing your event requirements, checking availability, and preparing your quotation." },
      };

    case "Waiting for Customer":
      return {
        tone: "warning",
        label: "Waiting for You",
        icon: Clock,
        notice: { tone: "warning", title: "We need a reply from you.", text: "Message our team so we can move your request forward." },
      };

    case "Revision Requested":
      return {
        tone: "warning",
        label: "Revision in Progress",
        icon: Clock,
        notice: { tone: "warning", title: "We're updating your quote.", text: "You'll be notified as soon as the revised quote is ready." },
      };

    case "Awaiting Final Confirmation":
      return {
        tone: "info",
        label: "Awaiting Confirmation",
        icon: Clock,
        notice: { tone: "info", title: "We're finalising your booking.", text: "Our team will confirm the last details with you shortly." },
      };

    case "Quote Accepted":
      return {
        tone: "success",
        label: "Quote Accepted",
        icon: CheckCircle2,
        notice: { tone: "success", title: "Your quote is accepted.", text: "Continue to your booking, or pay the deposit to reserve your date." },
      };

    case "Converted to Booking":
      return {
        tone: "success",
        label: "Booked",
        icon: CheckCircle2,
        notice: { tone: "success", title: "This request is now a booking.", text: "You can track it under My Bookings." },
      };

    case "Cancelled":
    case "Quote Rejected":
      return {
        tone: "danger",
        label: inquiry.status === "Quote Rejected" ? "Quote Declined" : "Cancelled",
        icon: XCircle,
        notice: { tone: "neutral", title: "This request is closed.", text: "Send a new request any time you're ready." },
      };

    case "Expired":
      return {
        tone: "neutral",
        label: "Expired",
        icon: Clock,
        notice: { tone: "neutral", title: "This request expired.", text: "Send a new request and we'll quote it again." },
      };

    default:
      return {
        tone: "neutral",
        label: inquiry?.status ? toTitleCase(inquiry.status) : "Submitted",
        icon: Clock,
        notice: null,
      };
  }
};

function toTitleCase(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
