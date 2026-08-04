const InventoryLog = require("../models/InventoryLog");

/**
 * Record an inventory stock-change event (design spec: admin-ux-audit §10).
 * Mirrors logAction's fire-and-forget style — a log-write failure must
 * never break the request that triggered it.
 *
 * @param {Object} opts
 * @param {string|ObjectId} opts.inventory_id
 * @param {"created"|"manual_adjustment"|"reservation_allocated"|"reservation_released"|"retired"} opts.event_type
 * @param {number} [opts.delta]        - Signed change to available stock
 * @param {string|ObjectId} [opts.actor_id]
 * @param {string|ObjectId} [opts.booking_id]
 * @param {string} [opts.reason]
 */
const writeInventoryLog = async ({ inventory_id, event_type, delta = 0, actor_id, booking_id, reason }) => {
  try {
    await InventoryLog.create({
      inventory_id,
      event_type,
      delta,
      actor_id: actor_id || undefined,
      booking_id: booking_id || undefined,
      reason: reason || undefined,
    });
  } catch (err) {
    console.error("InventoryLog write failed:", err.message);
  }
};

module.exports = writeInventoryLog;
