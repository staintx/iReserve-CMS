/**
 * Deposit gate for customer-facing bookings — mirrors
 * backend/src/utils/bookingDeposit.js so the UI and API agree.
 *
 * A booking whose quotation was accepted but whose reservation deposit is
 * still unpaid belongs in My Inquiries, not My Bookings, and cannot have an
 * ocular visit scheduled yet.
 */

// Booking statuses that mean "approved, waiting for the deposit" (compared lowercase).
export const PRE_DEPOSIT_BOOKING_STATUSES = ["deposit pending", "pending deposit", "customer_accepted"];

// payment_status values that can only be reached after a deposit was paid.
export const DEPOSIT_SETTLED_PAYMENT_STATUSES = ["deposit_paid", "fully_paid", "refund_requested", "refunded"];

/** True while the booking is still waiting for its reservation deposit. */
export function isBookingAwaitingDeposit(booking) {
  if (!booking) return false;
  const status = String(booking.status || "").toLowerCase();
  if (!PRE_DEPOSIT_BOOKING_STATUSES.includes(status)) return false;
  return !DEPOSIT_SETTLED_PAYMENT_STATUSES.includes(booking.payment_status);
}
