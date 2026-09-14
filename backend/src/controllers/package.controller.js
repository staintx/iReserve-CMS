const Package = require("../models/Package");
const Inventory = require("../models/Inventory");
const Addon = require("../models/Addon");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const logAction = require("../utils/logAction");
const {
  OFFER_TYPES,
  comboPayload,
  normalizeOfferFoodItems,
  normalizeOfferInclusions,
} = require("../utils/specialOffers");

const isSetupCategory = (cat) => {
  const c = String(cat || "").toLowerCase();
  return (
    c.includes("setup") ||
    c.includes("furniture") ||
    c.includes("equipment") ||
    c.includes("decoration")
  );
};

const isDiningCategory = (cat) => {
  const c = String(cat || "").toLowerCase();
  return c.includes("dining") || c.includes("service") || c.includes("tableware");
};

const parseInclusionCategoryAndName = (incStr) => {
  if (!incStr || typeof incStr !== "string") return { category: "", name: "" };
  const match = incStr.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    const category = match[1].trim();
    let name = match[2].trim();
    name = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    return { category, name };
  }
  let name = incStr.trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
  return { category: "", name };
};

async function validatePackageItems({
  isOffer,
  inclusions = [],
  add_ons = [],
  setup_equipment = [],
  existingInclusions = [],
  existingAddOns = [],
}) {
  const inventoryItems = await Inventory.find({}, "item_name category quantity");
  const addonItems = await Addon.find({}, "name");

  const existingInclusionsSet = new Set(
    existingInclusions.map((i) => String(i).toLowerCase().trim())
  );
  const existingAddOnsSet = new Set(
    existingAddOns.map((a) => String(a?.name || a).toLowerCase().trim())
  );

  if (isOffer) {
    // For Special Offers, combo inclusions must exist in Addons
    const validAddonNames = addonItems.map((a) => a.name.toLowerCase().trim());
    for (const inc of inclusions) {
      const clean = String(inc || "").trim().toLowerCase();
      if (!clean) continue;
      if (existingInclusionsSet.has(clean)) continue; // grandfather existing
      if (!validAddonNames.includes(clean)) {
        return `Combo Inclusion "${inc}" does not exist in Addons. Only existing Addons can be added.`;
      }
    }
  } else {
    // For Regular Packages:
    // 1. Inclusions must exist in Inventory under the appropriate category and not exceed Total Quantity
    const setupInventoryNames = inventoryItems
      .filter((i) => isSetupCategory(i.category))
      .map((i) => i.item_name.toLowerCase().trim());

    const diningInventoryNames = inventoryItems
      .filter((i) => isDiningCategory(i.category))
      .map((i) => i.item_name.toLowerCase().trim());

    const allInventoryNames = inventoryItems.map((i) =>
      i.item_name.toLowerCase().trim()
    );

    for (const inc of inclusions) {
      const cleanInc = String(inc || "").trim().toLowerCase();
      if (!cleanInc) continue;

      const { category, name } = parseInclusionCategoryAndName(inc);
      const nameLower = name.toLowerCase().trim();

      let matchedInvItem = null;
      if (isSetupCategory(category)) {
        matchedInvItem = inventoryItems.find(
          (i) => isSetupCategory(i.category) && i.item_name.toLowerCase().trim() === nameLower
        );
        if (!matchedInvItem && !existingInclusionsSet.has(cleanInc)) {
          return `Inclusion "${name}" does not exist in Event Setup & Furniture inventory.`;
        }
      } else if (isDiningCategory(category)) {
        matchedInvItem = inventoryItems.find(
          (i) => isDiningCategory(i.category) && i.item_name.toLowerCase().trim() === nameLower
        );
        if (!matchedInvItem && !existingInclusionsSet.has(cleanInc)) {
          return `Inclusion "${name}" does not exist in Dining & Service inventory.`;
        }
      } else {
        matchedInvItem = inventoryItems.find(
          (i) => i.item_name.toLowerCase().trim() === nameLower
        );
        if (!matchedInvItem && !existingInclusionsSet.has(cleanInc)) {
          return `Inclusion "${name}" does not exist in Inventory.`;
        }
      }

      // Quantity validation against Inventory Total Quantity
      if (matchedInvItem && matchedInvItem.quantity != null) {
        const qtyMatch = String(inc).match(/\(([^)]+)\)/);
        if (qtyMatch) {
          const digits = qtyMatch[1].match(/\d+/g);
          if (digits && digits.length > 0) {
            const enteredQty = Math.max(...digits.map((n) => parseInt(n, 10)));
            if (enteredQty > matchedInvItem.quantity) {
              return `Quantity for "${matchedInvItem.item_name}" (${enteredQty}) exceeds total inventory. Maximum available quantity is ${matchedInvItem.quantity}.`;
            }
          }
        }
      }
    }

    // 2. Addons must exist in Addons
    const validAddonNames = addonItems.map((a) => a.name.toLowerCase().trim());
    for (const addon of add_ons) {
      const addonName = typeof addon === "string" ? addon : addon?.name;
      const cleanName = String(addonName || "").trim().toLowerCase();
      if (!cleanName) continue;
      if (existingAddOnsSet.has(cleanName)) continue; // grandfather existing
      if (!validAddonNames.includes(cleanName)) {
        return `Add-on "${addonName}" does not exist in Addons.`;
      }
    }

    // 3. Setup equipment quantity validation (if sent via API)
    if (Array.isArray(setup_equipment)) {
      for (const eq of setup_equipment) {
        if (!eq || !eq.inventory_id) continue;
        const invItem = inventoryItems.find(
          (i) => String(i._id) === String(eq.inventory_id)
        );
        if (invItem && invItem.quantity != null && Number(eq.quantity) > invItem.quantity) {
          return `Quantity for "${invItem.item_name}" (${eq.quantity}) exceeds total inventory. Maximum available quantity is ${invItem.quantity}.`;
        }
      }
    }
  }

  return null; // Valid
}

