const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ["support", "event"], required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event_manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },

  last_message: String,
  last_message_at: Date
}, { timestamps: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
