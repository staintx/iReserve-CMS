const mongoose = require("mongoose");

const GallerySchema = new mongoose.Schema({
  title: String,
  category: String,
  image_url: String,
  description: String
}, { timestamps: true });

module.exports = mongoose.model("Gallery", GallerySchema);