/**
 * Sanitizes inclusions, add-ons, and equipment for AI-generated packages.
 * Missing items that do not exist in Inventory or Addons are skipped
 * individually, keeping all valid items and avoiding fatal import errors.
 */
async function sanitizeAIPackageItems({
  isOffer,
  inclusions = [],
  add_ons = [],
  setup_equipment = [],
}) {
  const inventoryItems = await Inventory.find({}, "item_name category quantity");
  const addonItems = await Addon.find({}, "name");

  const validAddonNames = new Set(
    addonItems.map((a) => (a.name || "").toLowerCase().trim())
  );

  const filteredInclusions = [];
  const skippedInclusions = [];

  const filteredAddOns = [];
  const skippedAddOns = [];

  if (isOffer) {
    // For Special Offers, combo inclusions must exist in Addons
    for (const inc of inclusions) {
      const clean = String(inc || "").trim();
      if (!clean) continue;
      if (validAddonNames.has(clean.toLowerCase())) {
        filteredInclusions.push(clean);
      } else {
        skippedInclusions.push(clean);
      }
    }
  } else {
    // For Regular Packages:
    // Inclusions must exist in Inventory under the appropriate category
    for (const inc of inclusions) {
      const cleanInc = String(inc || "").trim();
      if (!cleanInc) continue;

      const { category, name } = parseInclusionCategoryAndName(cleanInc);
      const nameLower = name.toLowerCase().trim();

      let matchedInvItem = null;
      if (isSetupCategory(category)) {
        matchedInvItem = inventoryItems.find(
          (i) => isSetupCategory(i.category) && i.item_name.toLowerCase().trim() === nameLower
        );
      } else if (isDiningCategory(category)) {
        matchedInvItem = inventoryItems.find(
          (i) => isDiningCategory(i.category) && i.item_name.toLowerCase().trim() === nameLower
        );
      } else {
        matchedInvItem = inventoryItems.find(
          (i) => i.item_name.toLowerCase().trim() === nameLower
        );
      }

      // Fallback: match by name across all inventory categories if category tag was omitted or ambiguous
      if (!matchedInvItem) {
        matchedInvItem = inventoryItems.find(
          (i) => i.item_name.toLowerCase().trim() === nameLower
        );
      }

      if (matchedInvItem) {
        let finalInc = cleanInc;
        // Clamp quantity if specified in parentheses and exceeds total quantity
        if (matchedInvItem.quantity != null) {
          const qtyMatch = cleanInc.match(/\(([^)]+)\)/);
          if (qtyMatch) {
            const digits = qtyMatch[1].match(/\d+/g);
            if (digits && digits.length > 0) {
              const enteredQty = Math.max(...digits.map((n) => parseInt(n, 10)));
              if (enteredQty > matchedInvItem.quantity) {
                finalInc = cleanInc.replace(qtyMatch[0], `(${matchedInvItem.quantity})`);
              }
            }
          }
        }
        filteredInclusions.push(finalInc);
      } else {
        skippedInclusions.push(cleanInc);
      }
    }

    // Addons must exist in Addons
    for (const addon of add_ons) {
      const addonName = typeof addon === "string" ? addon : addon?.name;
      const cleanName = String(addonName || "").trim();
      if (!cleanName) continue;
      if (validAddonNames.has(cleanName.toLowerCase())) {
        filteredAddOns.push(
          typeof addon === "string"
            ? { name: cleanName, qty: "" }
            : { name: cleanName, qty: addon.qty || "" }
        );
      } else {
        skippedAddOns.push(cleanName);
      }
    }
  }

  // Filter setup equipment if any
  const filteredSetupEquipment = [];
  if (Array.isArray(setup_equipment)) {
    for (const eq of setup_equipment) {
      if (!eq || !eq.inventory_id) continue;
      const invItem = inventoryItems.find(
        (i) => String(i._id) === String(eq.inventory_id)
      );
      if (invItem) {
        const qty =
          invItem.quantity != null
            ? Math.min(Number(eq.quantity) || 1, invItem.quantity)
            : Number(eq.quantity) || 1;
        filteredSetupEquipment.push({
          ...eq,
          quantity: qty,
        });
      }
    }
  }

  return {
    inclusions: filteredInclusions,
    add_ons: filteredAddOns,
    setup_equipment: filteredSetupEquipment,
    skippedInclusions,
    skippedAddOns,
  };
}

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

