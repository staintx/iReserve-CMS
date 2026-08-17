/**
 * The event types the whole product agrees on.
 *
 * Inquiry.event_type is free text on the backend, so nothing stopped the
 * customer booking flow offering one list ("Birthday, Wedding, Corporate"), the
 * package admin another ("Christening, Anniversary"), and the Quotation Builder
 * none at all. An admin correcting an event type then had no way to type a
 * value the booking flow would have produced.
 *
 * Both sides now read this list. "Other" is the escape hatch: it is a real
 * option in the picker, and whatever is typed alongside it is what gets stored.
 */
export const EVENT_TYPES = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Christening",
  "Anniversary",
  "Other",
];

export const OTHER_EVENT_TYPE = "Other";

/** The listed option a stored value belongs to, matched case-insensitively. */
export function matchEventType(value) {
  const stored = String(value || "").trim();
  if (!stored) return "";
  return EVENT_TYPES.find((type) => type.toLowerCase() === stored.toLowerCase()) || "";
}

/** True when a stored value has to be carried in the "Other" free-text field. */
export function isOtherEventType(value) {
  const stored = String(value || "").trim();
  return Boolean(stored) && !matchEventType(stored);
}
