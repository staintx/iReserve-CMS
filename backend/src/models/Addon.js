const mongoose = require("mongoose");

const AddonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Addon", AddonSchema);
