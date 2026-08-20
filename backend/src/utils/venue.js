/**
 * Whether a request holds the venue, in one place.
 *
 * This used to be answered with `service_type === "Food Only"`, which made that
 * field mean two unrelated things at once: *what is being sold* (food, an event
 * set-up, or both) and *whether our team is standing in the customer's venue
 * that afternoon*. They are not the same question, and conflating them means
 * neither can be answered honestly — a combo pack is food, but our team is
 * there setting out the buffet, so it holds the venue exactly as a styled event
 * does.
 *
 * `delivery_method` is the field that already asks the second question:
 *
 *   pickup   — the customer collects from the kitchen. No venue involved.
 *   delivery — we drop the food off. We are not there for the event.
 *   setup    — we are at the venue, setting up and serving.
 *
 * So the answer is read from there. Two other places in the codebase had
 * already reached for the same signal on their own (the inquiry-to-booking
 * conversion, and the portal's service-type fallback); this is that rule named
 * and shared rather than re-derived.
 *
 * Unknown means *yes*. A record with no delivery method recorded is one we
 * cannot rule out, and the cost of a wrong "no" is a double-booked venue —
 * where the cost of a wrong "yes" is a conflict warning an admin can override.
 */

const DELIVERY_METHODS = {
  PICKUP: "pickup",
  DELIVERY: "delivery",
  SETUP: "setup",
};

/**
 * Whether this inquiry, booking or availability query occupies its venue for
 * the duration of the event.
 *
 * Accepts anything carrying `delivery_method` — and falls back, for rows
 * written before that field was reliable, to the two signals that have always
 * identified a food delivery.
 */
function occupiesVenue(record) {
  if (!record) return true;

  switch (record.delivery_method) {
    case DELIVERY_METHODS.PICKUP:
    case DELIVERY_METHODS.DELIVERY:
      return false;
    case DELIVERY_METHODS.SETUP:
      return true;
    default:
      break;
  }

  // No delivery method recorded. These are the heuristics this codebase has
  // always used for an order that never reaches a venue, kept so migrating to
  // the field above cannot start flagging conflicts on old food deliveries.
  if (record.service_type === "Food Only") return false;
  if (String(record.event_type || "").toLowerCase().includes("food delivery")) {
    return false;
  }

  return true;
}

module.exports = { DELIVERY_METHODS, occupiesVenue };
