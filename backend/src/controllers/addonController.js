const Addon = require("../models/Addon");

// Get all addons (public)
exports.getAddons = async (req, res) => {
  try {
    const addons = await Addon.find().sort({ createdAt: -1 });
    res.json(addons);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new addon (admin)
exports.createAddon = async (req, res) => {
  try {
    const newAddon = new Addon(req.body);
    await newAddon.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "addon", action: "create", addon_id: newAddon._id });
    }

    res.status(201).json(newAddon);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update an addon (admin)
exports.updateAddon = async (req, res) => {
  try {
    const updated = await Addon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Addon not found" });

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "addon", action: "update", addon_id: updated._id });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete an addon (admin)
exports.deleteAddon = async (req, res) => {
  try {
    const deleted = await Addon.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Addon not found" });

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "addon", action: "delete", addon_id: req.params.id });
    }

    res.json({ message: "Addon deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
