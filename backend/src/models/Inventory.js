const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema({
  item_name: String,
  quantity: Number,
  category: String,
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Inventory", InventorySchema);