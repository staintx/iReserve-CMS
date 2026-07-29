const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema({
  name: String,
  description: String,
  fullDescription: String,
  size: String,
  guest_min: Number,
  guest_max: Number,
  price_per_guest: Number,
  setup_price: Number,
  setup_equipment: [{
    inventory_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
    quantity: Number
  }],
  available: { type: Boolean, default: true },
  inclusions: [String],
  add_ons: [String],
  image_url: String,
  gallery: [String],
  event_type: String,
  package_type: { type: String, enum: ["Food Only", "Event Setup Only", "Food + Event Setup"] }
}, { timestamps: true });

module.exports = mongoose.model("Package", PackageSchema);