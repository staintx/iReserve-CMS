const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
  event_manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  staff_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

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
  total_price: Number,
  payment_method: String,
  payment_status: { type: String, enum: ["pending", "deposit_paid", "fully_paid", "refund_requested", "refunded"], default: "pending" },
  paymongo_checkout_session_id: String,
  paymongo_payment_intent_id: String,
  change_request: {
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    message: String,
    requested_at: Date,
    resolved_at: Date
  },
  status: { type: String, enum: ["pending deposit", "confirmed", "preparing", "ongoing", "completed", "cancelled"], default: "pending deposit" },
  staff_assignments: [
    {
      role: String,
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      phone: String
    }
  ],
  event_manager_notes: [
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
  inventory_items: [
    {
      inventory_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
      name: String,
      quantity: Number
    }
  ],
  equipment_returns: [
    {
      inventory_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
      name: String,
      quantity_booked: Number,
      quantity_returned: { type: Number, default: 0 },
      verified_at: Date,
      verified_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    }
  ],
  completed_at: Date
}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);