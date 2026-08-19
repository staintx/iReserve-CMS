const Package = require("../models/Package");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const logAction = require("../utils/logAction");
const {
  OFFER_TYPES,
  normalizeOfferMenuRules,
} = require("../utils/specialOffers");

/**
 * Special Offers and regular packages share this collection, so a body that
 * says nothing about its type is a regular package — the value every package
 * written before offers existed has.
 */
const normalizeOfferType = (value) =>
  value === OFFER_TYPES.SPECIAL ? OFFER_TYPES.SPECIAL : OFFER_TYPES.REGULAR;

/**
 * Scaffold sizes carry numbers and one flag from a multipart body, where
 * everything arrives as a string. Parsed in one place so create and update
 * cannot disagree about what "free set-up" means.
 *
 * `existing` is the stored list, used to carry forward the deprecated per-size
 * `price` on packages that were configured with one. The form stopped
 * collecting it — a size's cost is a quotation decision — so without this an
 * ordinary "save" on an old package would quietly wipe the figure its bookings
 * are still priced from.
 */
const normalizeScaffoldOptions = (options, existing = []) => {
  const priceById = new Map(
    (Array.isArray(existing) ? existing : [])
      .filter((option) => option?._id && option.price != null)
      .map((option) => [String(option._id), option.price]),
  );

  return (Array.isArray(options) ? options : []).map((option) => {
    const carriedPrice = option._id ? priceById.get(String(option._id)) : undefined;
    const free_setup = option.free_setup === true || option.free_setup === "true";

    return {
      ...option,
      guest_min: option.guest_min ? Number(option.guest_min) : undefined,
      guest_max: option.guest_max ? Number(option.guest_max) : undefined,
      free_setup,
      // Free set-up settles the price at zero; otherwise whatever was stored
      // before survives, and a new option simply has none.
      ...(free_setup
        ? { price: 0 }
        : carriedPrice !== undefined
          ? { price: carriedPrice }
          : {}),
    };
  });
};

const normalizeList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const canViewUnavailable = (user) => {
  if (!user) return false;
  return ["admin", "staff"].includes(user.role);
};

