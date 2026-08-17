/**
 * The catering decision, in one place.
 *
 * A package is only the starting configuration of a request. Every setup
 * package is labelled "Event Setup Only" from the moment a customer opens it,
 * before anyone has asked them whether they want food, so that label is not the
 * customer's answer and must never be read as one. `include_food` is the
 * answer; the service type is a label derived from it.
 *
 * Mirrors frontend/src/pages/customer/booking/lib/bookingRules.js — the two
 * must agree, because the wizard derives these before submitting and this
 * derives them again on the way into the database.
 */

const SERVICE_TYPES = {
  FOOD_ONLY: "Food Only",
  SETUP_ONLY: "Event Setup Only",
  FULL_SERVICE: "Food and Event Setup",
};

/**
 * Whether the customer asked for food on this request.
 *
 * Only with no answer recorded at all does this fall back: to the dishes if any
 * were chosen, and otherwise to the service type, which is how requests made
 * before the question existed have always been read.
 *
 * Accepts an inquiry or a booking — the dishes are under `selected_menu` on one
 * and `menu_items` on the other.
 */
function cateringRequested(record) {
  if (!record) return false;
  if (record.service_type === SERVICE_TYPES.FOOD_ONLY) return true;
  if (typeof record.include_food === "boolean") return record.include_food;
  const dishes = record.selected_menu || record.menu_items || [];
  if (dishes.length > 0) return true;
  return record.service_type !== SERVICE_TYPES.SETUP_ONLY;
}

/**
 * The service type a request should be stored and quoted under: setup plus
 * catering is "Food and Event Setup" whichever package it started from, and
 * skipping catering settles back to setup only. Food Only is left alone.
 */
function serviceTypeForRequest(record) {
  if (record?.service_type === SERVICE_TYPES.FOOD_ONLY) return SERVICE_TYPES.FOOD_ONLY;
  return cateringRequested(record) ? SERVICE_TYPES.FULL_SERVICE : SERVICE_TYPES.SETUP_ONLY;
}

module.exports = { SERVICE_TYPES, cateringRequested, serviceTypeForRequest };
