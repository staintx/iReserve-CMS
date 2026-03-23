const User = require("../models/User");
const Booking = require("../models/Booking");
const StaffAvailability = require("../models/StaffAvailability");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asyncHandler");

const parseMonth = (month) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthIndex] = month.split("-").map((value) => Number(value));
  return {
    start: new Date(year, monthIndex - 1, 1),
    end: new Date(year, monthIndex, 0, 23, 59, 59, 999)
  };
};

const parseDateKey = (value) => {
  const [year, monthIndex, day] = String(value).split("-").map((v) => Number(v));
  if (!year || !monthIndex || !day) return null;
  return new Date(year, monthIndex - 1, day);
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

exports.createStaff = asyncHandler(async (req, res) => {
  const { full_name, email, password, role, phone, username } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const staff = await User.create({ full_name, email, password: hashed, role, phone, username });
  res.status(201).json(staff);
});

exports.getAllStaff = asyncHandler(async (req, res) => {
  const staff = await User.find({ role: { $in: ["staff", "manager"] } });
  res.json(staff);
});

exports.updateStaff = asyncHandler(async (req, res) => {
  const updates = {
    full_name: req.body.full_name,
    email: req.body.email,
    role: req.body.role,
    is_active: req.body.is_active,
    phone: req.body.phone,
    username: req.body.username
  };

  if (req.body.password) {
    updates.password = await bcrypt.hash(req.body.password, 10);
  }

  const staff = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json(staff);
});

exports.removeStaff = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ staff_ids: req.user._id })
    .populate("customer_id")
    .select("event_type event_date start_time duration_hours venue_type municipality street barangay status staff_assignments");

  const status = String(req.query.status || "").toLowerCase();
  if (!status) return res.json(bookings);

  if (status === "active") {
    return res.json(bookings.filter((b) => b.status === "active"));
  }

  if (status === "completed") {
    return res.json(bookings.filter((b) => b.status === "completed"));
  }

  return res.json(bookings);
});

exports.getMyAvailability = asyncHandler(async (req, res) => {
  const month = String(req.query.month || "").trim();
  const range = parseMonth(month);

  if (!range) {
    return res.status(400).json({ message: "Month must be YYYY-MM" });
  }

  const [availability, assignments] = await Promise.all([
    StaffAvailability.find({
      user_id: req.user._id,
      date: { $gte: range.start, $lte: range.end }
    }).select("date"),
    Booking.find({
      staff_ids: req.user._id,
      event_date: { $gte: range.start, $lte: range.end }
    }).select("event_date status")
  ]);

  res.json({
    month,
    unavailable: availability.map((item) => toDateKey(item.date)),
    assignments: assignments.map((booking) => ({
      date: booking.event_date,
      status: booking.status
    }))
  });
});

exports.setMyAvailability = asyncHandler(async (req, res) => {
  const month = String(req.body.month || "").trim();
  const range = parseMonth(month);

  if (!range) {
    return res.status(400).json({ message: "Month must be YYYY-MM" });
  }

  const rawDates = Array.isArray(req.body.dates) ? req.body.dates : [];
  const uniqueDates = Array.from(new Set(rawDates.map((value) => String(value))));
  const parsedDates = uniqueDates
    .map(parseDateKey)
    .filter((date) => date && date >= range.start && date <= range.end);

  await StaffAvailability.deleteMany({
    user_id: req.user._id,
    date: { $gte: range.start, $lte: range.end }
  });

  if (parsedDates.length > 0) {
    await StaffAvailability.insertMany(
      parsedDates.map((date) => ({
        user_id: req.user._id,
        date
      }))
    );
  }

  res.json({
    month,
    unavailable: parsedDates.map((date) => toDateKey(date))
  });
});