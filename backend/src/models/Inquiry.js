const mongoose = require("mongoose");

const InquirySchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, sparse: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },

    /**
     * What kind of request this is, resolved from the package relation at
     * submission time — never guessed from a package name.
     *
     *   regular — the customer booked a regular package
     *   special — the customer booked a Special Offer
     *   custom  — no package: the customer built the event themselves
     *
     * The admin Inquiries list shows this beside the package name, so a
     * "Full Package" offer is never mistaken for a regular package that
     * happens to be called that.
     */
    booking_type: {
      type: String,
      enum: ["regular", "special", "custom"],
      default: "custom",
    },

    // The package name as it stood when the request was sent. The relation
    // above stays the source of truth; this keeps the list readable if the
    // package is later renamed or deleted.
    package_name_snapshot: String,

    // Special Offers only. `guest_count × price per person`, the base FOOD
    // price the offer promises. The quotation remains the final authority on
    // what is owed — this is the figure it starts from.
    offer_base_price: Number,
    // Whether the offer covers the setup at the size the customer chose.
    // There is no amount beside it on purpose: an offer's scaffold options
    // carry no price, and what an uncovered size costs is decided on the
    // quotation. Free setup belongs to a size, never to ordering food.
    offer_setup_is_free: { type: Boolean, default: false },

    
    event_type: { type: String, required: true },
    event_theme: String,
    // Colour names for the chosen theme, e.g. ["Navy", "Ivory", "Gold"].
    // `event_theme` alone used to be a free-text box, and what customers
    // actually typed into it was unusable ("hthh", "dddd"). The booking flow
    // now offers curated palettes, so staff receive the colours as data rather
    // than having to read them out of a sentence.
    event_palette: [String],
    event_date: { type: Date, required: true },
    start_time: { type: String, required: true },
    duration_hours: Number,
    guest_count: { type: Number, required: true },

    venue_type: String,
    // Not validated at the route layer (no Joi schema is wired to POST /inquiries),
    // so this enum is what actually guards the value — must stay in sync with the
    // canonical labels used everywhere else (Booking.service_type, StepServiceType.jsx).
    service_type: {
      type: String,
      enum: ["Food Only", "Event Setup Only", "Food and Event Setup"],
    },
    include_food: { type: Boolean, default: true },
    province: String,
    municipality: String,
    barangay: String,
    street: String,
    landmark: String,
    zip_code: String,

    budget_range: String,
    special_requests: String,
    is_custom_setup: { type: Boolean, default: false },
    custom_setup_scope: [String],
    inspiration_images: [String],
    custom_setup_notes: String,
    // `dietary_requirements` is the original single free-text field and is kept
    // for inquiries created before the booking flow split the question in two.
    // The wizard now sends `allergies` and `dietary_restrictions` separately —
    // without these two the kitchen never saw either answer, because a strict
    // schema dropped them silently.
    dietary_requirements: String,
    additional_services: [String],
    allergies: String,
    dietary_restrictions: String,

    delivery_method: { type: String, enum: ["delivery", "pickup", "setup"] },
    delivery_instructions: String,
    selected_menu: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
    service_items: [
      {
        name: String,
        description: String,
        quantity: Number,
        price: Number,
      }
    ],

    // Equipment carried over from the setup package the customer chose, so the
    // team can see what has to be reserved before the quotation goes out.
    inventory_items: [
      {
        inventory_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
        name: String,
        quantity: Number,
      }
    ],

    // The chosen scaffold footprint for setup bookings.
    selected_scaffold_option_id: String,
    scaffold_width: Number,
    scaffold_length: Number,
    scaffold_base_area: Number,
    scaffold_price: Number,

    // What the wizard showed the customer at the moment they submitted. It is a
    // record of the on-screen estimate only — Quotation.total_cost remains the
    // authoritative figure and is what the customer is actually charged.
    estimated_total: Number,

    contact_first_name: { type: String, required: true },
    contact_last_name: { type: String, required: true },
    contact_email: { type: String, required: true },
    contact_phone: { type: String, required: true },
    contact_alt_phone: String,
    contact_method: String,

    status: {
      type: String,
      enum: [
        "Pending Review",
        "Under Review",
        "Waiting for Customer",
        "Revision Requested",
        "Quotation Sent",
        "Quote Accepted",
        "Awaiting Final Confirmation",
        "Quote Rejected",
        "Expired",
        "Converted to Booking",
        // Both the admin Reject action and the customer's own cancel have
        // always written this value, but it was missing from the enum. It
        // survived only because updateInquiry used findByIdAndUpdate without
        // runValidators; the same write through .save() would have thrown.
        "Cancelled",
      ],
      default: "Pending Review",
    },

    /**
     * Archive is an admin filing decision, deliberately separate from status.
     *
     * Status says where a request is in the lifecycle; archived says the admin
     * no longer wants to see it in the active queue. Keeping them apart means
     * a cancelled inquiry can still be un-archived without inventing a status
     * to move it back to, and an admin can archive something at any status
     * without corrupting the lifecycle.
     */
    archived: { type: Boolean, default: false },
    archived_at: { type: Date },
    
    revision_count: { type: Number, default: 0 },
    
    is_migrated: { type: Boolean, default: false },
    converted_booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" }
  },
  { timestamps: true }
);

// --- Performance indexes ---
InquirySchema.index({ customer_id: 1 });
InquirySchema.index({ status: 1 });
InquirySchema.index({ reference: -1 });
// The admin list is always scoped by archived state, and usually by status too.
InquirySchema.index({ archived: 1, status: 1 });

InquirySchema.pre("save", async function () {
  if (!this.reference) {
    const lastInquiry = await mongoose.model("Inquiry").findOne({}, "reference").sort({ reference: -1 });
    let seq = 1;
    if (lastInquiry && lastInquiry.reference) {
      const match = lastInquiry.reference.match(/INQ-(\d+)/);
      if (match) {
        seq = parseInt(match[1], 10) + 1;
      }
    }
    this.reference = `INQ-${String(seq).padStart(6, "0")}`;
  }
});

module.exports = mongoose.model("Inquiry", InquirySchema);
