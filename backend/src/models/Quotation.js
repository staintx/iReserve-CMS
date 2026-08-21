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

    // Inclusions the customer is getting a different amount of.
    //
    // A package that includes six round tables can be quoted for three, or for
    // nine, without the line being removed and retyped. `base_quantity` is what
    // the package stated, `quantity` is what this quotation covers, and
    // `unit_price` is what one of them is worth; `amount` is the signed
    // difference the package price is adjusted by — negative when the count
    // came down, positive when it went up. The server recomputes `amount` from
    // the other three at save time, so it is a record, never an input.
    //
    // The matching entry in package_inclusions carries the new quantity in its
    // own text, so the customer's copy reads "Round Tables (3)" rather than
    // promising six and charging for three.
    inclusion_adjustments: [
      {
        name: String,
        base_quantity: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        unit_price: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],

    guest_count: Number,

    // One quoted dish.
    //
    // `pricing_type` is what lets a quotation say "2 bilao of Shanghai"
    // instead of assuming every dish scales to the whole guest list.
    // `per_guest` is the default and the original behaviour — price times
    // the guest count. `quantity` charges the stated number of the dish's
    // own units instead. `unit` is a free-text label ("bilao", "tray",
    // "pan"); nothing branches on its value, so any unit the kitchen uses
    // works without a schema change.
    //
    // `note` is what this dish is beyond its name and price: what a kilo of it
    // serves, how it is packed, how it is prepared. It is visible to both admin
    // and customer — there is deliberately no separate admin-only note on a
    // dish — and never factors into pricing. Quantity, unit and price are the
    // only inputs the total is computed from, so a note is never the place to
    // put a number the line should have been priced on.
    menu_items: [
      {
        name: String,
        // The course this dish belongs to ("Main Course", "Drinks"), copied
        // from the menu catalog. It is what the dish *is*, not something quoted
        // about it: read-only wherever it appears, never priced, and kept apart
        // from `note` because a category written into a note is a label
        // masquerading as a sentence the admin wrote.
        category: String,
        note: String,
        quantity: { type: Number, default: 1 },
        unit: String,
        pricing_type: {
          type: String,
          enum: ["per_guest", "quantity"],
          default: "per_guest",
        },
        price: Number,
      },
    ],

    // One quoted add-on: how many, at what unit price, and why.
    //
    // `pricing_type` is legacy. Add-ons were once either "fixed" (charged
    // once) or "quantity" (charged per unit), which is the same thing as a
    // quantity of one, so the builder now quotes every add-on by quantity.
    // Rows stored as "fixed" still price identically — see addOnsSubtotalOf.
    add_ons: [
      {
        name: String,
        quantity: Number,
        price: Number,
        note: String,
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
          event_theme: String,
          event_palette: [String],
          // The footprint the customer booked, already resolved to one label
          // ("20ft × 40ft"). Event space size and scaffold size are the same
          // measurement, so this is deliberately one field and not two.
          event_space_label: String,
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
          event_theme: String,
          event_palette: [String],
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
