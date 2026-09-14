const Inventory = require("../models/Inventory");
const Booking = require("../models/Booking");
const InventoryLog = require("../models/InventoryLog");
const writeInventoryLog = require("../utils/writeInventoryLog");

const ALLOWED_CATEGORIES = ["Event Setup & Furniture", "Dining & Service Inventory"];

const normalizeIdentifier = (name) => {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const escapeRegex = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

exports.create = async (req, res) => {
  try {
    const rawName = req.body.item_name;
    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      return res.status(400).json({ message: "Item name is required" });
    }

    if (req.body.category && !ALLOWED_CATEGORIES.includes(req.body.category)) {
      return res.status(400).json({
        message: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(", ")}`
      });
    }

    const trimmedName = rawName.trim();
    const identifier = normalizeIdentifier(trimmedName);
    const escaped = escapeRegex(trimmedName);

    // Duplicate check: unique identifier or case-insensitive item name
    const existing = await Inventory.findOne({
      $or: [
        ...(identifier ? [{ identifier }] : []),
        { item_name: { $regex: new RegExp(`^${escaped}$`, "i") } }
      ]
    });

    if (existing) {
      return res.status(400).json({
        message: "This item is already included in the inventory."
      });
    }

    const payload = {
      ...req.body,
      item_name: trimmedName,
      identifier: identifier
    };

    const item = await Inventory.create(payload);
    writeInventoryLog({
      inventory_id: item._id,
      event_type: "created",
      delta: item.quantity || 0,
      actor_id: req.user?._id,
      reason: "Item added to inventory",
    });
    return res.status(201).json(item);
  } catch (error) {
    if (error.message === "This item is already included in the inventory." || error.code === 11000) {
      return res.status(400).json({ message: "This item is already included in the inventory." });
    }
    return res.status(500).json({ message: error.message || "Failed to create inventory item" });
  }
};

exports.getAll = async (req, res) => {
  const items = await Inventory.find();
  const formatted = items.map(item => {
    const obj = item.toObject ? item.toObject() : { ...item };
    if (!obj.identifier && obj.item_name) {
      obj.identifier = normalizeIdentifier(obj.item_name);
    }
    return obj;
  });
  return res.json(formatted);
};

exports.getPublic = async (req, res) => res.json(await Inventory.find({ available: true }));
exports.getById = async (req, res) => res.json(await Inventory.findById(req.params.id));

exports.update = async (req, res) => {
  try {
    const { reason, ...updates } = req.body;
    if (updates.category && !ALLOWED_CATEGORIES.includes(updates.category)) {
      return res.status(400).json({
        message: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(", ")}`
      });
    }

    if (updates.item_name !== undefined) {
      if (typeof updates.item_name !== "string" || !updates.item_name.trim()) {
        return res.status(400).json({ message: "Item name cannot be empty" });
      }
      const trimmedName = updates.item_name.trim();
      const identifier = normalizeIdentifier(trimmedName);
      const escaped = escapeRegex(trimmedName);

      const conflict = await Inventory.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(identifier ? [{ identifier }] : []),
          { item_name: { $regex: new RegExp(`^${escaped}$`, "i") } }
        ]
      });

      if (conflict) {
        return res.status(400).json({
          message: "This item is already included in the inventory."
        });
      }

      updates.item_name = trimmedName;
      updates.identifier = identifier;
    }

    const before = await Inventory.findById(req.params.id);
    if (!before) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const item = await Inventory.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });

    if (before && item && typeof updates.quantity === "number" && updates.quantity !== before.quantity) {
      writeInventoryLog({
        inventory_id: item._id,
        event_type: "manual_adjustment",
        delta: updates.quantity - before.quantity,
        actor_id: req.user?._id,
        reason: reason || "Manual stock adjustment",
      });
    }

    if (before && item && typeof updates.available === "boolean" && updates.available !== before.available) {
      writeInventoryLog({
        inventory_id: item._id,
        event_type: "manual_adjustment",
        delta: 0,
        actor_id: req.user?._id,
        reason: reason || (updates.available ? "Item marked as Available" : "Item marked as Unavailable"),
      });
    }

    return res.json(item);
  } catch (error) {
    if (error.message === "This item is already included in the inventory." || error.code === 11000) {
      return res.status(400).json({ message: "This item is already included in the inventory." });
    }
    return res.status(500).json({ message: error.message || "Failed to update inventory item" });
  }
};

exports.remove = async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (item) {
    writeInventoryLog({
      inventory_id: item._id,
      event_type: "retired",
      delta: -(item.quantity || 0),
      actor_id: req.user?._id,
      reason: "Item removed from inventory",
    });
  }
  await Inventory.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};

exports.getLogs = async (req, res) => {
  const logs = await InventoryLog.find({ inventory_id: req.params.id })
    .populate("actor_id", "full_name")
    .populate("booking_id", "reference")
    .sort({ createdAt: -1 });
  res.json(logs);
};

exports.getAvailability = async (req, res) => {
  try {
    const { date, excludeBookingId } = req.query;
    const allInventory = await Inventory.find().sort({ category: 1, item_name: 1 });

    let startOfDay, endOfDay;
    if (date && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split("-").map(Number);
      startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
      endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else {
      const targetDate = date ? new Date(date) : new Date();
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
    }

    const bookingQuery = {
      status: {
        $nin: ["cancelled", "Cancelled", "refunded", "inquiry", "quote_sent", "rejected"]
      },
      event_date: { $gte: startOfDay, $lte: endOfDay }
    };

    if (excludeBookingId) {
      bookingQuery._id = { $ne: excludeBookingId };
    }

    const activeBookings = await Booking.find(bookingQuery);

    const reservedQuantities = {};
    activeBookings.forEach(booking => {
      if (Array.isArray(booking.inventory_items)) {
        booking.inventory_items.forEach(item => {
          if (item.inventory_id) {
            const idStr = item.inventory_id.toString();
            reservedQuantities[idStr] = (reservedQuantities[idStr] || 0) + (item.quantity || 0);
          }
        });
      }
    });

    const result = allInventory.map(item => {
      const idStr = item._id.toString();
      const reserved = reservedQuantities[idStr] || 0;
      const total = item.quantity || 0;
      const isAvailable = item.available !== false;
      const stockOnHand = isAvailable ? Math.max(0, total - reserved) : 0;
      const itemObj = item.toObject ? item.toObject() : { ...item };
      if (!itemObj.identifier && itemObj.item_name) {
        itemObj.identifier = normalizeIdentifier(itemObj.item_name);
      }
      return {
        ...itemObj,
        reserved_quantity: reserved,
        available_quantity: stockOnHand,
        stock_on_hand: stockOnHand
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to compute inventory availability", error: error.message });
  }
};
