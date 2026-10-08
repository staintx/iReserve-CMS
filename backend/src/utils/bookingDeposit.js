/**
 * Deposit gate for customer-facing bookings.
 *
 * A booking whose quotation was accepted but whose reservation deposit has not
 * been paid yet is not a reservation from the customer's point of view: it
 * stays under My Inquiries (where the deposit is paid) and only moves to
 * My Bookings once the deposit is settled. Ocular scheduling follows the same
 * rule.
 *
 * This reuses the booking's existing `status` and `payment_status` values —
 * the same pre-deposit statuses that executeInquiryConversion and
 * syncBookingStatus promote to "confirmed" once a deposit is approved.
 */

// Booking statuses that mean "approved, waiting for the deposit" (compared lowercase).
const PRE_DEPOSIT_BOOKING_STATUSES = [
  "deposit pending",
  "pending deposit",
  "customer_accepted",
];

// payment_status values that can only be reached after a deposit was paid.
const DEPOSIT_SETTLED_PAYMENT_STATUSES = [
  "deposit_paid",
  "fully_paid",
  "refund_requested",
  "refunded",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True while the booking is still waiting for its reservation deposit. */
const isBookingAwaitingDeposit = (booking) => {
  if (!booking) return false;
  const status = String(booking.status || "").toLowerCase();
  if (!PRE_DEPOSIT_BOOKING_STATUSES.includes(status)) return false;
  return !DEPOSIT_SETTLED_PAYMENT_STATUSES.includes(booking.payment_status);
};

/**
 * Mongo condition matching bookings that are still awaiting their deposit and
 * came from an inquiry (so the customer can still reach them in My Inquiries).
 * Use inside `$nor` to exclude them from customer booking lists.
 */
const awaitingDepositInquiryBookingQuery = () => ({
  inquiry_id: { $ne: null },
  status: {
    $in: PRE_DEPOSIT_BOOKING_STATUSES.map((s) => new RegExp(`^${escapeRegex(s)}$`, "i")),
  },
  payment_status: { $nin: DEPOSIT_SETTLED_PAYMENT_STATUSES },
});

module.exports = {
  PRE_DEPOSIT_BOOKING_STATUSES,
  DEPOSIT_SETTLED_PAYMENT_STATUSES,
  isBookingAwaitingDeposit,
  awaitingDepositInquiryBookingQuery,
};
