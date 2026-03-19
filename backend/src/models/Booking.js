const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  staff_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  inquiry_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
  event_type: String,
  event_theme: String,
  event_date: Date,
  start_time: String,
  guest_count: Number,
  duration_hours: Number,
  include_food: { type: Boolean, default: true },
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
  contact_first_name: String,
  contact_last_name: String,
  contact_email: String,
  contact_phone: String,
  contact_alt_phone: String,
  contact_method: String,
  total_price: Number,
  payment_method: String,
  payment_status: { type: String, default: "pending" },
  status: { type: String, default: "active" },
  staff_assignments: [
    {
      role: String,
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      phone: String
    }
  ],
  manager_notes: [
    {
      note: String,
      created_at: { type: Date, default: Date.now }
    }
  ],
  staff_reports: [
    {
      staff_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: String,
      note: String,
      created_at: { type: Date, default: Date.now }
    }
  ],
  equipment_returns: [
    {
      name: String,
      returned: { type: Boolean, default: false },
      verified_at: Date,
      verified_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    }
  ],
  completed_at: Date
}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);