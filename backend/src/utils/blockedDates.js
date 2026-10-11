const BlockedDate = require("../models/BlockedDate");

const BLOCKED_DATE_MESSAGE =
  "This date is currently unavailable because it has been blocked by the administrator. Please select another date.";

function parseDateOnlyBounds(val) {
  if (!val) return null;
  let year, month, day;
  if (typeof val === "string") {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[3], 10);
    }
  }
  if (year === undefined) {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
    day = d.getUTCDate();
  }
  const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  return { startOfDay, endOfDay };
}

/**
 * Checks whether a given date is blocked by administration.
 * @param {string|Date} dateVal - Date string or Date object
 * @returns {Promise<Object|null>} - Returns the BlockedDate record if blocked, otherwise null
 */
async function checkDateBlocked(dateVal) {
  const bounds = parseDateOnlyBounds(dateVal);
  if (!bounds) return null;

  return await BlockedDate.findOne({
    date: { $gte: bounds.startOfDay, $lte: bounds.endOfDay }
  });
}

module.exports = {
  checkDateBlocked,
  parseDateOnlyBounds,
  BLOCKED_DATE_MESSAGE
};

