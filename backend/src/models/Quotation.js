const mongoose = require("mongoose");

const QuotationSchema = new mongoose.Schema(
  {
    quotation_number: { type: String, unique: true, sparse: true },
    inquiry_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry", required: true },
    version_number: { type: Number, default: 1 },
    
    // Details cloned from Inquiry/Package to lock in the quote
    package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    package_name: String,

    // The package's own starting price at the moment this quotation was built:
    // the baseline the whole quote is adjusted from. Quotations saved before
    // this field existed have no starting price on record, so readers fall back
    // to package_price, which was the only package figure stored back then.
    package_starting_price: { type: Number, default: 0 },

    // The starting price after the removed inclusions below are deducted. This
    // stays the single package figure every downstream reader uses (booking
    // conversion, the customer's copy of the quotation, version diffs) so the
    // deduction system never has to be understood twice.
    package_price: { type: Number, default: 0 },

    // What the customer still gets. Inclusions the admin took out move to
    // removed_inclusions instead of being silently dropped, so both sides can
    // see what was removed and what each removal was worth.
    package_inclusions: [String],
    removed_inclusions: [
      {
        name: String,
        deduction: { type: Number, default: 0 },
      },
    ],

    guest_count: Number,

    menu_items: [
      {
        name: String,
        note: String,
        price: Number,
      },
    ],
    
    add_ons: [
      {
        name: String,
        quantity: Number,
        price: Number,
        pricing_type: { type: String, enum: ["fixed", "quantity"], default: "fixed" },
      },
    ],
    
    transportation_fee: { type: Number, default: 0 },

    // Named one-off charges the admin adds while quoting (overtime service,
    // special equipment, a transportation top-up). Replaces the two fixed fee
    // fields below, which could only ever describe two situations.
    additional_fees: [
      {
        name: String,
        amount: { type: Number, default: 0 },
      },
    ],

    // Deprecated: the Quotation Builder no longer writes these. They are kept
    // so quotations issued before custom fees existed still render their real
    // totals to the customer instead of losing two charges.
    equipment_fee: { type: Number, default: 0 },
    decoration_fee: { type: Number, default: 0 },

    taxes: { type: Number, default: 0 },
    discounts: { type: Number, default: 0 },
    
    subtotal: { type: Number, default: 0 },
    total_cost: { type: Number, default: 0 },
    deposit_amount: { type: Number, default: 0 },
    remaining_balance: { type: Number, default: 0 },
    
    expiration_date: { type: Date },
    admin_notes: String,

    // The event as it stood when this version was issued.
    //
    // A quotation is a point-in-time document: what the customer was sent has
    // to keep saying what it said, even after the inquiry moves on. Reading the
    // live inquiry instead meant the customer's copy of v1 silently redrew
    // itself with the details behind v2. The Inquiry remains the working record
    // of the booking; this is the copy that was quoted against.
    event_snapshot: {
      type: new mongoose.Schema(
        {
          contact_first_name: String,
          contact_last_name: String,
          contact_email: String,
          contact_phone: String,
          event_type: String,
          event_date: Date,
          start_time: String,
          duration_hours: Number,
          service_type: String,
          include_food: Boolean,
          delivery_method: String,
          venue_type: String,
          province: String,
          municipality: String,
          barangay: String,
          street: String,
          landmark: String,
          zip_code: String,
          special_requests: String,
          dietary_requirements: String,
          allergies: String,
          dietary_restrictions: String,
        },
        { _id: false }
      ),
      default: undefined,
    },

    // Unfinished edits to the customer's event details, held while a quotation
    // is still a Draft. The Inquiry stays the one source of truth for what the
    // event is: these values are written to it only when the quotation is
    // actually sent, so an abandoned draft never rewrites the booking. Nothing
    // reads this for pricing, and the customer never sees it.
    draft_details: {
      type: new mongoose.Schema(
        {
          contact_first_name: String,
          contact_last_name: String,
          contact_email: String,
          contact_phone: String,
          event_type: String,
          event_date: String,
          start_time: String,
          guest_count: String,
          service_type: String,
          include_food: Boolean,
          venue_type: String,
          province: String,
          municipality: String,
          barangay: String,
          street: String,
          landmark: String,
          zip_code: String,
        },
        { _id: false }
      ),
      default: undefined,
    },
    customer_response: String,
    // When the customer submitted customer_response. Kept separate from
    // updatedAt, which moves on any later write to this quotation.
    revision_requested_at: { type: Date },

    status: {
      type: String,
      enum: [
        "Draft",
        "Sent",
        "Revision Requested",
        "Accepted",
        "Awaiting Final Confirmation",
        "Converted to Booking",
        "Rejected",
        "Expired",
      ],
      default: "Draft",
    }
  },
  { timestamps: true }
);

// --- Performance indexes ---
QuotationSchema.index({ inquiry_id: 1, status: 1 });
QuotationSchema.index({ inquiry_id: 1, version_number: -1 });
QuotationSchema.index({ quotation_number: -1 });

QuotationSchema.pre("save", async function () {
  if (!this.quotation_number) {
    const lastQuote = await mongoose.model("Quotation").findOne({}, "quotation_number").sort({ quotation_number: -1 });
    let seq = 1;
    if (lastQuote && lastQuote.quotation_number) {
      const match = lastQuote.quotation_number.match(/QTN-(\d+)/);
      if (match) {
        seq = parseInt(match[1], 10) + 1;
      }
    }
    this.quotation_number = `QTN-${String(seq).padStart(6, "0")}`;
  }
});

module.exports = mongoose.model("Quotation", QuotationSchema);
