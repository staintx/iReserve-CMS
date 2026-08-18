const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    fullDescription: String,
    guest_min: Number,
    guest_max: Number,
    price_per_guest: Number,
    price_label: String,
    setup_price: Number,
    featured: { type: Boolean, default: false },
    badge_text: String,
    service_type: String,
    features: [String],
    
    // Admin-configurable scaffold size options for this package
    scaffold_size_options: [
      {
        label: String,
        width_ft: Number,
        length_ft: Number,
        area_ft2: Number,
        price: Number,
        guest_min: Number,  // ✅ Added guest range per scaffold option
        guest_max: Number,  // ✅ Added guest range per scaffold option
      },
    ],
    
    // Default selected scaffold option id
    default_scaffold_option_id: {
      type: String,
      default: null,
    },

    setup_equipment: [
      {
        inventory_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Inventory",
        },
        quantity: Number,
      },
    ],
    menu_items: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
    available: { type: Boolean, default: true },
    inclusions: [String],
    add_ons: [
      {
        name: String,
        qty: String,
      },
    ],
    image_url: String,
    gallery: [String],
    event_type: String,
    package_type: {
      type: String,
      enum: ["Food Only", "Event Setup Only", "Food + Event Setup"],
      default: "Event Setup Only",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Package", PackageSchema);