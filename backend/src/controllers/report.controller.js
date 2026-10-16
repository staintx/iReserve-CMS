const Booking = require("../models/Booking");

const Payment = require("../models/Payment");
const Package = require("../models/Package");
const Inquiry = require("../models/Inquiry");
const MenuItem = require("../models/MenuItem");
const asyncHandler = require("../utils/asyncHandler");

async function getMostSelectedMenu() {
  const [bookings, inquiries] = await Promise.all([
    Booking.find({
      $or: [
        { "menu_items.0": { $exists: true } },
        { "offer_food_snapshot.0": { $exists: true } }
      ]
    }).select("menu_items offer_food_snapshot createdAt inquiry_id").lean(),
    Inquiry.find({
      $or: [
        { "selected_menu.0": { $exists: true } },
        { "offer_food_snapshot.0": { $exists: true } }
      ]
    }).select("selected_menu offer_food_snapshot createdAt converted_booking_id").populate("selected_menu", "name category").lean()
  ]);

  const convertedInquiryIds = new Set();
  for (const b of bookings) {
    if (b.inquiry_id) {
      convertedInquiryIds.add(b.inquiry_id.toString());
    }
  }

  const menuMap = new Map();

  const addSelection = (name, category, date) => {
    if (!name || typeof name !== "string") return;
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!menuMap.has(trimmed)) {
      menuMap.set(trimmed, {
        name: trimmed,
        category: category || "",
        count: 0,
        dates: []
      });
    }

    const item = menuMap.get(trimmed);
    item.count += 1;
    if (category && !item.category) {
      item.category = category;
    }
    if (date) {
      item.dates.push(date instanceof Date ? date.toISOString() : new Date(date).toISOString());
    }
  };

  for (const b of bookings) {
    const seen = new Set();
    const date = b.createdAt || new Date();
    if (Array.isArray(b.menu_items)) {
      for (const m of b.menu_items) {
        if (m && m.name && !seen.has(m.name)) {
          seen.add(m.name);
          addSelection(m.name, m.category, date);
        }
      }
    }
    if (Array.isArray(b.offer_food_snapshot)) {
      for (const m of b.offer_food_snapshot) {
        if (m && m.item_name && !seen.has(m.item_name)) {
          seen.add(m.item_name);
          addSelection(m.item_name, m.menu_category, date);
        }
      }
    }
  }

  for (const inq of inquiries) {
    if (inq.converted_booking_id || convertedInquiryIds.has(inq._id.toString())) {
      continue;
    }
    const seen = new Set();
    const date = inq.createdAt || new Date();
    if (Array.isArray(inq.selected_menu)) {
      for (const m of inq.selected_menu) {
        const name = typeof m === "object" ? m?.name : String(m);
        const cat = typeof m === "object" ? m?.category : "";
        if (name && !seen.has(name)) {
          seen.add(name);
          addSelection(name, cat, date);
        }
      }
    }
    if (Array.isArray(inq.offer_food_snapshot)) {
      for (const m of inq.offer_food_snapshot) {
        if (m && m.item_name && !seen.has(m.item_name)) {
          seen.add(m.item_name);
          addSelection(m.item_name, m.menu_category, date);
        }
      }
    }
  }

  return Array.from(menuMap.values()).sort((a, b) => b.count - a.count);
}

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

  const [summary, monthlyRevenue, bookingStatus, eventTypes, topPackages, recentBookings, recentInquiries, mostSelectedMenu] = await Promise.all([
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
    [],
    getMostSelectedMenu()
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
    mostSelectedMenu,
    recentActivity
  });
});