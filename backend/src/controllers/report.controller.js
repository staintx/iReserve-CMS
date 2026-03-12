const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");
const Payment = require("../models/Payment");

exports.dashboardSummary = async (req, res) => {
  const totalBookings = await Booking.countDocuments();
  const pendingInquiries = await Inquiry.countDocuments({ status: "pending" });
  const totalRevenue = await Payment.aggregate([{ $group: { _id: null, sum: { $sum: "$amount" } } }]);
  res.json({
    totalBookings,
    pendingInquiries,
    totalRevenue: totalRevenue[0]?.sum || 0
  });
};