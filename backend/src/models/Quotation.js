const mongoose = require("mongoose");

const QuotationSchema = new mongoose.Schema(
  {
    quotation_number: { type: String, unique: true, sparse: true },
    inquiry_id: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry", required: true },
    version_number: { type: Number, default: 1 },
    
    // Details cloned from Inquiry/Package to lock in the quote
    package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    package_name: String,
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
      },
    ],
    
    transportation_fee: { type: Number, default: 0 },
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
    customer_response: String,
    
    status: {
      type: String,
      enum: [
        "Draft",
        "Sent",
        "Revision Requested",
        "Accepted",
        "Rejected",
        "Expired",
      ],
      default: "Draft",
    }
  },
  { timestamps: true }
);

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
