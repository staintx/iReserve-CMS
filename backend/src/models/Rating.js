const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  stars: Number,
  review: String
}, { timestamps: true });

module.exports = mongoose.model("Rating", RatingSchema);