const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema({
  item_name: String,
  quantity: { type: Number, min: 0 },
  category: String,
  minStock: { type: Number, min: 0 },
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Inventory", InventorySchema);