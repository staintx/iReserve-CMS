const mongoose = require("mongoose");

const MenuItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  image_url: String,
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("MenuItem", MenuItemSchema);