const mongoose = require("mongoose");

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

const InventorySchema = new mongoose.Schema({
  item_name: { type: String, required: true, trim: true },
  identifier: { type: String, trim: true, index: true },
  quantity: { type: Number, min: 0, default: 0 },
  category: { type: String, required: true },
  available: { type: Boolean, default: true }
}, { timestamps: true });

// Pre-validate hook to populate canonical identifier
InventorySchema.pre("validate", function() {
  if (this.item_name && !this.identifier) {
    this.identifier = normalizeIdentifier(this.item_name);
  }
});

// Pre-save hook to prevent saving duplicate inventory items
InventorySchema.pre("save", async function() {
  const ident = this.identifier || normalizeIdentifier(this.item_name);
  if (!this.identifier && ident) {
    this.identifier = ident;
  }

  if (this.isModified("item_name") || this.isModified("identifier") || this.isNew) {
    const escaped = escapeRegex(this.item_name ? this.item_name.trim() : "");
    const query = {
      _id: { $ne: this._id },
      $or: [
        ...(ident ? [{ identifier: ident }] : []),
        ...(escaped ? [{ item_name: { $regex: new RegExp(`^${escaped}$`, "i") } }] : [])
      ]
    };

    if (query.$or.length > 0) {
      const conflict = await this.constructor.findOne(query);
      if (conflict) {
        const err = new Error("This item is already included in the inventory.");
        err.status = 400;
        err.statusCode = 400;
        throw err;
      }
    }
  }
});

module.exports = mongoose.model("Inventory", InventorySchema);