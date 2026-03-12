const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  payment_type: String,
  method: String,
  proof_url: String,
  status: { type: String, default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Payment", PaymentSchema);