exports.create = async (req, res) => {
  let image_url = "";
  let gallery = [];

  if (req.files) {
    const uploadTasks = [];
    let imageTaskIndex = -1;
    const galleryTaskIndices = [];

    if (req.files.image && req.files.image[0]) {
      imageTaskIndex = uploadTasks.length;
      uploadTasks.push(
        uploadToCloudinary(req.files.image[0].buffer, "packages")
      );
    }

    if (req.files.gallery && req.files.gallery.length > 0) {
      req.files.gallery.forEach((file) => {
        galleryTaskIndices.push(uploadTasks.length);
        uploadTasks.push(uploadToCloudinary(file.buffer, "packages"));
      });
    }

    if (uploadTasks.length > 0) {
      const results = await Promise.all(uploadTasks);
      if (imageTaskIndex !== -1) {
        image_url = results[imageTaskIndex].secure_url;
      }
      if (galleryTaskIndices.length > 0) {
        gallery = galleryTaskIndices.map((idx) => results[idx].secure_url);
      }
    }
  }

  let setup_equipment = [];
  if (req.body.setup_equipment) {
    try {
      setup_equipment = JSON.parse(req.body.setup_equipment);
    } catch (e) {
      console.error("Failed to parse setup_equipment", e);
    }
  }

  let scaffold_size_options = [];
  if (req.body.scaffold_size_options) {
    try {
      scaffold_size_options = normalizeScaffoldOptions(
        JSON.parse(req.body.scaffold_size_options)
      );
    } catch (e) {
      console.error("Failed to parse scaffold_size_options", e);
    }
  }

  let menu_items = [];
  if (req.body.menu_items) {
    try {
      menu_items = JSON.parse(req.body.menu_items);
    } catch (e) {
      console.error("Failed to parse menu_items", e);
    }
  }

  let add_ons = [];
  if (req.body.add_ons) {
    try {
      add_ons = JSON.parse(req.body.add_ons);
    } catch (e) {
      console.error("Failed to parse add_ons", e);
    }
  }

  let features = [];
  if (req.body.features) {
    try {
      features = JSON.parse(req.body.features);
    } catch (e) {
      features = normalizeList(req.body.features);
    }
  }

  const offer_type = normalizeOfferType(req.body.offer_type);

  const payload = {
    ...req.body,
    package_type: req.body.package_type || "Event Setup Only",
    offer_type,
    // A cap only means something on a Special Offer, where the guest count is
    // the real number the price is built from.
    max_guests:
      offer_type === OFFER_TYPES.SPECIAL && req.body.max_guests
        ? Number(req.body.max_guests)
        : undefined,
    offer_menu_rules:
      offer_type === OFFER_TYPES.SPECIAL
        ? normalizeOfferMenuRules(req.body.offer_menu_rules)
        : [],
    inclusions: normalizeList(req.body.inclusions),
    add_ons,
    features,
    setup_equipment,
    scaffold_size_options,
    menu_items,
    image_url,
    gallery,
  };

  // Normalize empty default scaffold option id
  if (
    payload.default_scaffold_option_id === "" ||
    payload.default_scaffold_option_id === null
  ) {
    delete payload.default_scaffold_option_id;
  }

  // ✅ Auto-set default scaffold option if not provided
  if (!payload.default_scaffold_option_id && scaffold_size_options.length > 0) {
    payload.default_scaffold_option_id =
      scaffold_size_options[0]._id || scaffold_size_options[0].id || "0";
  }

  const pkg = await Package.create(payload);

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "package", action: "create", package_id: pkg._id });
  }

  logAction({
    user_id: req.user._id,
    action: "package_created",
    entity_type: "package",
    entity_id: pkg._id,
    details: `Created package "${pkg.name}"`,
    ip_address: req.ip,
  }).catch((err) => console.error("logAction error:", err));

  res.status(201).json(pkg);
};

exports.getAll = async (req, res) => {
  const query = canViewUnavailable(req.user) ? {} : { available: true };

  // `?offer_type=special` (or `regular`) narrows the list to one tab's worth.
  // Regular packages predate the field, so asking for regular has to include
  // the rows that have no value stored at all.
  const offerType = req.query.offer_type;
  if (offerType === OFFER_TYPES.SPECIAL) {
    query.offer_type = OFFER_TYPES.SPECIAL;
  } else if (offerType === OFFER_TYPES.REGULAR) {
    query.offer_type = { $ne: OFFER_TYPES.SPECIAL };
  }

  const packages = await Package.find(query).populate(
    "offer_menu_rules.menu_items",
    "name description category price image_url available"
  );
  res.json(packages);
};

exports.getById = async (req, res) => {
  const query = canViewUnavailable(req.user)
    ? { _id: req.params.id }
    : { _id: req.params.id, available: true };

  const pkg = await Package.findOne(query).populate(
    "offer_menu_rules.menu_items",
    "name description category price image_url available"
  );
  if (!pkg) return res.status(404).json({ message: "Package not found" });
  res.json(pkg);
};

