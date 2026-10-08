/**
 * Shared receipt helper utilities for iReserve Customer & Admin payment receipts.
 * Standardizes formatting, data extraction, and business logic without hardcoded fake data.
 */

/**
 * Format currency in Philippine Peso (₱).
 */
export const formatReceiptCurrency = (val, { isRefund = false } = {}) => {
  const num = Math.abs(Number(val) || 0);
  const formatted = "₱" + num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isRefund ? `-${formatted}` : formatted;
};

/**
 * Format date & time (e.g., "Oct 8, 2026, 01:45 PM").
 */
export const formatReceiptDateTime = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

/**
 * Format event date (e.g., "Oct 8, 2026" or "October 8, 2026").
 */
export const formatReceiptEventDate = (dateStr, { long = false } = {}) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: long ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Generate official receipt or refund voucher number.
 */
export const getReceiptNumber = (payment) => {
  if (!payment?._id) return "REC-00000000";
  const isRefund = String(payment.payment_type || "").toLowerCase() === "refund";
  const prefix = isRefund ? "VCH-" : "REC-";
  return `${prefix}${String(payment._id).slice(-8).toUpperCase()}`;
};

/**
 * Resolve standardized milestone / payment type labels.
 */
export const getReceiptMilestoneLabel = (type) => {
  const t = String(type || "").toLowerCase().trim();
  if (t === "deposit") return "Initial Deposit Payment";
  if (t === "balance") return "Final Balance Payment";
  if (t === "full") return "Full Payment (100%)";
  if (t === "additional") return "Additional Charge";
  if (t === "refund") return "Official Refund Voucher";
  return "Event Payment";
};

/**
 * Resolve human-readable payment method description.
 */
export const getReceiptPaymentMethod = (payment) => {
  const m = String(payment?.method || payment?.payment_method || "").toLowerCase().trim();
  if (m.includes("gcash") || m === "e-wallet") return "GCash";
  if (m.includes("maya") || m.includes("paymaya")) return "Maya";
  if (m.includes("card") || m.includes("credit") || m.includes("debit")) return "Credit / Debit Card";
  if (m.includes("bank")) return "Bank Transfer";
  if (m.includes("cash")) return "Cash Onsite";
  if (m === "paymongo" || m === "online") return "Online (PayMongo)";
  if (m === "manual") return "Manual / Cash";
  if (!m) return "Online Payment";
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/**
 * Extract payer details safely from payment, booking, or inquiry objects.
 */
export const getReceiptCustomerDetails = (payment, booking = null) => {
  if (!payment) return { name: "Customer", email: null, phone: null };

  const custObj = payment.customer_id && typeof payment.customer_id === "object" ? payment.customer_id : {};
  const bookObj = booking || (payment.booking_id && typeof payment.booking_id === "object" ? payment.booking_id : {});
  const inqObj = payment.inquiry_id && typeof payment.inquiry_id === "object" ? payment.inquiry_id : {};

  const name =
    custObj.full_name ||
    [custObj.first_name, custObj.last_name].filter(Boolean).join(" ") ||
    [bookObj.contact_first_name, bookObj.contact_last_name].filter(Boolean).join(" ") ||
    [inqObj.contact_first_name, inqObj.contact_last_name].filter(Boolean).join(" ") ||
    "Customer";

  const email =
    custObj.email ||
    bookObj.contact_email ||
    inqObj.contact_email ||
    null;

  const phone =
    custObj.phone ||
    custObj.alt_phone ||
    bookObj.contact_phone ||
    bookObj.contact_alt_phone ||
    inqObj.contact_phone ||
    inqObj.contact_alt_phone ||
    null;

  return { name, email, phone };
};

/**
 * Extract booking and event details safely from payment, booking, or inquiry.
 */
export const getReceiptBookingDetails = (payment, booking = null) => {
  if (!payment) return { bookingRef: "N/A", eventType: null, packageName: null, eventDate: null };

  const b = booking || (payment.booking_id && typeof payment.booking_id === "object" ? payment.booking_id : {});
  const inq = payment.inquiry_id && typeof payment.inquiry_id === "object" ? payment.inquiry_id : {};

  const bookingRef =
    b.reference ||
    inq.reference ||
    (b._id ? `BK-${String(b._id).slice(-6).toUpperCase()}` : null) ||
    "N/A";

  const eventType = b.event_type || inq.event_type || null;
  const packageName = b.package_name_snapshot || b.package_id?.name || inq.package_name_snapshot || null;
  const eventDate = b.event_date || inq.event_date || null;

  return { bookingRef, eventType, packageName, eventDate };
};

/**
 * Official client business name standardized across all customer and admin receipts.
 */
export const OFFICIAL_BUSINESS_NAME = "Caezelle's Food, Catering & Services";

/**
 * Resolve dynamic business information without hardcoding fake fallback data.
 */
export const getReceiptBusinessInfo = (businessInfo = {}) => {
  const b = businessInfo || {};
  return {
    name: OFFICIAL_BUSINESS_NAME,
    subline: null,
    address: b.address?.trim() || null,
    phone: b.contact_number?.trim() || null,
    email: b.email?.trim() || null,
  };
};

/**
 * Resolve authorized signatory data from existing authorized signatory sources.
 * If no authorized signatory source exists on the record, returns name: null
 * so the signature area is rendered as an unsigned signature line / place for manual signing,
 * rather than displaying the logged-in user's name.
 */
export const getReceiptSignatory = (payment, booking = null) => {
  // 1. Check payment metadata if recorded_by, processed_by, approved_by, or signatory_name was saved
  const meta = payment?.metadata || {};
  const recordedBy =
    meta.signatory_name ||
    meta.recorded_by ||
    meta.processed_by ||
    meta.approved_by ||
    null;

  if (recordedBy && typeof recordedBy === "string" && recordedBy.trim()) {
    return {
      name: recordedBy.trim(),
      role: meta.signatory_role?.trim() || "Authorized Signatory",
    };
  }

  // 2. Check if the booking's quotation has an authorized signatory recorded
  const qAuth = booking?.quotation_id?.authorized_by;
  if (qAuth?.full_name && typeof qAuth.full_name === "string" && qAuth.full_name.trim()) {
    return {
      name: qAuth.full_name.trim(),
      role: "Authorized Management Signatory",
    };
  }

  // 3. If no authorized signatory source exists on the record, return null for an unsigned signature line
  return { name: null, role: "Authorized Signature" };
};
