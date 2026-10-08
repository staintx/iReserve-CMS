const Joi = require("joi");
const { catalogNameRule, safeTextRule, monetaryRule, MAX_FINANCIAL_AMOUNT } = require("./rules.common");

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
  name: catalogNameRule(2, 100, true),
  description: safeTextRule(2000, true),
  fullDescription: safeTextRule(5000, false),
  // A regular package's advisory guest range. A combo has one exact count
  // instead, so these are dropped for it rather than kept beside `guest_count`
  // where they would read as a second, contradicting answer.
  guest_min: packageOnly(Joi.number().min(1).optional().allow("", null)),
  guest_max: packageOnly(Joi.number().min(1).optional().allow("", null)),
  price_per_guest: monetaryRule("Price per guest", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }).allow(""),
  // What a regular package's event set-up starts at. A combo has none.
  setup_price: packageOnly(monetaryRule("Setup price", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }).allow("")),
  price_label: safeTextRule(100, false),
  featured: Joi.boolean().optional(),
  badge_text: safeTextRule(50, false),
  service_type: safeTextRule(100, false),
  available: Joi.boolean().optional(),
  booking_requirements: safeTextRule(2000, false),
  cancellation_policy: safeTextRule(2000, false),
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
              price: monetaryRule("Add-on price", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }).allow(null, ""),
              pricing_type: Joi.string().valid("fixed", "quantity").optional(),
              inventory_id: Joi.string().optional().allow(null, ""),
              qty: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
              _id: Joi.string().optional(),
            }).unknown(true)
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
            price: monetaryRule("Scaffold option price", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }).allow(null, ""),
            baseSetupPrice: monetaryRule("Base setup price", { min: 0, max: MAX_FINANCIAL_AMOUNT, required: false, allowZero: true }).allow(null, ""),
            guest_min: Joi.number().optional().allow(null, ""),
            guest_max: Joi.number().optional().allow(null, ""),
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
  name: catalogNameRule(2, 100, false),
  description: safeTextRule(2000, false),
  fullDescription: safeTextRule(5000, false),
  // A regular package's advisory guest range. A combo has one exact count
  // instead, so these are dropped for it rather than kept beside `guest_count`
  // where they would read as a second, contradicting answer.
  guest_min: packageOnly(Joi.number().min(1).optional().allow("", null)),
  guest_max: packageOnly(Joi.number().min(1).optional().allow("", null)),
  price_per_guest: Joi.number().min(0).optional().allow(""),
  // What a regular package's event set-up starts at. A combo has none.
  setup_price: packageOnly(Joi.number().min(0).optional().allow("")),
  price_label: safeTextRule(100, false),
  featured: Joi.boolean().optional(),
  badge_text: safeTextRule(50, false),
  service_type: safeTextRule(100, false),
  available: Joi.boolean().optional(),
  booking_requirements: safeTextRule(2000, false),
  cancellation_policy: safeTextRule(2000, false),
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
              qty: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
              _id: Joi.string().optional(),
            }).unknown(true)
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
            price: Joi.number().min(0).optional().allow(null, ""),
            baseSetupPrice: Joi.number().min(0).optional().allow(null, ""),
            guest_min: Joi.number().optional().allow(null, ""),
            guest_max: Joi.number().optional().allow(null, ""),
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
