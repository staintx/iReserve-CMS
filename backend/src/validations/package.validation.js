const Joi = require("joi");

exports.packageSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  fullDescription: Joi.string().optional().allow(""),
  guest_min: Joi.number().optional().allow(""),
  guest_max: Joi.number().optional().allow(""),
  price_per_guest: Joi.number().optional().allow(""),
  price_label: Joi.string().optional().allow(""),
  featured: Joi.boolean().optional(),
  badge_text: Joi.string().optional().allow(""),
  service_type: Joi.string().optional().allow(""),
  available: Joi.boolean().optional(),
  booking_requirements: Joi.string().optional().allow(""),
  cancellation_policy: Joi.string().optional().allow(""),
  inclusions: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  add_ons: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.alternatives().try(
          Joi.string(),
          Joi.object({
            name: Joi.string().required(),
            price: Joi.number().optional().allow(0),
            pricing_type: Joi.string().valid("fixed", "quantity").optional(),
            inventory_id: Joi.string().optional().allow(null, ""),
            _id: Joi.string().optional(),
          })
        )
      ),
      Joi.string(),
    )
    .optional(),
  features: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  event_type: Joi.string().optional().allow(""),
  package_type: Joi.string().optional().allow(""),

  // Special Offers live in the same collection as regular packages and are
  // told apart by this field alone — never by their name.
  offer_type: Joi.string().valid("regular", "special").optional().allow(""),
  // The offer's hard guest cap. Blank means "no cap configured".
  max_guests: Joi.number().optional().allow(null, ""),
  // Food rules travel as JSON in a multipart body, like the other structured
  // fields here. Each rule names a course, how many items it takes, and which
  // catalogue items are allowed for it.
  offer_menu_rules: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          group_id: Joi.string().optional().allow(""),
          label: Joi.string().required(),
          required_count: Joi.number().min(0).optional(),
          selectable: Joi.boolean().optional(),
          note: Joi.string().optional().allow(""),
          menu_items: Joi.array().items(Joi.string()).optional(),
          _id: Joi.string().optional(),
        }),
      ),
      Joi.string(),
    )
    .optional(),

  scaffold_size_options: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          label: Joi.string().optional(),
          width_ft: Joi.number().optional(),
          length_ft: Joi.number().optional(),
          area_ft2: Joi.number().optional(),
          // No `price`. A scaffold option is a supported size and capacity;
          // any charge for it is decided on the quotation. Legacy rows may
          // still carry one, which `.unknown(true)` below lets through
          // untouched so an old package is never rejected on load.
          guest_min: Joi.number().optional().allow(null),
          guest_max: Joi.number().optional().allow(null),
          free_setup: Joi.boolean().optional(),
          _id: Joi.string().optional(),
        }).unknown(true),
      ),
      Joi.string(),
    )
    .optional(),

  default_scaffold_option_id: Joi.string().optional().allow(null, ""),

  setup_equipment: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          inventory_id: Joi.string().optional(),
          quantity: Joi.number().optional(),
        }),
      ),
      Joi.string(),
    )
    .optional(),

  menu_items: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
}).unknown(true);

exports.packageUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  fullDescription: Joi.string().optional().allow(""),
  guest_min: Joi.number().optional().allow(""),
  guest_max: Joi.number().optional().allow(""),
  price_per_guest: Joi.number().optional().allow(""),
  price_label: Joi.string().optional().allow(""),
  featured: Joi.boolean().optional(),
  badge_text: Joi.string().optional().allow(""),
  service_type: Joi.string().optional().allow(""),
  available: Joi.boolean().optional(),
  booking_requirements: Joi.string().optional().allow(""),
  cancellation_policy: Joi.string().optional().allow(""),
  inclusions: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  add_ons: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.alternatives().try(
          Joi.string(),
          Joi.object({
            name: Joi.string().required(),
            price: Joi.number().optional().allow(0),
            pricing_type: Joi.string().valid("fixed", "quantity").optional(),
            inventory_id: Joi.string().optional().allow(null, ""),
            _id: Joi.string().optional(),
          })
        )
      ),
      Joi.string(),
    )
    .optional(),
  features: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  event_type: Joi.string().optional().allow(""),
  package_type: Joi.string().optional().allow(""),

  // Special Offers live in the same collection as regular packages and are
  // told apart by this field alone — never by their name.
  offer_type: Joi.string().valid("regular", "special").optional().allow(""),
  // The offer's hard guest cap. Blank means "no cap configured".
  max_guests: Joi.number().optional().allow(null, ""),
  // Food rules travel as JSON in a multipart body, like the other structured
  // fields here. Each rule names a course, how many items it takes, and which
  // catalogue items are allowed for it.
  offer_menu_rules: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          group_id: Joi.string().optional().allow(""),
          label: Joi.string().required(),
          required_count: Joi.number().min(0).optional(),
          selectable: Joi.boolean().optional(),
          note: Joi.string().optional().allow(""),
          menu_items: Joi.array().items(Joi.string()).optional(),
          _id: Joi.string().optional(),
        }),
      ),
      Joi.string(),
    )
    .optional(),
  gallery_to_remove: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),

  scaffold_size_options: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          label: Joi.string().optional(),
          width_ft: Joi.number().optional(),
          length_ft: Joi.number().optional(),
          area_ft2: Joi.number().optional(),
          // No `price`. A scaffold option is a supported size and capacity;
          // any charge for it is decided on the quotation. Legacy rows may
          // still carry one, which `.unknown(true)` below lets through
          // untouched so an old package is never rejected on load.
          guest_min: Joi.number().optional().allow(null),
          guest_max: Joi.number().optional().allow(null),
          free_setup: Joi.boolean().optional(),
          _id: Joi.string().optional(),
        }).unknown(true),
      ),
      Joi.string(),
    )
    .optional(),

  default_scaffold_option_id: Joi.string().optional().allow(null, ""),

  setup_equipment: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          inventory_id: Joi.string().optional(),
          quantity: Joi.number().optional(),
        }),
      ),
      Joi.string(),
    )
    .optional(),

  menu_items: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
}).unknown(true);
