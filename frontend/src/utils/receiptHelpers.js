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
  const isRefund =
    String(payment.payment_type || "").toLowerCase() === "refund" ||
    Number(payment.amount) < 0;
  const prefix = isRefund ? "VCH-" : "REC-";
  return `${prefix}${String(payment._id).slice(-8).toUpperCase()}`;
};

/**
 * Resolve standardized milestone / payment type labels.
 */
export const getReceiptMilestoneLabel = (type) => {
  const t = String(type || "").toLowerCase().trim();
  if (t === "deposit") return "Initial Deposit Payment";
  if (t === "balance" || t === "final") return "Final Balance Payment";
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
  if (m.includes("cash")) return "Cash Payment";
  if (m === "paymongo" || m === "online") return "Online (PayMongo)";
  if (m === "manual") return "Manual / Cash";
  if (!m) return "Online Payment";
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/**
 * Extract payer details safely from payment, booking, or inquiry objects.
 */
export const getReceiptCustomerDetails = (payment, booking = null) => {
  if (!payment) return { name: "Customer", email: null, phone: null, address: null };

  const custObj = payment.customer_id && typeof payment.customer_id === "object" ? payment.customer_id : {};
  const bookObj = booking || (payment.booking_id && typeof payment.booking_id === "object" ? payment.booking_id : {});
  const inqObj = payment.inquiry_id && typeof payment.inquiry_id === "object" ? payment.inquiry_id : {};

  const name =
    custObj.full_name ||
    [custObj.first_name, custObj.last_name].filter(Boolean).join(" ") ||
    [bookObj.contact_first_name, bookObj.contact_last_name].filter(Boolean).join(" ") ||
    [inqObj.contact_first_name, inqObj.contact_last_name].filter(Boolean).join(" ") ||
    "Valued Customer";

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

  const addressParts = [
    custObj.address,
    custObj.street || bookObj.street || inqObj.street,
    custObj.barangay || bookObj.barangay || inqObj.barangay,
    custObj.municipality || bookObj.municipality || inqObj.municipality,
    custObj.province || bookObj.province || inqObj.province,
  ].filter(Boolean);

  const address = addressParts.length > 0 ? addressParts.join(", ") : null;

  return { name, email, phone, address };
};

/**
 * Extract booking and event details safely from payment, booking, or inquiry.
 */
export const getReceiptBookingDetails = (payment, booking = null) => {
  if (!payment) {
    return {
      bookingRef: "N/A",
      eventType: null,
      packageName: null,
      eventDate: null,
      guestCount: null,
      venue: null,
      startTime: null,
      serviceType: null,
    };
  }

  const b = booking || (payment.booking_id && typeof payment.booking_id === "object" ? payment.booking_id : {});
  const inq = payment.inquiry_id && typeof payment.inquiry_id === "object" ? payment.inquiry_id : {};

  const bookingRef =
    b.reference ||
    inq.reference ||
    (b._id ? `BK-${String(b._id).slice(-6).toUpperCase()}` : null) ||
    "N/A";

  const eventType = b.event_type || inq.event_type || null;
  const packageName = b.package_name_snapshot || b.package_id?.name || inq.package_name_snapshot || inq.package_id?.name || null;
  const eventDate = b.event_date || inq.event_date || null;
  const guestCount = b.guest_count || inq.guest_count || null;
  const startTime = b.start_time || inq.start_time || null;
  const serviceType = b.service_type || inq.service_type || null;

  const venueParts = [b.street, b.barangay, b.municipality, b.province].filter(Boolean);
  const venue =
    venueParts.length > 0
      ? venueParts.join(", ")
      : b.venue_type ||
        [inq.street, inq.barangay, inq.municipality, inq.province].filter(Boolean).join(", ") ||
        inq.venue_type ||
        null;

  return {
    bookingRef,
    eventType,
    packageName,
    eventDate,
    guestCount,
    venue,
    startTime,
    serviceType,
  };
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
    tagline: "",
    address: b.address?.trim() || "Purok 4, Pangao, Ibaan, Batangas, Philippines",
    phone: b.contact_number?.trim() || "+63 987 676 2322",
    email: b.email?.trim() || "info@caezellescatering.com",
    facebook: b.facebook?.trim() || "facebook.com/caezellescatering",
  };
};

/**
 * Calculate financial totals and remaining balance safely from payment and booking context.
 */
export const getReceiptFinancials = (payment, booking = null) => {
  if (!payment) {
    return {
      amountPaid: 0,
      isRefund: false,
      totalBookingAmount: null,
      totalContract: null,
      remainingBalance: null,
      isFullyPaid: false,
      status: "approved",
    };
  }

  const isRefund =
    String(payment.payment_type || "").toLowerCase() === "refund" ||
    Number(payment.amount) < 0;

  const amountPaid = Math.abs(Number(payment.amount) || 0);
  const pType = String(payment.payment_type || "").toLowerCase().trim();
  const status = String(payment.status || "approved").toLowerCase();
  const isApproved = ["approved", "paid", "completed", "succeeded"].includes(status);

  const b = booking || (payment.booking_id && typeof payment.booking_id === "object" ? payment.booking_id : null);
  const inq = payment.inquiry_id && typeof payment.inquiry_id === "object" ? payment.inquiry_id : null;

  const totalBookingAmount =
    Number(b?.total_price ?? b?.total_cost ?? inq?.total_price ?? inq?.total_cost) || null;

  let remainingBalance = null;

  if (isRefund) {
    remainingBalance = null;
  } else if (payment.remaining_balance !== undefined && payment.remaining_balance !== null) {
    remainingBalance = Math.max(0, Number(payment.remaining_balance));
  } else if (payment.metadata?.remaining_balance !== undefined && payment.metadata?.remaining_balance !== null) {
    remainingBalance = Math.max(0, Number(payment.metadata.remaining_balance));
  } else if (b?.remaining_balance !== undefined && b?.remaining_balance !== null) {
    remainingBalance = Math.max(0, Number(b.remaining_balance));
  } else if (b?.quotation_id?.remaining_balance !== undefined && b?.quotation_id?.remaining_balance !== null) {
    remainingBalance = Math.max(0, Number(b.quotation_id.remaining_balance));
  } else if (isApproved && (pType === "full" || pType === "balance" || pType === "final")) {
    remainingBalance = 0;
  } else if (totalBookingAmount !== null) {
    if (pType === "deposit") {
      const depositVal = Number(b?.deposit_amount) || amountPaid;
      remainingBalance = Math.max(0, totalBookingAmount - depositVal);
    } else {
      remainingBalance = Math.max(0, totalBookingAmount - amountPaid);
    }
  }

  const isFullyPaid = remainingBalance !== null && remainingBalance <= 0;

  return {
    amountPaid,
    isRefund,
    paymentType: pType,
    status,
    isApproved,
    totalBookingAmount,
    totalContract: totalBookingAmount, // Alias for backward compatibility
    remainingBalance,
    isFullyPaid,
  };
};

/**
 * Resolve authorized signatory data from existing authorized signatory sources.
 * If no authorized signatory source exists on the record, returns name: null
 * so the signature area is rendered as an unsigned signature line / place for manual signing.
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

