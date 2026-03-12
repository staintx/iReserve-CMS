const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

exports.getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

exports.updateMe = asyncHandler(async (req, res) => {
  const updates = {
    full_name: req.body.full_name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address
  };
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json(user);
});