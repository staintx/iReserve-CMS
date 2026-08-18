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
        // The offer covers the setup at this size. Configured per size so a
        // rule like "20x40 is free set-up" is data rather than code. Sizes
        // without it are still selectable — what they cost is settled on the
        // quotation.
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
     * Special Offers are the same kind of record, listed and managed under
     * their own tab, and priced per person from `price_per_guest` against a
     * real (not estimated) guest count. Everything else on this schema still
     * applies to them — see utils/specialOffers.js for the rules.
     */
    offer_type: {
      type: String,
      enum: ["regular", "special"],
      default: "regular",
    },

    /**
     * Hard cap on the guest count, enforced when configured. Only Special
     * Offers enforce it: a regular package's guest range is guidance around an
     * estimate, an offer's cap is a limit on what is being sold.
     */
    max_guests: Number,

    /**
     * The offer's food rules, built from the existing menu catalogue.
     *
     * Each rule is one course the customer chooses from ("1 Viand", "3 Main
     * Courses"), or one that is simply included and never chosen (rice, water)
     * when `selectable` is false. `menu_items` is the allow-list for that rule,
     * so no dish list is ever hardcoded.
     */
    offer_menu_rules: [
      {
        // The menu course this rule draws from, as resolved by the shared
        // category taxonomy. Display only — `menu_items` is the allow-list
        // that actually decides what the customer may pick.
        group_id: String,
        label: String,
        required_count: { type: Number, default: 1 },
        selectable: { type: Boolean, default: true },
        note: String,
        menu_items: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" }],
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Package", PackageSchema);