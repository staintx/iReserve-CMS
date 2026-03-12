const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.createStaff = async (req, res) => {
  const { full_name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const staff = await User.create({ full_name, email, password: hashed, role });
  res.status(201).json(staff);
};

exports.getAllStaff = async (req, res) => {
  const staff = await User.find({ role: { $in: ["staff", "manager"] } });
  res.json(staff);
};