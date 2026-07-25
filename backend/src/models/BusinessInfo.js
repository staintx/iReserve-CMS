const mongoose = require("mongoose");

const BusinessInfoSchema = new mongoose.Schema({
  business_name: String,
  contact_number: String,
  email: String,
  address: String,
  hours: String,
  facebook: String,
  instagram: String,
  terms_url: String,
  privacy_url: String,
  deposit_percentage: { type: Number, default: 20 }
}, { timestamps: true });

module.exports = mongoose.model("BusinessInfo", BusinessInfoSchema);