exports.update = async (req, res) => {
  const current = await Package.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Package not found" });

  let data = {
    ...req.body,
    inclusions: req.body.inclusions
      ? normalizeList(req.body.inclusions)
      : undefined,
    gallery_to_remove: req.body.gallery_to_remove
      ? normalizeList(req.body.gallery_to_remove)
      : [],
  };

  if (req.body.add_ons) {
    try {
      data.add_ons = JSON.parse(req.body.add_ons);
    } catch (e) {
      console.error("Failed to parse add_ons", e);
    }
  }

  if (req.body.setup_equipment) {
    try {
      data.setup_equipment = JSON.parse(req.body.setup_equipment);
    } catch (e) {
      console.error("Failed to parse setup_equipment", e);
    }
  }

  if (req.body.scaffold_size_options) {
    try {
      data.scaffold_size_options = normalizeScaffoldOptions(
        JSON.parse(req.body.scaffold_size_options),
        current.scaffold_size_options,
      );
    } catch (e) {
      console.error("Failed to parse scaffold_size_options", e);
    }
  }

  // The type decides whether the offer-only fields mean anything. Resolved
  // against the stored package when the body does not restate it, so a partial
  // update can never silently demote a Special Offer to a regular package.
  const offerType = normalizeOfferType(req.body.offer_type ?? current.offer_type);
  data.offer_type = offerType;

  if (offerType === OFFER_TYPES.SPECIAL) {
    if (req.body.max_guests !== undefined) {
      // Explicitly null rather than undefined: mongoose drops undefined from an
      // update, so clearing a cap has to be a value the update actually carries.
      data.max_guests = req.body.max_guests ? Number(req.body.max_guests) : null;
    }
    if (req.body.offer_menu_rules !== undefined) {
      data.offer_menu_rules = normalizeOfferMenuRules(req.body.offer_menu_rules);
    }
  } else {
    // Converting an offer back to a regular package clears the fields only an
    // offer uses, rather than leaving a stale cap enforcing itself invisibly.
    data.max_guests = null;
    data.offer_menu_rules = [];
  }

  if (req.body.menu_items) {
    try {
      data.menu_items = JSON.parse(req.body.menu_items);
    } catch (e) {
      console.error("Failed to parse menu_items", e);
    }
  }

  if (req.body.features) {
    try {
      data.features = JSON.parse(req.body.features);
    } catch (e) {
      data.features = normalizeList(req.body.features);
    }
  }

  // Clean up undefined values
  if (data.inclusions === undefined) delete data.inclusions;
  if (data.add_ons === undefined) delete data.add_ons;
  if (data.scaffold_size_options === undefined)
    delete data.scaffold_size_options;

  if (req.files) {
    const uploadTasks = [];
    let imageTaskIndex = -1;
    const galleryTaskIndices = [];

    if (req.files.image && req.files.image[0]) {
      imageTaskIndex = uploadTasks.length;
      uploadTasks.push(
        uploadToCloudinary(req.files.image[0].buffer, "packages")
      );
    }

    if (req.files.gallery && req.files.gallery.length > 0) {
      req.files.gallery.forEach((file) => {
        galleryTaskIndices.push(uploadTasks.length);
        uploadTasks.push(uploadToCloudinary(file.buffer, "packages"));
      });
    }

    if (uploadTasks.length > 0) {
      const results = await Promise.all(uploadTasks);
      if (imageTaskIndex !== -1) {
        data.image_url = results[imageTaskIndex].secure_url;
      }
      if (galleryTaskIndices.length > 0) {
        data.$push = {
          gallery: { $each: galleryTaskIndices.map((idx) => results[idx].secure_url) },
        };
      }
    }
  }

  // Handle gallery removals. MongoDB rejects $pull and $push on the same array
  // path in one update, so when the admin removes and adds photos in the same
  // save the removals are applied as their own update first.
  if (data.gallery_to_remove.length > 0) {
    const pull = { gallery: { $in: data.gallery_to_remove } };
    if (data.$push && data.$push.gallery) {
      await Package.updateOne({ _id: req.params.id }, { $pull: pull });
    } else {
      data.$pull = pull;
    }
  }
  delete data.gallery_to_remove;

  const updated = await Package.findByIdAndUpdate(req.params.id, data, {
    new: true,
  });

  // Build changes object for the log
  const trackFields = [
    "name",
    "description",
    "fullDescription",
    "size",
    "price_per_guest",
    "price_label",
    "setup_price",
    "featured",
    "badge_text",
    "service_type",
    "features",
    "available",
    "event_type",
    "package_type",
    "guest_min", // ✅ Added to tracking
    "guest_max", // ✅ Added to tracking
    "offer_type",
    "max_guests",
    "booking_requirements",
    "cancellation_policy",
  ];
  const changes = {};
  for (const field of trackFields) {
    if (
      req.body[field] !== undefined &&
      String(current[field]) !== String(req.body[field])
    ) {
      changes[field] = { from: current[field], to: req.body[field] };
    }
  }

  // ✅ Track scaffold options changes
  if (req.body.scaffold_size_options) {
    const oldScaffold = JSON.stringify(current.scaffold_size_options || []);
    const newScaffold = JSON.stringify(data.scaffold_size_options || []);
    if (oldScaffold !== newScaffold) {
      changes.scaffold_size_options = {
        from: current.scaffold_size_options,
        to: data.scaffold_size_options,
      };
    }
  }

  const changedFieldNames = Object.keys(changes);
  const detailParts =
    changedFieldNames.length > 0
      ? changedFieldNames.join(", ")
      : Object.keys(req.body).join(", ");

  logAction({
    user_id: req.user._id,
    action: "package_updated",
    entity_type: "package",
    entity_id: updated._id,
    details: `Updated package "${updated.name}" — Fields: ${detailParts}`,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    ip_address: req.ip,
  }).catch((err) => console.error("logAction error:", err));

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "package", action: "update", package_id: updated._id });
  }

  res.json(updated);
};

