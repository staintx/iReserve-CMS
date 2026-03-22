const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema({
  name: String,
  description: String,
  fullDescription: String,
  size: String,
  price_min: Number,
  price_max: Number,
  available: { type: Boolean, default: true },
  booking_requirements: String,
  cancellation_policy: String,
  inclusions: [String],
  add_ons: [String],
  image_url: String
}, { timestamps: true });

module.exports = mongoose.model("Package", PackageSchema);