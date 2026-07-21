const SystemLog = require("../models/SystemLog");

/**
 * Create a system log entry.
 *
 * @param {Object} opts
 * @param {string|ObjectId} opts.user_id    - Who performed the action
 * @param {string} opts.action              - Machine-readable key (e.g. "package_created")
 * @param {string} opts.entity_type         - "package" | "inquiry" | "booking"
 * @param {string} opts.entity_id           - The _id of the affected document
 * @param {string} opts.details             - Human-readable summary
 * @param {Object} [opts.changes]           - Optional before/after snapshot
 * @param {string} [opts.ip_address]        - Client IP address
 */
const logAction = async ({ user_id, action, entity_type, entity_id, details, changes, ip_address }) => {
  try {
    await SystemLog.create({
      user_id,
      action,
      entity_type,
      entity_id: String(entity_id || ""),
      details,
      changes: changes || undefined,
      ip_address: ip_address || undefined
    });
  } catch (err) {
    // Logging should never break the main request flow
    console.error("SystemLog write failed:", err.message);
  }
};

module.exports = logAction;
