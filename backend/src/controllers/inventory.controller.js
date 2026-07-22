const Inventory = require("../models/Inventory");
const Booking = require("../models/Booking");

exports.create = async (req, res) => res.status(201).json(await Inventory.create(req.body));
exports.getAll = async (req, res) => res.json(await Inventory.find());
exports.getPublic = async (req, res) => res.json(await Inventory.find({ available: true }));
exports.getById = async (req, res) => res.json(await Inventory.findById(req.params.id));
exports.update = async (req, res) => res.json(await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true }));
exports.remove = async (req, res) => { await Inventory.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); };

exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    const allInventory = await Inventory.find();
    
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
    
    const activeBookings = await Booking.find({
      status: { $in: ["confirmed", "preparing", "ongoing"] },
      event_date: { $gte: startOfDay, $lte: endOfDay }
    });
    
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