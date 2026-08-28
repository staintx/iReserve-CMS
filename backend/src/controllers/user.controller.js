const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Rating = require("../models/Rating");
const asyncHandler = require("../utils/asyncHandler");
const bcrypt = require("bcryptjs");

const VIP_SPENDING_THRESHOLD = 100000;

exports.getMe = asyncHandler(async (req, res) => {
  const token = req.cookies?.token || (req.headers.authorization ? req.headers.authorization.split(" ")[1] : null);
  const userData = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete userData.password;
  res.json({ ...userData, token });
});

exports.updateMe = asyncHandler(async (req, res) => {
  if (req.body.email) {
    const emailToTest = req.body.email.trim().toLowerCase();
    const existing = await User.findOne({ email: emailToTest, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }
  }

  if (req.body.username) {
    const usernameToTest = req.body.username.trim();
    const existingUser = await User.findOne({ username: usernameToTest, _id: { $ne: req.user._id } });
    if (existingUser) {
      return res.status(409).json({ message: "Username already in use" });
    }
  }

  // Name updates keep both representations in step. This path uses
  // findByIdAndUpdate, which bypasses the model's pre-save hook, so the
  // derivation is repeated here rather than silently skipped — otherwise a
  // profile edit would leave first/last and full_name disagreeing.
  const firstName = req.body.first_name !== undefined ? String(req.body.first_name).trim() : null;
  const lastName = req.body.last_name !== undefined ? String(req.body.last_name).trim() : null;
  const nameUpdates = {};

  if (firstName !== null || lastName !== null) {
    const current = await User.findById(req.user._id).select("first_name last_name");
    const nextFirst = firstName !== null ? firstName : current?.first_name || "";
    const nextLast = lastName !== null ? lastName : current?.last_name || "";
    nameUpdates.first_name = nextFirst;
    nameUpdates.last_name = nextLast;
    nameUpdates.full_name = [nextFirst, nextLast].filter(Boolean).join(" ");
  } else if (req.body.full_name) {
    // Legacy callers that still send one combined value: split it so the two
    // fields do not go stale behind it.
    const full = req.body.full_name.trim();
    const parts = full.split(/\s+/);
    nameUpdates.full_name = full;
    nameUpdates.first_name = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
    nameUpdates.last_name = parts.length > 1 ? parts[parts.length - 1] : "";
  }

  const updates = {
    ...nameUpdates,
    ...(req.body.email && { email: req.body.email.trim().toLowerCase() }),
    ...(req.body.phone !== undefined && { phone: req.body.phone ? req.body.phone.trim() : "" }),
    ...(req.body.alt_phone !== undefined && { alt_phone: req.body.alt_phone ? req.body.alt_phone.trim() : "" }),
    ...(req.body.address !== undefined && { address: req.body.address ? req.body.address.trim() : "" }),
    ...(req.body.position !== undefined && { position: req.body.position ? req.body.position.trim() : "" }),
    ...(req.body.username !== undefined && { username: req.body.username ? req.body.username.trim() : undefined })
  };
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select("-password");
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