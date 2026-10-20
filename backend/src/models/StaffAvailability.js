const mongoose = require("mongoose");

const StaffAvailabilitySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  month: { type: String, trim: true, default: "", index: true },
  reason: { type: String, trim: true, default: "" },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true
  },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewed_at: { type: Date, default: null },
  rejection_reason: { type: String, trim: true, default: "" },
  request_id: { type: String, default: null, index: true }
}, { timestamps: true });

StaffAvailabilitySchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("StaffAvailability", StaffAvailabilitySchema);

