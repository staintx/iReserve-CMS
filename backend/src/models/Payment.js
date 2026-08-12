const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  inquiry_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  currency: { type: String, default: "PHP" },
  payment_type: String,
  method: String,
  proof_url: String,
  status: { type: String, default: "pending" },
  gateway: { type: String, default: "manual" },
  gateway_checkout_id: String,
  gateway_payment_intent_id: String,
  gateway_reference: String,
  checkout_url: String,
  paid_at: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// --- Performance indexes ---
PaymentSchema.index({ booking_id: 1, status: 1 });
PaymentSchema.index({ inquiry_id: 1, status: 1 });
PaymentSchema.index({ customer_id: 1, status: 1 });
PaymentSchema.index({ gateway_checkout_id: 1 });
PaymentSchema.index({ gateway_payment_intent_id: 1 });

module.exports = mongoose.model("Payment", PaymentSchema);