const BlockedDate = require("../models/BlockedDate");

const BLOCKED_DATE_MESSAGE =
  "This date is currently unavailable because it has been blocked by the administrator. Please select another date.";

/**
 * Checks whether a given date is blocked by administration.
 * @param {string|Date} dateVal - Date string or Date object
 * @returns {Promise<Object|null>} - Returns the BlockedDate record if blocked, otherwise null
 */
async function checkDateBlocked(dateVal) {
  if (!dateVal) return null;
  const parsed = new Date(dateVal);
  if (isNaN(parsed.getTime())) return null;

  const startOfDay = new Date(parsed);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(parsed);
  endOfDay.setHours(23, 59, 59, 999);

  return await BlockedDate.findOne({
    date: { $gte: startOfDay, $lte: endOfDay }
  });
}

module.exports = {
  checkDateBlocked,
  BLOCKED_DATE_MESSAGE
};
