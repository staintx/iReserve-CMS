const Inventory = require("../models/Inventory");
const Booking = require("../models/Booking");
const InventoryLog = require("../models/InventoryLog");
const writeInventoryLog = require("../utils/writeInventoryLog");

exports.create = async (req, res) => {
  const item = await Inventory.create(req.body);
  writeInventoryLog({
    inventory_id: item._id,
    event_type: "created",
    delta: item.quantity || 0,
    actor_id: req.user?._id,
    reason: "Item added to inventory",
  });
  res.status(201).json(item);
};
exports.getAll = async (req, res) => res.json(await Inventory.find());
exports.getPublic = async (req, res) => res.json(await Inventory.find({ available: true }));
exports.getById = async (req, res) => res.json(await Inventory.findById(req.params.id));

exports.update = async (req, res) => {
  const { reason, ...updates } = req.body;
  const before = await Inventory.findById(req.params.id);
  const item = await Inventory.findByIdAndUpdate(req.params.id, updates, { new: true });

  if (before && item && typeof updates.quantity === "number" && updates.quantity !== before.quantity) {
    writeInventoryLog({
      inventory_id: item._id,
      event_type: "manual_adjustment",
      delta: updates.quantity - before.quantity,
      actor_id: req.user?._id,
      reason: reason || "Manual stock adjustment",
    });
  }

  res.json(item);
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

    if (!date) {
      const result = allInventory.map(item => ({
        ...item.toObject(),
        reserved_quantity: 0,
        available_quantity: item.available !== false ? (item.quantity || 0) : 0
      }));
      return res.json(result);
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookingQuery = {
      status: {
        $nin: ["cancelled", "Cancelled", "refunded", "inquiry", "quote_sent"]
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
      return {
        ...item.toObject(),
        reserved_quantity: reserved,
        available_quantity: isAvailable ? Math.max(0, total - reserved) : 0
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to compute inventory availability", error: error.message });
  }
};
