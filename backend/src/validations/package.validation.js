const Joi = require("joi");

exports.packageSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  fullDescription: Joi.string().optional(),
  guest_min: Joi.number().optional().allow(""),
  guest_max: Joi.number().optional().allow(""),
  price_per_guest: Joi.number().optional().allow(""),
  price_label: Joi.string().optional().allow(""),
  featured: Joi.boolean().optional(),
  badge_text: Joi.string().optional().allow(""),
  service_type: Joi.string().optional().allow(""),
  available: Joi.boolean().optional(),
  booking_requirements: Joi.string().optional(),
  cancellation_policy: Joi.string().optional(),
  inclusions: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  add_ons: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  features: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  event_type: Joi.string().optional().allow(""),
  package_type: Joi.string().optional().allow(""),
  max_guests: Joi.number().optional().allow(null),

  scaffold_size_options: Joi.alternatives()
    .try(
      Joi.array().items(
        Joi.object({
          label: Joi.string().optional(),
          width_ft: Joi.number().optional(),
          length_ft: Joi.number().optional(),
          area_ft2: Joi.number().optional(),
          price: Joi.number().optional(),
          guest_min: Joi.number().optional().allow(null),
          guest_max: Joi.number().optional().allow(null),
          _id: Joi.string().optional(),
        }),
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
  fullDescription: Joi.string().optional(),
  guest_min: Joi.number().optional().allow(""),
  guest_max: Joi.number().optional().allow(""),
  price_per_guest: Joi.number().optional().allow(""),
  price_label: Joi.string().optional().allow(""),
  featured: Joi.boolean().optional(),
  badge_text: Joi.string().optional().allow(""),
  service_type: Joi.string().optional().allow(""),
  available: Joi.boolean().optional(),
  booking_requirements: Joi.string().optional(),
  cancellation_policy: Joi.string().optional(),
  inclusions: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  add_ons: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  features: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  event_type: Joi.string().optional().allow(""),
  package_type: Joi.string().optional().allow(""),
  max_guests: Joi.number().optional().allow(null),
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
          price: Joi.number().optional(),
          guest_min: Joi.number().optional().allow(null),
          guest_max: Joi.number().optional().allow(null),
          _id: Joi.string().optional(),
        }),
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
