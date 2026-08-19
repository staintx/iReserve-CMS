const mongoose = require("mongoose");

const ZelleConversationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    session_id: {
      type: String,
      default: null,
      index: true,
    },
    context: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "model", "function"],
          required: true,
        },
        parts: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        ui_cards: [
          {
            type: { type: String },
            data: mongoose.Schema.Types.Mixed,
          },
        ],
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metadata: {
      inquiry_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inquiry",
      },
      quotation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quotation",
      },
      booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
      total_tokens_used: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    expires_at: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
    },
  },
  { timestamps: true }
);

// Performance indexes
ZelleConversationSchema.index({ user_id: 1, context: 1 });
ZelleConversationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ZelleConversation", ZelleConversationSchema);
