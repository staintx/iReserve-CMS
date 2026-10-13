const Booking = require("../models/Booking");
const BusinessInfo = require("../models/BusinessInfo");
const { parseDateOnlyBounds } = require("./blockedDates");

const INACTIVE_BOOKING_STATUSES = [
  "cancelled",
  "Cancelled",
  "refunded",
  "Refunded",
  "rejected",
  "Rejected",
  "inquiry",
  "quote_sent",
];

let _businessInfoCache = null;
let _businessInfoCacheTime = 0;
const BUSINESS_INFO_TTL = 30000;

const clearBusinessInfoCache = () => {
  _businessInfoCache = null;
  _businessInfoCacheTime = 0;
};

const getCachedBusinessInfo = async (forceFresh = false) => {
  const now = Date.now();
  if (!forceFresh && _businessInfoCache && now - _businessInfoCacheTime < BUSINESS_INFO_TTL) {
    return _businessInfoCache;
  }
  _businessInfoCache = await BusinessInfo.findOne().lean();
  _businessInfoCacheTime = now;
  return _businessInfoCache;
};

const getDailyBookingLimit = (businessInfo) => {
  const val = Number(businessInfo?.max_bookings_per_day);
  return Number.isFinite(val) && val > 0 ? val : 2;
};

const checkMaxBookingsLimit = async (eventDate, excludeId = null, forceFresh = false) => {
  if (!eventDate) return false;
  const bounds = parseDateOnlyBounds(eventDate);
  if (!bounds) return false;

  const query = {
    status: { $nin: INACTIVE_BOOKING_STATUSES },
    event_date: { $gte: bounds.startOfDay, $lte: bounds.endOfDay },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const [count, businessInfo] = await Promise.all([
    Booking.countDocuments(query),
    getCachedBusinessInfo(forceFresh),
  ]);
  const limit = getDailyBookingLimit(businessInfo);

  return count >= limit;
};

const getBookedDatesForMonth = async (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

  const [businessInfo, bookings] = await Promise.all([
    getCachedBusinessInfo(true),
    Booking.find({
      status: { $nin: INACTIVE_BOOKING_STATUSES },
      event_date: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean(),
  ]);

  const limit = getDailyBookingLimit(businessInfo);

  const formatDateKey = (d) => {
    if (!d) return null;
    if (typeof d === "string") {
      const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return match[0];
    }
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
  };

  const dateCounts = {};
  bookings.forEach((booking) => {
    if (booking.event_date) {
      const d = formatDateKey(booking.event_date);
      if (d) dateCounts[d] = (dateCounts[d] || 0) + 1;
    }
  });

  return Object.keys(dateCounts).filter((dateStr) => dateCounts[dateStr] >= limit);
};

module.exports = {
  INACTIVE_BOOKING_STATUSES,
  clearBusinessInfoCache,
  getCachedBusinessInfo,
  getDailyBookingLimit,
  checkMaxBookingsLimit,
  getBookedDatesForMonth,
};
