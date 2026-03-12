const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  full_name: String,
  email: { type: String, unique: true },
  phone: String,
  address: String,
  username: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "manager", "staff", "customer"], default: "customer" },
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  email_verify_token: String,
  email_verify_expires: Date,
  email_otp_hash: String,
  email_otp_expires: Date
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);