exports.remove = async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  const pkgName = pkg ? pkg.name : req.params.id;
  await Package.findByIdAndDelete(req.params.id);

  await logAction({
    user_id: req.user._id,
    action: "package_deleted",
    entity_type: "package",
    entity_id: req.params.id,
    details: `Deleted package "${pkgName}"`,
    ip_address: req.ip,
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "package", action: "delete", package_id: req.params.id });
  }

  res.json({ message: "Deleted" });
};

exports.parseWithAI = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Gemini API Key missing" });
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are a data extraction assistant for an event catering CMS.
Extract the package details from the provided text or image into a strict JSON object.
Use the following schema:
{
  "name": "string (Package Name)",
  "package_type": "Event Setup Only",
  "offer_type": "regular",
  "guest_min": "number (minimum guests, omit if none)",
  "guest_max": "number (maximum guests, omit if none)",
  "setup_price": "number (if applicable)",
  "description": "string",
  "fullDescription": "string",
  "inclusions": ["string (e.g. '[Category] Item (Qty)')", "..."],
  "add_ons": [{"name": "string", "qty": "string"}],
  "scaffold_size_options": [
    {
      "label": "e.g. 20x40 Setup",
      "width_ft": 20,
      "length_ft": 40,
      "guest_min": 100,
      "guest_max": 150
    }
  ]
}

Guidelines for inclusions: Prefix each inclusion with a category in brackets, e.g., "[Dining & Service Inventory] Plates", "[Event Setup & Furniture] Couch". If quantity is specified, put it at the end in parentheses, e.g., "[Dining & Service Inventory] Glasses (100)".
If the document is a table with multiple sizes and guest capacities, extract them into scaffold_size_options.
Return ONLY valid JSON, without markdown formatting or code blocks.`;

    const parts = [prompt];
    
    if (req.file) {
      const mimeType = req.file.mimetype;
      parts.push({
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType
        }
      });
    } else if (req.body.text) {
      parts.push(req.body.text);
    } else {
      return res.status(400).json({ error: "No file or text provided" });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    let text = response.text().trim();
    if (text.startsWith("\`\`\`json")) text = text.substring(7);
    if (text.startsWith("\`\`\`")) text = text.substring(3);
    if (text.endsWith("\`\`\`")) text = text.substring(0, text.length - 3).trim();
    
    const parsedData = JSON.parse(text);
    res.json(parsedData);
  } catch (error) {
    console.error("AI Parse Error:", error);
    res.status(500).json({ error: "Failed to parse with AI", details: error.message });
  }
};
