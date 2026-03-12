const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  staff_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  inquiry_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
  event_type: String,
  event_date: Date,
  guest_count: Number,
  venue: String,
  selected_menu: [String],
  additional_services: [String],
  total_price: Number,
  payment_status: { type: String, default: "pending" },
  status: { type: String, default: "active" }
}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);