const mongoose = require("mongoose");

const StaffAvailabilitySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  reason: { type: String, trim: true, default: "" }
}, { timestamps: true });

StaffAvailabilitySchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("StaffAvailability", StaffAvailabilitySchema);
