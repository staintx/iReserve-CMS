const mongoose = require("mongoose");

const InquirySchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
  event_type: String,
  event_theme: String,
  event_date: Date,
  start_time: String,
  guest_count: Number,
  duration_hours: Number,
  include_food: { type: Boolean, default: true },
  service_type: String,
  venue_type: String,
  indoor_outdoor: String,
  province: String,
  municipality: String,
  barangay: String,
  street: String,
  landmark: String,
  zip_code: String,
  venue_contact_name: String,
  venue_contact_phone: String,
  budget_min: Number,
  budget_max: Number,
  selected_menu: [String],
  menu_items: [
    {
      name: String,
      note: String,
      price: Number
    }
  ],
  dietary_restrictions: String,
  allergies: String,
  special_requests: String,
  additional_services: [String],
  service_items: [
    {
      name: String,
      quantity: Number,
      price: Number
    }
  ],
  additional_charges: [
    {
      name: String,
      amount: Number
    }
  ],
  contact_first_name: String,
  contact_last_name: String,
  contact_email: String,
  contact_phone: String,
  contact_alt_phone: String,
  contact_method: String,
  payment_method: String,
  package_amount: Number,
  quote_amount: Number,
  quote_notes: String,
  date_change_request: {
    message: String,
    current_date: Date,
    requested_at: Date,
    resolved_at: Date
  },
  quote_change_request: {
    message: String,
    requested_at: Date,
    resolved_at: Date
  },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewed_at: { type: Date },
  status: { type: String, default: "new" }
}, { timestamps: true });

module.exports = mongoose.model("Inquiry", InquirySchema);