/**
 * Recursively parses and unwraps any JSON-stringified value or nested array into a flat list of clean strings.
 */
const unwrapJsonOrArray = (raw) => {
  if (!raw) return [];
  let current = raw;
  for (let depth = 0; depth < 5; depth++) {
    if (typeof current === "string") {
      const trimmed = current.trim();
      if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          current = JSON.parse(trimmed);
        } catch {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (Array.isArray(current)) {
    return current.flat(Infinity);
  }
  if (typeof current === "string") {
    // If it was a plain comma-separated string (e.g. "item1, item2") rather than JSON
    if (current.includes(",")) {
      return current.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [current.trim()].filter(Boolean);
  }
  return [];
};

/**
 * Strips accidental wrapping quotes, escapes, and rogue array bracket artifacts
 * while preserving legitimate inclusion category brackets like `[Event Setup & Furniture]`.
 */
const sanitizeItemString = (val) => {
  if (val == null) return "";
  let s = String(val).trim();

  // Strip wrapping quotes and escape slashes repeatedly
  for (let i = 0; i < 4; i++) {
    s = s.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  // Remove any nested brackets with quotes e.g. `["[`, `[\[`, `[\"`
  s = s.replace(/^\[+[\s"'\\]*\[/, "[");
  s = s.replace(/\]+[\s"'\\]*\]+$/, "]");

  // If there are still escaped quotes or stray quotes around or right after `[`:
  s = s.replace(/^\[+[\s"'\\]+/, "[");
  s = s.replace(/[\s"'\\]+\]+$/, "]");

  // Remove stray quotes/slashes at start or end again
  for (let i = 0; i < 4; i++) {
    s = s.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  // Check balanced brackets
  const openCount = (s.match(/\[/g) || []).length;
  const closeCount = (s.match(/\]/g) || []).length;
  if (closeCount > openCount) {
    s = s.replace(/\]+$/, "");
  } else if (openCount > closeCount && !s.includes("]")) {
    s = s.replace(/^\[+/, "");
  }

  return s.trim();
};

const normalizeStringList = (value) => {
  if (!value) return [];
  const rawList = unwrapJsonOrArray(value);
  const seen = new Set();
  const result = [];

  rawList.forEach((item) => {
    if (!item) return;
    const unwrapped = unwrapJsonOrArray(item);
    unwrapped.forEach((subItem) => {
      const cleaned = sanitizeItemString(subItem);
      if (!cleaned) return;
      const lower = cleaned.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      result.push(cleaned);
    });
  });

  return result;
};

const sanitizePackageDoc = (pkg) => {
  if (!pkg) return pkg;
  const doc = pkg.toObject ? pkg.toObject() : { ...pkg };
  if (Array.isArray(doc.inclusions)) {
    doc.inclusions = normalizeStringList(doc.inclusions);
  }
  if (Array.isArray(doc.offer_food_items) && doc.offer_food_items.length > 0) {
    doc.offer_food_items = normalizeOfferFoodItems(doc.offer_food_items);
  }
  if (Array.isArray(doc.features)) {
    doc.features = normalizeStringList(doc.features);
  }
  return doc;
};

/**
 * Whether an incoming body describes a combo. Read before the payload is built
 * so the event-space parsing above can be skipped entirely rather than done and
 * then thrown away.
 */
const isSpecialOfferBody = (body) =>
  normalizeOfferType(body?.offer_type) === OFFER_TYPES.SPECIAL;

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
  if (req.body.scaffold_size_options && !isSpecialOfferBody(req.body)) {
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
      features = normalizeStringList(req.body.features);
    }
  }

  const offer_type = normalizeOfferType(req.body.offer_type);
  const isOffer = offer_type === OFFER_TYPES.SPECIAL;

  // A combo is sold as "N guests at ₱X each", so neither number is optional:
  // without them the offer has no price and no size, and every surface that
  // renders it would have to invent one.
  if (isOffer) {
    if (!(Number(req.body.price_per_guest) >= 0)) {
      return res.status(400).json({
        message: "Set this combo's price per pax.",
      });
    }
  }

  const rawInclusions = req.body.inclusions !== undefined ? req.body.inclusions : req.body["inclusions[]"];

  const basePayload = {
    ...req.body,
    package_type: req.body.package_type || "Event Setup Only",
    offer_type,
    guest_count: isOffer && req.body.guest_count ? Math.floor(Number(req.body.guest_count)) : undefined,
    offer_food_items: isOffer
      ? normalizeOfferFoodItems(req.body.offer_food_items)
      : [],
    // A combo's inclusions are plain lines the admin typed; a package's carry
    // the inventory class they came from, which normalizeStringList keeps intact.
    inclusions:
      isOffer || req.body.package_type === "Food Only"
        ? normalizeOfferInclusions(rawInclusions)
        : normalizeStringList(rawInclusions),
    add_ons: isOffer || req.body.package_type === "Food Only" ? [] : add_ons,
    features,
    setup_equipment: isOffer || req.body.package_type === "Food Only" ? [] : setup_equipment,
    scaffold_size_options: isOffer || req.body.package_type === "Food Only" ? [] : scaffold_size_options,
    menu_items,
    image_url,
    gallery,
  };

  // A combo is food: the event-space build a regular package sells is stripped
  // here, in one place, so nothing about scaffolds, setup or add-ons can reach
  // an offer however it was sent.
  const payload = isOffer ? comboPayload(basePayload) : basePayload;

  if (req.body.is_ai_generated || req.body.skip_missing_items) {
    const sanitized = await sanitizeAIPackageItems({
      isOffer,
      inclusions: payload.inclusions || [],
      add_ons: payload.add_ons || [],
      setup_equipment: payload.setup_equipment || [],
    });
    payload.inclusions = sanitized.inclusions;
    payload.add_ons = sanitized.add_ons;
    if (sanitized.setup_equipment?.length > 0) {
      payload.setup_equipment = sanitized.setup_equipment;
    }
  } else {
    const validationError = await validatePackageItems({
      isOffer,
      inclusions: payload.inclusions || [],
      add_ons: payload.add_ons || [],
      setup_equipment: payload.setup_equipment || [],
    });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
  }

  if (!isOffer && payload.package_type !== "Food Only") {
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
  } else {
    delete payload.default_scaffold_option_id;
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

  // A combo's food is stored on the offer itself, so nothing here needs
  // populating: the list the customer sees is the list that was saved.
  const packages = await Package.find(query);
  res.json(packages.map(sanitizePackageDoc));
};

exports.getById = async (req, res) => {
  const query = canViewUnavailable(req.user)
    ? { _id: req.params.id }
    : { _id: req.params.id, available: true };

  const pkg = await Package.findOne(query);
  if (!pkg) return res.status(404).json({ message: "Package not found" });
  res.json(sanitizePackageDoc(pkg));
};

exports.update = async (req, res) => {
  const current = await Package.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Package not found" });

  const offerType = normalizeOfferType(req.body.offer_type ?? current.offer_type);
  const isOffer = offerType === OFFER_TYPES.SPECIAL;
  const isFoodOnly = (req.body.package_type ?? current.package_type) === "Food Only";

  const rawInclusions = req.body.inclusions !== undefined ? req.body.inclusions : req.body["inclusions[]"];

  let data = {
    ...req.body,
    inclusions: rawInclusions !== undefined
      ? isOffer || isFoodOnly
        ? normalizeOfferInclusions(rawInclusions)
        : normalizeStringList(rawInclusions)
      : undefined,
    gallery_to_remove: req.body.gallery_to_remove
      ? normalizeStringList(req.body.gallery_to_remove)
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

  if (req.body.scaffold_size_options && !isOffer && !isFoodOnly) {
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
  data.offer_type = offerType;

  if (isOffer) {
    if (req.body.guest_count !== undefined && req.body.guest_count !== null && req.body.guest_count !== "") {
      const guestCount = Math.floor(Number(req.body.guest_count) || 0);
      if (guestCount >= 1) {
        data.guest_count = guestCount;
      }
    }
    if (
      req.body.price_per_guest !== undefined &&
      !(Number(req.body.price_per_guest) >= 0)
    ) {
      return res.status(400).json({ message: "Set this combo's price per pax." });
    }
    if (req.body.offer_food_items !== undefined) {
      data.offer_food_items = normalizeOfferFoodItems(req.body.offer_food_items);
    }
  } else {
    // Converting an offer back to a regular package clears the fields only a
    // combo uses, rather than leaving a stale guest count or dish list behind.
    // Explicitly null rather than undefined: mongoose drops undefined from an
    // update, so clearing has to be a value the update actually carries.
    data.guest_count = null;
    data.offer_food_items = [];
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
      data.features = normalizeStringList(req.body.features);
    }
  }

  // Clean up undefined values
  if (data.inclusions === undefined) delete data.inclusions;
  if (data.add_ons === undefined) delete data.add_ons;
  if (data.scaffold_size_options === undefined)
    delete data.scaffold_size_options;

  // The same boundary as on create, and the reason a regular package converted
  // to a combo does not keep the scaffold sizes it used to be sold in.
  if (isOffer) {
    data = comboPayload(data);
  } else if (isFoodOnly) {
    data.scaffold_size_options = [];
    data.setup_equipment = [];
    data.add_ons = [];
    data.default_scaffold_option_id = null;
  }

  const validationError = await validatePackageItems({
    isOffer,
    inclusions:
      data.inclusions !== undefined
        ? data.inclusions
        : current.inclusions || [],
    add_ons:
      data.add_ons !== undefined ? data.add_ons : current.add_ons || [],
    setup_equipment:
      data.setup_equipment !== undefined
        ? data.setup_equipment
        : current.setup_equipment || [],
    existingInclusions: current.inclusions || [],
    existingAddOns: current.add_ons || [],
  });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

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
    "guest_count",
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

  res.json(sanitizePackageDoc(updated));
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
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    
    const isOffer = req.body.offer_type === OFFER_TYPES.SPECIAL;

    const comboPrompt = `You are a data extraction assistant for an event catering CMS.
Extract ALL COMBO PACKS from the provided document/text into a JSON object with a "packages" array.
If there is only 1 combo pack, return an array of 1 item in "packages".
A combo pack is a fixed combo meal: a set list of dishes, for a fixed number of guests, at a fixed price per pax.
Use the following schema:
{
  "packages": [
    {
      "name": "string (Combo Name)",
      "offer_type": "special",
      "guest_count": "number (how many guests the combo serves)",
      "price_per_guest": "number (price per pax/person, digits only)",
      "description": "string (one or two sentences for the combo card)",
      "fullDescription": "string (longer description)",
      "offer_food_items": [
        { "menu_category": "e.g. Main Course, Noodles, Rice, Dessert, Beverage", "item_name": "e.g. Chicken BBQ" }
      ],
      "inclusions": ["string, e.g. Buffet setup", "Serving utensils", "..."]
    }
  ]
}

Guidelines:
- "guest_count" is how many people the combo feeds (e.g. "Good for 10 pax" is 10). It is NOT a range.
- "price_per_guest" is the per-head rate. If only a total price and a guest count are given, divide to get it.
- Every dish is its own entry in offer_food_items, with the course it belongs to as menu_category.
- inclusions are non-food items that come with the combo. Plain text, no bracketed category prefix.
- Omit any field the document does not state. Never invent a price or a guest count.
Return ONLY valid JSON.`;

    const packagePrompt = `You are an expert data extraction assistant for an event catering CMS.
Analyze the provided document (which may contain multiple pages, flyers, or size tiers) and extract ALL distinct event packages into a JSON object with a "packages" array.
Each page or distinct setup tier (e.g. "Birthday Setup 20x20", "Birthday Setup 20x40", "Wedding Setup 40x40", etc.) should be extracted as its own distinct package in the "packages" array so they can be individually booked and managed.

Use the following schema:
{
  "packages": [
    {
      "name": "string (Descriptive Package Name, e.g. 'Birthday Package - 20x20' or 'Wedding Package - 40x60')",
      "event_type": "string (e.g. 'Birthday', 'Wedding', 'Debut', 'Corporate', 'General')",
      "package_type": "Event Setup Only",
      "guest_min": "number (minimum guest capacity, derived from table/chair count if not explicit)",
      "guest_max": "number (maximum guest capacity, e.g. 60 from 60 Monoblock Chairs)",
      "setup_price": "number (base/starting price digits only, e.g. 15000 from '₱15,000 - ₱17,000')",
      "price_label": "string (original formatted price string if a range, e.g. '₱15,000 - ₱17,000')",
      "description": "string (short 1-2 sentence overview mentioning theme and setup size)",
      "fullDescription": "string (comprehensive overview of setup and key inclusions)",
      "inclusions": [
        "string (e.g. '[Event Setup & Furniture] Stage Setup', '[Dining & Service Inventory] Food Warmer (7)', '[Dining & Service Inventory] Plates (150)')"
      ],
      "add_ons": [
        { "name": "string (e.g. Standee)", "qty": "string (optional qty or empty)" }
      ],
      "scaffold_size_options": [
        {
          "label": "string (e.g. 20x20 Setup)",
          "width_ft": 20,
          "length_ft": 20,
          "guest_min": 50,
          "guest_max": 60
        }
      ]
    }
  ]
}

Guidelines:
1. Multi-Page & Multi-Tier Extraction: If the PDF or document contains multiple pages or tiers (e.g. Page 1 Birthday 20x20, Page 2 Birthday 20x40, Page 4 Wedding 20x40, etc.), create a distinct package entry for EACH setup tier.
2. Inclusions Formatting: Prefix every inclusion with its category in brackets:
   - [Event Setup & Furniture] for backdrops, stages, couches, carpets, tables, chairs, fans, lighting, draping, dove, chandelier, etc.
   - [Dining & Service Inventory] for food warmers, chafing dishes, spoons, plates, cutlery, glassware, coolers, ice, water jugs, mineral water gallons, dishwashing items, staff/crew, etc.
   - [Food & Beverage] for edible dishes, meals, or desserts.
   Always include item quantities in parentheses if mentioned (e.g. '[Dining & Service Inventory] Plates (150)').
3. Add-ons: Extract all optional/adds-on items into the add_ons array as objects with "name" and optional "qty".
4. Guest Capacities: Derive realistic guest_min and guest_max from chairs/tables/plates (e.g. 60 chairs -> guest_max 60, 100 chairs -> guest_max 100).
5. Scaffolding: Derive width_ft and length_ft from the size (e.g. "Size: 20x40" -> width_ft: 20, length_ft: 40).
Return ONLY valid JSON.`;

    const prompt = isOffer ? comboPrompt : packagePrompt;

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
    if (text.startsWith("```json")) text = text.substring(7);
    if (text.startsWith("```")) text = text.substring(3);
    if (text.endsWith("```")) text = text.substring(0, text.length - 3).trim();
    
    const parsedData = JSON.parse(text);

    // Normalize packages array output
    let packages = [];
    if (Array.isArray(parsedData.packages)) {
      packages = parsedData.packages;
    } else if (Array.isArray(parsedData)) {
      packages = parsedData;
    } else if (parsedData && typeof parsedData === "object") {
      packages = [parsedData];
    }

    // Sanitize each parsed package against current Inventory & Addons
    const sanitizedPackages = [];
    for (const rawPkg of packages) {
      const isOfferPkg = isOffer || rawPkg.offer_type === OFFER_TYPES.SPECIAL;
      const sanitized = await sanitizeAIPackageItems({
        isOffer: isOfferPkg,
        inclusions: isOfferPkg
          ? normalizeOfferInclusions(rawPkg.inclusions)
          : normalizeStringList(rawPkg.inclusions),
        add_ons: Array.isArray(rawPkg.add_ons)
          ? rawPkg.add_ons.map((a) => (typeof a === "string" ? { name: a, qty: "" } : { name: a.name || "", qty: a.qty || "" }))
          : [],
        setup_equipment: rawPkg.setup_equipment || [],
      });

      sanitizedPackages.push({
        ...rawPkg,
        offer_type: isOfferPkg ? OFFER_TYPES.SPECIAL : OFFER_TYPES.REGULAR,
        inclusions: sanitized.inclusions,
        add_ons: sanitized.add_ons,
        skipped_inclusions: sanitized.skippedInclusions,
        skipped_add_ons: sanitized.skippedAddOns,
      });
    }

    packages = sanitizedPackages;

    // If only 1 package was extracted, also spread it for seamless backward compatibility
    const singlePayload = packages.length === 1 ? packages[0] : (packages[0] || {});

    res.json({
      ...singlePayload,
      packages,
      count: packages.length,
    });
  } catch (error) {
    console.error("AI Parse Error:", error);
    res.status(500).json({ error: "Failed to parse with AI", details: error.message });
  }
};

exports.createBulk = async (req, res) => {
  try {
    const rawPackages = Array.isArray(req.body.packages)
      ? req.body.packages
      : Array.isArray(req.body)
      ? req.body
      : [];

    if (rawPackages.length === 0) {
      return res.status(400).json({ error: "No packages provided for bulk creation" });
    }

    const createdList = [];
    const allSkipped = [];

    for (const rawPkg of rawPackages) {
      const offer_type = normalizeOfferType(rawPkg.offer_type);
      const isOffer = offer_type === OFFER_TYPES.SPECIAL;

      const scaffold_size_options = Array.isArray(rawPkg.scaffold_size_options)
        ? normalizeScaffoldOptions(rawPkg.scaffold_size_options)
        : [];

      const rawInclusions = isOffer
        ? normalizeOfferInclusions(rawPkg.inclusions)
        : normalizeStringList(rawPkg.inclusions);

      const rawAddOns = Array.isArray(rawPkg.add_ons)
        ? rawPkg.add_ons.map((a) => (typeof a === "string" ? { name: a, qty: "" } : { name: a.name || "", qty: a.qty || "" }))
        : [];

      // Sanitize AI-generated items: exclude unavailable items from inclusions and add_ons
      const sanitized = await sanitizeAIPackageItems({
        isOffer,
        inclusions: rawInclusions,
        add_ons: rawAddOns,
        setup_equipment: rawPkg.setup_equipment || [],
      });

      if (sanitized.skippedInclusions.length > 0 || sanitized.skippedAddOns.length > 0) {
        allSkipped.push({
          packageName: rawPkg.name || "Untitled Package",
          inclusions: sanitized.skippedInclusions,
          add_ons: sanitized.skippedAddOns,
        });
      }

      const basePayload = {
        name: rawPkg.name || "Untitled Package",
        description: rawPkg.description || "",
        fullDescription: rawPkg.fullDescription || "",
        guest_min: rawPkg.guest_min !== undefined ? Number(rawPkg.guest_min) : undefined,
        guest_max: rawPkg.guest_max !== undefined ? Number(rawPkg.guest_max) : undefined,
        setup_price: rawPkg.setup_price !== undefined ? Number(rawPkg.setup_price) : 0,
        price_label: rawPkg.price_label || "",
        package_type: rawPkg.package_type || "Event Setup Only",
        event_type: rawPkg.event_type || "",
        offer_type,
        guest_count: isOffer ? Math.floor(Number(rawPkg.guest_count) || 1) : undefined,
        price_per_guest: isOffer ? Number(rawPkg.price_per_guest) || 0 : undefined,
        offer_food_items: isOffer ? normalizeOfferFoodItems(rawPkg.offer_food_items) : [],
        inclusions: sanitized.inclusions,
        add_ons: sanitized.add_ons,
        features: Array.isArray(rawPkg.features) ? rawPkg.features : [],
        scaffold_size_options: isOffer ? [] : scaffold_size_options,
        available: true,
      };

      const payload = isOffer ? comboPayload(basePayload) : basePayload;

      if (!isOffer && payload.scaffold_size_options?.length > 0) {
        payload.default_scaffold_option_id =
          payload.scaffold_size_options[0]._id || payload.scaffold_size_options[0].id || "0";
      }

      const created = await Package.create(payload);
      createdList.push(created);

      logAction({
        user_id: req.user._id,
        action: "package_created",
        entity_type: "package",
        entity_id: created._id,
        details: `Bulk AI created package "${created.name}"`,
        ip_address: req.ip,
      }).catch((err) => console.error("logAction error:", err));
    }

    const io = req.app?.get ? req.app.get("io") : null;
    if (io) {
      io.emit("system:refresh", { type: "package", action: "bulk_create", count: createdList.length });
    }

    const totalSkippedCount = allSkipped.reduce(
      (acc, s) => acc + s.inclusions.length + s.add_ons.length,
      0
    );

    res.status(201).json({
      message: `Successfully created ${createdList.length} packages`,
      packages: createdList,
      skippedItems: allSkipped,
      totalSkippedCount,
      warning:
        totalSkippedCount > 0
          ? "Some items were skipped because they are not currently available in Inventory/Addons."
          : null,
    });
  } catch (error) {
    console.error("Bulk create packages error:", error);
    res.status(500).json({ error: "Failed to create bulk packages", details: error.message });
  }
};
