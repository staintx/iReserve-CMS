const Booking = require("../models/Booking");

const canAccessConversation = async (user, conversation) => {
  if (!user || !conversation) return false;
  if (user.role === "admin") return true;

  const userId = String(user._id || "");
  const customerId = conversation.customer_id?._id 
    ? String(conversation.customer_id._id) 
    : String(conversation.customer_id || "");

  if (user.role === "customer") {
    return !!(customerId && customerId === userId);
  }

  const managerId = conversation.event_manager_id?._id
    ? String(conversation.event_manager_id._id)
    : String(conversation.event_manager_id || "");

  if (user.role === "manager") {
    if (managerId && managerId === userId) return true;
    if (conversation.booking_id) {
      const bookingId = conversation.booking_id._id || conversation.booking_id;
      const booking = await Booking.findById(bookingId).select("event_manager_id").lean();
      if (booking && String(booking.event_manager_id) === userId) return true;
    }
    if (conversation.type === "inquiry") return true;
    return false;
  }

  if (user.role === "staff") {
    if (conversation.booking_id) {
      const bookingId = conversation.booking_id._id || conversation.booking_id;
      if (conversation.booking_id.staff_assignments) {
        return conversation.booking_id.staff_assignments.some(
          (sa) => String(sa.user_id?._id || sa.user_id) === userId
        );
      }
      const booking = await Booking.findById(bookingId).select("staff_assignments").lean();
      if (booking && Array.isArray(booking.staff_assignments)) {
        return booking.staff_assignments.some(
          (sa) => String(sa.user_id) === userId
        );
      }
    }
    return false;
  }

  return false;
};

module.exports = { canAccessConversation };


