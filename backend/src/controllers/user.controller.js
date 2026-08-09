const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Rating = require("../models/Rating");
const asyncHandler = require("../utils/asyncHandler");
const bcrypt = require("bcryptjs");

const VIP_SPENDING_THRESHOLD = 100000;

exports.getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

exports.updateMe = asyncHandler(async (req, res) => {
  if (req.body.email) {
    const existing = await User.findOne({ email: req.body.email, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }
  }

  if (req.body.username) {
    const existingUser = await User.findOne({ username: req.body.username, _id: { $ne: req.user._id } });
    if (existingUser) {
      return res.status(409).json({ message: "Username already in use" });
    }
  }

  const updates = {
    full_name: req.body.full_name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    ...(req.body.username && { username: req.body.username })
  };
  const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: 'after' });
  res.json(user);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const match = await bcrypt.compare(req.body.current_password, user.password);
  if (!match) return res.status(400).json({ message: "Incorrect current password" });

  user.password = await bcrypt.hash(req.body.new_password, 10);
  await user.save();

  res.json({ message: "Password updated successfully" });
});

exports.getCustomers = asyncHandler(async (req, res) => {
  const customers = await User.find({ role: "customer" })
    .select("full_name email phone is_active createdAt")
    .lean();

  const customerIds = customers.map((c) => c._id);

  const [spendingByCustomer, bookingStatsByCustomer, ratingByCustomer] = await Promise.all([
    Payment.aggregate([
      { $match: { customer_id: { $in: customerIds }, status: "approved" } },
      { $group: { _id: "$customer_id", total: { $sum: "$amount" } } }
    ]),
    Booking.aggregate([
      { $match: { customer_id: { $in: customerIds } } },
      { $group: { _id: "$customer_id", count: { $sum: 1 }, lastBooking: { $max: "$event_date" } } }
    ]),
    Rating.aggregate([
      { $match: { customer_id: { $in: customerIds } } },
      { $group: { _id: "$customer_id", avg: { $avg: "$stars" } } }
    ])
  ]);

  const spendingMap = new Map(spendingByCustomer.map((s) => [String(s._id), s.total]));
  const bookingMap = new Map(bookingStatsByCustomer.map((b) => [String(b._id), b]));
  const ratingMap = new Map(ratingByCustomer.map((r) => [String(r._id), r.avg]));

  const enriched = customers.map((customer) => {
    const key = String(customer._id);
    const spending = spendingMap.get(key) || 0;
    const bookingStats = bookingMap.get(key);
    const reservations = bookingStats?.count || 0;
    const lastBooking = bookingStats?.lastBooking || null;
    const rating = ratingMap.has(key) ? Math.round(ratingMap.get(key)) : null;

    let tier = "Regular";
    if (reservations <= 1) tier = "New";
    else if (spending >= VIP_SPENDING_THRESHOLD) tier = "VIP";

    return {
      ...customer,
      spending,
      reservations,
      last_booking_date: lastBooking,
      rating,
      tier
    };
  });

  res.json(enriched);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { is_active: Boolean(req.body.is_active) },
    { returnDocument: 'after' }
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});