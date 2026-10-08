const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  inquiry_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: function(val) {
        if (typeof val !== "number" || !Number.isFinite(val) || Number.isNaN(val)) return false;
        if (this.payment_type === "refund") {
          return val >= -10000000 && val <= 0;
        }
        return val >= 0 && val <= 10000000;
      },
      message: "Amount cannot exceed ₱10,000,000."
    }
  },
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