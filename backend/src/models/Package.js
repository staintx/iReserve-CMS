const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    fullDescription: String,
    size: String,
    guest_min: Number,
    guest_max: Number,
    price_per_guest: Number,
    setup_price: Number,
    // Admin-configurable scaffold size options for this package
    scaffold_size_options: [
      {
        label: String,
        width_ft: Number,
        length_ft: Number,
        area_ft2: Number,
        price: Number,
      },
    ],
    // Default selected scaffold option id (ObjectId of an entry in scaffold_size_options)
    default_scaffold_option_id: { type: mongoose.Schema.Types.ObjectId },
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
    add_ons: [String],
    image_url: String,
    gallery: [String],
    event_type: String,
    package_type: {
      type: String,
      enum: ["Food Only", "Event Setup Only", "Food + Event Setup"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Package", PackageSchema);
