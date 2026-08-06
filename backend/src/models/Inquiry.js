const mongoose = require("mongoose");

const InquirySchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, sparse: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    package_id: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    
    event_type: { type: String, required: true },
    event_date: { type: Date, required: true },
    start_time: { type: String, required: true },
    guest_count: { type: Number, required: true },
    
    venue_type: String,
    province: String,
    municipality: String,
    barangay: String,
    street: String,
    landmark: String,
    zip_code: String,

    budget_range: String,
    special_requests: String,
    dietary_requirements: String,

    delivery_method: { type: String, enum: ["delivery", "pickup", "setup"] },
    selected_menu: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
    service_items: [
      {
        name: String,
        description: String,
        quantity: Number,
        price: Number,
      }
    ],

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
        "Quote Rejected",
        "Expired",
        "Converted to Booking",
      ],
      default: "Pending Review",
    },
    
    revision_count: { type: Number, default: 0 },
    
    is_migrated: { type: Boolean, default: false },
    converted_booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" }
  },
  { timestamps: true }
);

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
