const mongoose = require("mongoose");

const SystemLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: {
    type: String,
    required: true,
    enum: [
      // Package actions
      "package_created",
      "package_updated",
      "package_deleted",

      // Booking actions
      "booking_created",

      "booking_updated",
      "booking_deleted"
    ]
  },
  entity_type: {
    type: String,
    enum: ["package", "booking"]
  },
  entity_id: String,
  details: String,
  changes: { type: mongoose.Schema.Types.Mixed },
  ip_address: String
}, { timestamps: true });

SystemLogSchema.index({ createdAt: -1 });
SystemLogSchema.index({ action: 1 });
SystemLogSchema.index({ entity_type: 1 });

module.exports = mongoose.model("SystemLog", SystemLogSchema);