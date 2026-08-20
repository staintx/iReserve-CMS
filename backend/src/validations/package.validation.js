const Joi = require("joi");

/**
 * Fields a combo pack never carries.
 *
 * A Special Offer is food: the event-space build a regular package sells has no
 * meaning on one. The controllers clear these on every write, and this is the
 * layer in front of them — `.strip()` drops the value from the validated body
 * rather than rejecting the request, because an admin form that sends an empty
 * scaffold list is not making a mistake worth a 400.
 *
 * `Joi.when` on `offer_type` is what makes it conditional: regular packages
 * keep every one of these, untouched.
 */
const packageOnly = (schema) =>
  Joi.alternatives().conditional("offer_type", {
    is: "special",
    then: Joi.any().strip(),
    otherwise: schema,
  });


exports.packageSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  fullDescription: Joi.string().optional().allow(""),
  // A regular package's advisory guest range. A combo has one exact count
  // instead, so these are dropped for it rather than kept beside `guest_count`
  // where they would read as a second, contradicting answer.
  guest_min: packageOnly(Joi.number().optional().allow("")),
  guest_max: packageOnly(Joi.number().optional().allow("")),
  price_per_guest: Joi.number().min(0).optional().allow(""),
  // What a regular package's event set-up starts at. A combo has none.
  setup_price: packageOnly(Joi.number().min(0).optional().allow("")),
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
  add_ons: packageOnly(
    Joi.alternatives()
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
  ),
  features: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  event_type: Joi.string().optional().allow(""),
  package_type: Joi.string().optional().allow(""),

  // Special Offers live in the same collection as regular packages and are
  // told apart by this field alone — never by their name.
  offer_type: Joi.string().valid("regular", "special").optional().allow(""),
  // The combo's guest count. Required in practice for an offer — the create
  // controller rejects an offer without one, because the price is built from
  // it — and left blank on a regular package, which has a range instead.
  guest_count: Joi.number().integer().min(1).optional().allow(null, ""),
  // The combo's food travels as JSON in a multipart body, like the other
  // structured fields here. Each row is one dish and the course it belongs to.
  offer_food_items: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          menu_category: Joi.string().optional().allow(""),
          item_name: Joi.string().required(),
          sort_order: Joi.number().optional(),
          _id: Joi.string().optional(),
        }),
      ),
      Joi.string(),
    )
    .optional(),

  scaffold_size_options: packageOnly(
    Joi.alternatives()
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
  ),

  default_scaffold_option_id: packageOnly(
    Joi.string().optional().allow(null, ""),
  ),

  setup_equipment: packageOnly(
    Joi.alternatives()
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
  ),

  menu_items: packageOnly(
    Joi.alternatives()
      .try(Joi.array().items(Joi.string()), Joi.string())
      .optional(),
  ),
}).unknown(true);

exports.packageUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  fullDescription: Joi.string().optional().allow(""),
  // A regular package's advisory guest range. A combo has one exact count
  // instead, so these are dropped for it rather than kept beside `guest_count`
  // where they would read as a second, contradicting answer.
  guest_min: packageOnly(Joi.number().optional().allow("")),
  guest_max: packageOnly(Joi.number().optional().allow("")),
  price_per_guest: Joi.number().min(0).optional().allow(""),
  // What a regular package's event set-up starts at. A combo has none.
  setup_price: packageOnly(Joi.number().min(0).optional().allow("")),
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
  add_ons: packageOnly(
    Joi.alternatives()
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
  ),
  features: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  event_type: Joi.string().optional().allow(""),
  package_type: Joi.string().optional().allow(""),

  // Special Offers live in the same collection as regular packages and are
  // told apart by this field alone — never by their name.
  offer_type: Joi.string().valid("regular", "special").optional().allow(""),
  // The combo's guest count. Required in practice for an offer — the create
  // controller rejects an offer without one, because the price is built from
  // it — and left blank on a regular package, which has a range instead.
  guest_count: Joi.number().integer().min(1).optional().allow(null, ""),
  // The combo's food travels as JSON in a multipart body, like the other
  // structured fields here. Each row is one dish and the course it belongs to.
  offer_food_items: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          menu_category: Joi.string().optional().allow(""),
          item_name: Joi.string().required(),
          sort_order: Joi.number().optional(),
          _id: Joi.string().optional(),
        }),
      ),
      Joi.string(),
    )
    .optional(),
  gallery_to_remove: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),

  scaffold_size_options: packageOnly(
    Joi.alternatives()
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
  ),

  default_scaffold_option_id: packageOnly(
    Joi.string().optional().allow(null, ""),
  ),

  setup_equipment: packageOnly(
    Joi.alternatives()
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
  ),

  menu_items: packageOnly(
    Joi.alternatives()
      .try(Joi.array().items(Joi.string()), Joi.string())
      .optional(),
  ),
}).unknown(true);
