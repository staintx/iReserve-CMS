const mongoose = require("mongoose");

const InventoryReservationSchema = new mongoose.Schema({
  inventory_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  event_date: { type: Date, required: true },
  quantity: { type: Number, required: true },
}, { timestamps: true });

InventoryReservationSchema.index({ event_date: 1, inventory_id: 1 });
InventoryReservationSchema.index({ booking_id: 1 });

module.exports = mongoose.model("InventoryReservation", InventoryReservationSchema);
