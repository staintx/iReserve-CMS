const Booking = require("../models/Booking");

const Payment = require("../models/Payment");
const Package = require("../models/Package");
const Inquiry = require("../models/Inquiry");
const asyncHandler = require("../utils/asyncHandler");

exports.dashboardSummary = asyncHandler(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalInquiries, pendingQuotations, upcomingBookings, monthlyRevenueAggr, completedEvents] = await Promise.all([
    0,
    Inquiry.countDocuments({ status: "Pending Review" }),
    Booking.countDocuments({ event_date: { $gte: new Date() }, status: { $ne: "cancelled" } }),
    Payment.aggregate([
      { $match: { status: "approved", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } }
    ]),
    Booking.countDocuments({ status: "completed" })
  ]);

  res.json({
    totalInquiries,
    pendingQuotations,
    upcomingBookings,
    monthlyRevenue: monthlyRevenueAggr[0]?.sum || 0,
    completedEvents
  });
});

exports.dashboardMetrics = asyncHandler(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [summary, monthlyRevenue, bookingStatus, eventTypes, topPackages, recentBookings, recentInquiries] = await Promise.all([
    Promise.all([
      0,
      Inquiry.countDocuments({ status: "Pending Review" }),
      Booking.countDocuments({ event_date: { $gte: new Date() }, status: { $ne: "cancelled" } }),
      Payment.aggregate([
        { $match: { status: "approved", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } }
      ]),
      Booking.countDocuments({ status: "completed" })
    ]),
    Payment.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Booking.aggregate([
      { $group: { _id: "$event_type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Booking.aggregate([
      { $match: { package_id: { $ne: null } } },
      { $group: { _id: "$package_id", bookings: { $sum: 1 }, revenue: { $sum: "$total_price" } } },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: Package.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "package"
        }
      },
      { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, bookings: 1, revenue: 1, name: "$package.name" } }
    ]),
    Booking.find().sort({ createdAt: -1 }).limit(5).select("event_type status createdAt"),
    []
  ]);

  const [totalInquiries, pendingQuotations, upcomingBookings, monthlyRevenueAggr, completedEvents] = summary;
  const revenueValue = monthlyRevenueAggr[0]?.sum || 0;

  const formattedRevenue = monthlyRevenue.map((item) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
    total: item.total
  }));

  const formattedStatus = bookingStatus.map((item) => ({
    status: item._id || "unknown",
    count: item.count
  }));

  const formattedEventTypes = eventTypes
    .filter((item) => item._id)
    .map((item) => ({ event_type: item._id, count: item.count }));

  const formattedTopPackages = topPackages.map((item) => ({
    package_id: item._id,
    name: item.name || "Custom Package",
    bookings: item.bookings,
    revenue: item.revenue
  }));

  const recentActivity = [
    ...recentBookings.map((booking) => ({
      type: "booking",
      id: booking._id,
      title: booking.event_type || "Booking",
      status: booking.status,
      createdAt: booking.createdAt
    })),
    ...recentInquiries.map((inquiry) => ({
      type: "inquiry",
      id: inquiry._id,
      title: inquiry.event_type || "Inquiry",
      status: inquiry.status,
      createdAt: inquiry.createdAt
    }))
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  res.json({
    summary: {
      totalInquiries,
      pendingQuotations,
      upcomingBookings,
      monthlyRevenue: revenueValue,
      completedEvents
    },
    monthlyRevenue: formattedRevenue,
    bookingStatus: formattedStatus,
    eventTypes: formattedEventTypes,
    topPackages: formattedTopPackages,
    recentActivity
  });
});