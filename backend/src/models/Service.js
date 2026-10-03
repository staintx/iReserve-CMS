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

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    identifier: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "Event Setup",
    },
    available: {
      type: Boolean,
      default: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-validate hook to populate canonical identifier
ServiceSchema.pre("validate", function () {
  if (this.name && !this.identifier) {
    this.identifier = normalizeIdentifier(this.name);
  }
  if (this.is_active !== undefined && this.available === undefined) {
    this.available = this.is_active;
  }
  if (this.available !== undefined && this.is_active === undefined) {
    this.is_active = this.available;
  }
});

// Pre-save hook to prevent saving duplicate service names (case-insensitive)
ServiceSchema.pre("save", async function () {
  const ident = this.identifier || normalizeIdentifier(this.name);
  if (!this.identifier && ident) {
    this.identifier = ident;
  }

  // Keep both active flags in sync
  if (this.available !== undefined) {
    this.is_active = this.available;
  } else if (this.is_active !== undefined) {
    this.available = this.is_active;
  }

  if (this.isModified("name") || this.isModified("identifier") || this.isNew) {
    const escaped = escapeRegex(this.name ? this.name.trim() : "");
    const query = {
      _id: { $ne: this._id },
      $or: [
        ...(ident ? [{ identifier: ident }] : []),
        ...(escaped ? [{ name: { $regex: new RegExp(`^${escaped}$`, "i") } }] : []),
      ],
    };

    if (query.$or.length > 0) {
      const conflict = await this.constructor.findOne(query);
      if (conflict) {
        const err = new Error(`Service "${this.name.trim()}" already exists.`);
        err.status = 400;
        err.statusCode = 400;
        throw err;
      }
    }
  }
});

module.exports = mongoose.model("Service", ServiceSchema);
