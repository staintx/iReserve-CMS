const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema({
  name: String,
  description: String,
  fullDescription: String,
  size: String,
  guest_min: Number,
  guest_max: Number,
  price_per_guest: Number,
  available: { type: Boolean, default: true },
  inclusions: [String],
  add_ons: [String],
  image_url: String,
  gallery: [String],
  event_type: String,
  package_type: { type: String, enum: ["Food Only", "Event Setup Only", "Food + Event Setup"] }
}, { timestamps: true });

module.exports = mongoose.model("Package", PackageSchema);