const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    password: { type: String, required: true },
    is_verified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);