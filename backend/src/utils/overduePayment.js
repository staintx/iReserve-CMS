const Booking = require("../models/Booking");
const Payment = require("../models/Payment");

/**
 * Safely parses a Date or ISO date string into a normalized local Date object at 00:00:00.000.
 * Extracts year, month, and day directly from ISO strings to avoid UTC-offset day-shifting.
 */
function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dateObj.getTime()) ? null : dateObj;
  }
  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }
  return null;
}

/**
 * Calculates the payment due date: 1 calendar day after the event date.
 */
function getPaymentDueDate(eventDate) {
  const parsed = parseLocalDate(eventDate);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + 1);
}

/**
 * Determines whether a single booking is overdue.
 * A booking is Payment Overdue when:
 * - The current Philippine/local calendar date is on or after one calendar day following the event date (due date).
 * - The booking still has an outstanding balance greater than ₱0.
 * - The remaining balance has not been fully settled through a verified and recorded payment.
 */
function isBookingPaymentOverdue(booking, totalPaid = null, referenceDate = new Date()) {
  if (!booking || !booking.event_date) return false;
  const rawStatus = String(booking.status || "").toLowerCase();
  if (["cancelled", "refunded"].includes(rawStatus)) return false;

  const totalPrice = Number(booking.total_price || 0);
  if (totalPrice <= 0) return false;

  let paid = 0;
  if (totalPaid !== null && totalPaid !== undefined) {
    paid = Number(totalPaid) || 0;
  } else if (Array.isArray(booking.payments)) {
    paid = booking.payments
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  } else if (booking.payment_status === "fully_paid") {
    return false;
  }

  const remaining = Math.max(0, totalPrice - paid);
  if (remaining <= 0) return false;

  const dueDate = getPaymentDueDate(booking.event_date);
  if (!dueDate) return false;

  const refParsed = parseLocalDate(referenceDate) || new Date();
  const todayCalendar = new Date(refParsed.getFullYear(), refParsed.getMonth(), refParsed.getDate());

  // Overdue on or after the due date (1 calendar day following event date)
  return todayCalendar.getTime() >= dueDate.getTime();
}

/**
 * Fetches all overdue bookings for a customer.
 */
async function getCustomerOverdueBookings(customerId) {
  if (!customerId) return [];

  const bookings = await Booking.find({
    customer_id: customerId,
    status: { $nin: ["Cancelled", "cancelled", "refunded"] },
    payment_status: { $ne: "fully_paid" }
  }).lean();

  if (!bookings || bookings.length === 0) return [];

  const bookingIds = bookings.map((b) => b._id);
  const approvedPayments = await Payment.find({
    booking_id: { $in: bookingIds },
    status: "approved"
  }).lean();

  const paidMap = new Map();
  for (const p of approvedPayments) {
    const bId = String(p.booking_id);
    paidMap.set(bId, (paidMap.get(bId) || 0) + (Number(p.amount) || 0));
  }

  const overdueBookings = [];

  for (const booking of bookings) {
    const total = Number(booking.total_price || 0);
    const paid = paidMap.get(String(booking._id)) || 0;
    const remaining = Math.max(0, total - paid);

    if (remaining <= 0) continue;
    if (!booking.event_date) continue;

    if (isBookingPaymentOverdue(booking, paid)) {
      const dueDate = getPaymentDueDate(booking.event_date);
      overdueBookings.push({
        _id: booking._id,
        reference: booking.reference || `CAZ-${String(booking._id).slice(-6).toUpperCase()}`,
        event_name: booking.event_name || booking.event_type || "Catering Event",
        event_type: booking.event_type,
        event_date: booking.event_date,
        due_date: dueDate,
        total_price: total,
        total_paid: paid,
        remaining_balance: remaining,
        overdue_amount: remaining,
        status: booking.status,
      });
    }
  }

  // Sort overdue bookings oldest event date first
  overdueBookings.sort((a, b) => {
    const dateA = new Date(a.event_date || 0).getTime();
    const dateB = new Date(b.event_date || 0).getTime();
    return dateA - dateB;
  });

  return overdueBookings;
}

module.exports = {
  parseLocalDate,
  getPaymentDueDate,
  isBookingPaymentOverdue,
  getCustomerOverdueBookings
};
