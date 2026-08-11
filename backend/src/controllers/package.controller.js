const Package = require("../models/Package");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const logAction = require("../utils/logAction");

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
    if (req.files.image && req.files.image[0]) {
      const result = await uploadToCloudinary(
        req.files.image[0].buffer,
        "packages",
      );
      image_url = result.secure_url;
    }

    if (req.files.gallery && req.files.gallery.length > 0) {
      const uploadPromises = req.files.gallery.map((file) =>
        uploadToCloudinary(file.buffer, "packages"),
      );
      const results = await Promise.all(uploadPromises);
      gallery = results.map((r) => r.secure_url);
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
      scaffold_size_options = JSON.parse(req.body.scaffold_size_options);
      // ✅ Ensure guest_min and guest_max are numbers if provided
      scaffold_size_options = scaffold_size_options.map((option) => ({
        ...option,
        guest_min: option.guest_min ? Number(option.guest_min) : undefined,
        guest_max: option.guest_max ? Number(option.guest_max) : undefined,
      }));
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

  const payload = {
    ...req.body,
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

  await logAction({
    user_id: req.user._id,
    action: "package_created",
    entity_type: "package",
    entity_id: pkg._id,
    details: `Created package "${pkg.name}"`,
    ip_address: req.ip,
  });

  res.status(201).json(pkg);
};

exports.getAll = async (req, res) => {
  const query = canViewUnavailable(req.user) ? {} : { available: true };
  res.json(await Package.find(query));
};

exports.getById = async (req, res) => {
  const query = canViewUnavailable(req.user)
    ? { _id: req.params.id }
    : { _id: req.params.id, available: true };

  const pkg = await Package.findOne(query);
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
      data.scaffold_size_options = JSON.parse(req.body.scaffold_size_options);
      // ✅ Ensure guest_min and guest_max are numbers if provided
      data.scaffold_size_options = data.scaffold_size_options.map((option) => ({
        ...option,
        guest_min: option.guest_min ? Number(option.guest_min) : undefined,
        guest_max: option.guest_max ? Number(option.guest_max) : undefined,
      }));
    } catch (e) {
      console.error("Failed to parse scaffold_size_options", e);
    }
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
    if (req.files.image && req.files.image[0]) {
      const result = await uploadToCloudinary(
        req.files.image[0].buffer,
        "packages",
      );
      data.image_url = result.secure_url;
    }

    if (req.files.gallery && req.files.gallery.length > 0) {
      const uploadPromises = req.files.gallery.map((file) =>
        uploadToCloudinary(file.buffer, "packages"),
      );
      const results = await Promise.all(uploadPromises);
      data.$push = { gallery: { $each: results.map((r) => r.secure_url) } };
    }
  }

  // Handle gallery removals
  if (data.gallery_to_remove.length > 0) {
    data.$pull = { gallery: { $in: data.gallery_to_remove } };
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

  await logAction({
    user_id: req.user._id,
    action: "package_updated",
    entity_type: "package",
    entity_id: updated._id,
    details: `Updated package "${updated.name}" — Fields: ${detailParts}`,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    ip_address: req.ip,
  });

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
