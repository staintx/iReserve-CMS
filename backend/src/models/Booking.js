const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, sparse: true },

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
    },
    package_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    },
    event_manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // staff_ids removed – use staff_assignments instead

    event_type: { type: String, required: [true, "Event type is required"] },
    event_theme: String,

    event_date: { type: Date, required: [true, "Event date is required"] },
    start_time: { type: String, required: [true, "Start time is required"] },
    guest_count: { type: Number, required: [true, "Guest count is required"] },
    include_food: { type: Boolean, default: true },

    venue_type: String,
    service_type: {
      type: String,
      enum: ["Food Only", "Event Setup Only", "Food and Event Setup"],
    },
    delivery_method: {
      type: String,
      enum: ["delivery", "pickup", "setup"],
      default: "setup",
    },
    pickup_location: String,
    province: {
      type: String,
      required: function () {
        return this.delivery_method !== "pickup";
      },
    },
    municipality: {
      type: String,
      required: function () {
        return this.delivery_method !== "pickup";
      },
    },
    barangay: {
      type: String,
      required: function () {
        return this.delivery_method !== "pickup";
      },
    },
    street: String,
    landmark: String,
    zip_code: String,

    menu_items: [
      {
        name: String,
        note: String,
        price: Number,
      },
    ],

    dietary_restrictions: String,
    allergies: String,
    special_requests: String,

    service_items: [
      {
        name: String,
        quantity: Number,
        price: Number,
      },
    ],

    additional_charges: [
      {
        name: String,
        amount: Number,
      },
    ],

    contact_first_name: {
      type: String,
      required: [true, "Contact first name is required"],
    },
    contact_last_name: {
      type: String,
      required: [true, "Contact last name is required"],
    },
    contact_email: {
      type: String,
      required: [true, "Contact email is required"],
    },
    contact_phone: {
      type: String,
      required: [true, "Contact phone number is required"],
    },
    contact_alt_phone: String,
    contact_method: String,

    total_price: Number,
    discount_amount: { type: Number, default: 0 },
    payment_method: String,
    payment_status: {
      type: String,
      enum: [
        "pending",
        "deposit_paid",
        "fully_paid",
        "refund_requested",
        "refunded",
      ],
      default: "pending",
    },
    paymongo_checkout_session_id: String,
    paymongo_payment_intent_id: String,

    change_request: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      message: String,
      requested_at: Date,
      resolved_at: Date,
    },

    is_revised: { type: Boolean, default: false },
    revision_count: { type: Number, default: 0 },

    pending_revision: {
      status: {
        type: String,
        enum: ["none", "pending_customer_approval", "pending_admin_approval", "approved", "rejected"],
        default: "none",
      },
      proposed_by: { type: String, enum: ["admin", "customer"] },
      proposed_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      proposed_changes: { type: mongoose.Schema.Types.Mixed },
      proposed_snapshot: { type: mongoose.Schema.Types.Mixed },
      message: String,
      price_difference: { type: Number, default: 0 },
      requested_at: Date,
      resolved_at: Date,
      rejection_reason: String,
    },

    revisions: [
      {
        revision_number: { type: Number, required: true },
        proposed_by: String,
        confirmed_by: String,
        admin_confirmed_at: Date,
        customer_confirmed_at: Date,
        status: { type: String, enum: ["confirmed", "rejected"], default: "confirmed" },
        changes: { type: mongoose.Schema.Types.Mixed },
        message: String,
        price_difference: { type: Number, default: 0 },
        snapshot: { type: mongoose.Schema.Types.Mixed },
        created_at: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: [
        "inquiry", // Legacy
        "quote_sent", // Legacy
        "customer_accepted", // Legacy
        "pending deposit", // Legacy
        "Deposit Pending",
        "Confirmed",
        "Ocular Scheduled",
        "Final Payment Pending",
        "Ready for Event",
        "preparing", // Legacy
        "ongoing", // Legacy
        "Completed",
        "completed", // Legacy
        "Cancelled",
        "cancelled", // Legacy
        "refunded", // Legacy
      ],
      default: "Deposit Pending",
    },

    staff_assignments: [
      {
        role: String,
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: String,
        phone: String,
      },
    ],
    event_manager_notes: [
      {
        note: String,
        created_at: { type: Date, default: Date.now },
      },
    ],
    staff_reports: [
      {
        staff_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: String,
        note: String,
        created_at: { type: Date, default: Date.now },
      },
    ],
    inventory_items: [
      {
        inventory_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Inventory",
        },
        name: String,
        quantity: Number,
      },
    ],
    equipment_returns: [
      {
        inventory_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Inventory",
        },
        name: String,
        quantity_booked: Number,
        quantity_returned: { type: Number, default: 0 },
        verified_at: Date,
        verified_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    ocular_visit: {
      scheduled_date: Date,
      scheduled_time: String,
      status: {
        type: String,
        enum: ["pending", "requested", "scheduled", "completed", "skipped"],
        default: "pending",
      },
      outcome: { type: String, enum: ["proceed", "cancel", "reschedule"] },
      notes: String,
      completed_at: Date,
    },

    completed_at: Date,
  },
  { timestamps: true },
);

BookingSchema.pre("save", async function () {
  if (!this.reference) {
    const lastBooking = await mongoose.model("Booking").findOne({}, "reference").sort({ reference: -1 });
    let seq = 1;
    if (lastBooking && lastBooking.reference) {
      const match = lastBooking.reference.match(/CAZ-(\d+)/);
      if (match) {
        seq = parseInt(match[1], 10) + 1;
      }
    }
    this.reference = `CAZ-${String(seq).padStart(6, "0")}`;
  }
});

module.exports = mongoose.model("Booking", BookingSchema);
