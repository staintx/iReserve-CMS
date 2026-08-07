const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ["support", "event", "inquiry"], required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event_manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  inquiry_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },

  last_message: String,
  last_message_at: Date,
  status: { type: String, enum: ["active", "archived"], default: "active" },
  unread_customer_count: { type: Number, default: 0 },
  unread_admin_count: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
