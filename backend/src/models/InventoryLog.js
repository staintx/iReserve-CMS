const mongoose = require("mongoose");

const InventoryLogSchema = new mongoose.Schema(
  {
    inventory_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
    event_type: {
      type: String,
      enum: ["created", "manual_adjustment", "reservation_allocated", "reservation_released", "retired"],
      required: true,
    },
    delta: { type: Number, default: 0 },
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    reason: String,
  },
  { timestamps: true },
);

InventoryLogSchema.index({ inventory_id: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryLog", InventoryLogSchema);
