const mongoose = require("mongoose");

const AddonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Not required: add-on prices are quoted per event by the team, not fixed
  // at the catalog level.
  price: { type: Number, default: 0 },
  description: { type: String },
  pricing_type: {
    type: String,
    enum: ["fixed", "quantity"],
    default: "fixed",
  },
  available: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Addon", AddonSchema);
