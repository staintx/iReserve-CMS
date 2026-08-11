const mongoose = require("mongoose");

const AddonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  pricing_type: {
    type: String,
    enum: ["fixed", "quantity"],
    default: "fixed",
  },
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Addon", AddonSchema);
