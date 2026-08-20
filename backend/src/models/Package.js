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
        /**
         * Deprecated: the package form no longer collects a scaffold price,
         * because what a size costs is a quotation decision rather than a
         * package one. Kept so packages priced this way before the change
         * still quote from their stored figure instead of silently dropping
         * to zero, and preserved across edits by the update controller.
         */
        price: Number,
        guest_min: Number,  // ✅ Added guest range per scaffold option
        guest_max: Number,  // ✅ Added guest range per scaffold option
        /**
         * Legacy: a size the package covers the set-up for at no charge.
         *
         * It existed for Special Offers, which used to carry scaffold sizes of
         * their own. An offer is now a combo pack and sells no event space, so
         * the admin form no longer offers the flag and nothing sets it. Kept
         * because rows configured with it still price and display from it, and
         * dropping the field would silently change what they cost.
         *
         * It was never a rule about catering: a package's setup fee is charged
         * whether or not food is ordered, and no code waives it for a meal.
         */
        free_setup: { type: Boolean, default: false },
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

    /**
     * Regular package or Special Offer.
     *
     * A Special Offer is a combo pack: the same kind of record, listed and
     * managed under its own tab, sold as a fixed meal for a fixed `guest_count`
     * at a fixed `price_per_guest` per pax. Everything else on this schema
     * still applies to them — see utils/specialOffers.js for the rules.
     */
    offer_type: {
      type: String,
      enum: ["regular", "special"],
      default: "regular",
    },

    /**
     * Special Offers only: how many guests the combo feeds.
     *
     * It is the combo's own number, not a range and not an estimate — a 10-pax
     * combo is booked for 10 guests — which is why it sits apart from
     * `guest_min`/`guest_max`, the advisory range a regular package carries.
     */
    guest_count: Number,

    /**
     * Special Offers only: the combo's food, exactly as it is served.
     *
     * A fixed list rather than a set of rules, because a combo is a decided
     * meal: the customer chooses nothing. `menu_category` is the course the
     * dish belongs to ("Main Course", "Noodles") and groups the list for
     * display; `sort_order` is the arrangement the admin gave it.
     */
    offer_food_items: [
      {
        menu_category: String,
        item_name: String,
        sort_order: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Package", PackageSchema);