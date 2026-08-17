const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  full_name: String,
  email: { type: String, unique: true },
  phone: String,
  address: String,
  username: { type: String, unique: true, sparse: true, default: undefined },
  password: String,
  role: { type: String, enum: ["admin", "manager", "staff", "customer"], default: "customer" },
  position: String,
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  email_verify_token: String,
  email_verify_expires: Date,
  email_otp_hash: String,
  email_otp_expires: Date,
  reset_password_token: String,
  reset_password_expires: Date
}, { timestamps: true });

// --- Performance indexes ---
UserSchema.index({ role: 1 });

module.exports = mongoose.model("User", UserSchema);