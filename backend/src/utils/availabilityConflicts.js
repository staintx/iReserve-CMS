const Booking = require("../models/Booking");

/**
 * Filter condition to match approved availability records
 * and legacy availability records that do not have a status field.
 */
const APPROVED_AVAILABILITY_QUERY = {
  $or: [{ status: "approved" }, { status: { $exists: false } }, { status: null }]
};

/**
 * Check if a staff member or manager has assigned bookings on a specific date.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {Date|string} date
 * @returns {Promise<Array<Object>>} List of conflicting booking details
 */
async function checkStaffConflicts(userId, date) {
  if (!userId || !date) return [];

  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) return [];

  const dayStart = new Date(targetDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    $or: [
      { "staff_assignments.user_id": userId },
      { event_manager_id: userId },
      { staff_ids: userId }
    ],
    event_date: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: ["Cancelled", "cancelled", "refunded", "rejected"] }
  })
    .populate("customer_id", "full_name first_name last_name")
    .select("reference event_type event_date start_time duration_hours status customer_id staff_assignments event_manager_id");

  return bookings.map((b) => {
    const custName = b.customer_id?.full_name 
      || `${b.customer_id?.first_name || ""} ${b.customer_id?.last_name || ""}`.trim() 
      || "Customer";
    const isManager = String(b.event_manager_id) === String(userId);
    const staffEntry = (b.staff_assignments || []).find((sa) => String(sa.user_id) === String(userId));
    const roleAssigned = isManager ? "Event Manager" : (staffEntry?.role || "Staff");

    return {
      booking_id: b._id,
      reference: b.reference || String(b._id).slice(-6).toUpperCase(),
      event_type: b.event_type,
      event_date: b.event_date,
      start_time: b.start_time || "",
      duration_hours: b.duration_hours,
      status: b.status,
      customer_name: custName,
      assigned_as: roleAssigned
    };
  });
}

module.exports = {
  checkStaffConflicts,
  APPROVED_AVAILABILITY_QUERY
};
