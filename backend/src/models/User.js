const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  // Registration captures the name in two fields so the booking flow can
  // prefill a real surname instead of guessing one out of a single string.
  first_name: String,
  last_name: String,
  // Kept, and kept correct, rather than dropped: ~40 read sites across the
  // admin tables, chat, staff assignments and PDF exports use it, and every
  // pre-split user has one. The pre-save hook below makes it a derived value
  // for new writes while leaving legacy documents readable as they are.
  full_name: String,
  email: { type: String, unique: true },
  phone: String,
  alt_phone: String,
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

/**
 * Keeps the two representations of a name in step, in both directions.
 *
 * Forward: whenever first/last are written, full_name is rebuilt from them,
 * so the existing read sites never see a stale value.
 *
 * Backward: a legacy document that only has full_name gets it split on first
 * access-and-save, so users registered before this change gradually acquire
 * the fields the booking flow prefills from — without a migration script and
 * without breaking anyone who never logs in again.
 */
UserSchema.pre("save", function () {
  const first = (this.first_name || "").trim();
  const last = (this.last_name || "").trim();

  if (first || last) {
    this.full_name = [first, last].filter(Boolean).join(" ");
    return;
  }

  const full = (this.full_name || "").trim();
  if (!full) return;
  // Normalise while we are here: legacy values carry stray padding.
  this.full_name = full;
  // Everything before the last space is the given name: "Maria Clara Santos"
  // splits to "Maria Clara" + "Santos", which is the right call for the
  // Philippine names this product actually holds.
  const parts = full.split(/\s+/);
  this.first_name = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  this.last_name = parts.length > 1 ? parts[parts.length - 1] : "";
});

// --- Performance indexes ---
UserSchema.index({ role: 1 });

module.exports = mongoose.model("User", UserSchema);