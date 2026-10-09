/**
 * Frontend helper utility for overdue payment calculations.
 * Consistent with backend business rules.
 */

/**
 * Safely parses a Date or ISO date string into a normalized local Date object at 00:00:00.000.
 * Extracts year, month, and day directly from ISO strings to avoid UTC-offset day-shifting.
 */
export function parseLocalDate(value) {
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
export function getPaymentDueDate(eventDate) {
  const parsed = parseLocalDate(eventDate);
  if (!parsed) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + 1);
}

/**
 * Checks if a booking is overdue based on its event date and remaining balance.
 * A booking is Payment Overdue when:
 * - The current Philippine/local calendar date is on or after one calendar day following the event date (due date).
 * - Outstanding balance > 0.
 * - Remaining balance has not been fully settled through a verified payment.
 */
export function isBookingOverdue(booking, totalPaid = null, referenceDate = new Date()) {
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

  // Overdue starting from the due date (on or after one calendar day following the event date)
  return todayCalendar.getTime() >= dueDate.getTime();
}
