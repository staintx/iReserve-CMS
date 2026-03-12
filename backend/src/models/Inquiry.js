const mongoose = require("mongoose");

const InquirySchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  event_type: String,
  event_date: Date,
  guest_count: Number,
  service_type: String,
  venue: String,
  budget_min: Number,
  budget_max: Number,
  menu_preferences: String,
  dietary_needs: String,
  furniture_setup: String,
  decor_lighting: String,
  additional_notes: String,
  status: { type: String, default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Inquiry", InquirySchema);