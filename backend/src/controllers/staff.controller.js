const User = require("../models/User");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asyncHandler");

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