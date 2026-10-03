const Service = require("../models/Service");

const DEFAULT_SERVICES = [
  { name: "Stage / Backdrop Styling", description: "Main stage, lighted arch, or floral backdrop" },
  { name: "VIP / Presidential Table Styling", description: "Special centerpieces, chargers, and luxury seating" },
  { name: "Guest Tables & Chairs Styling", description: "Linens, Tiffany / covered chairs, and centerpieces" },
  { name: "Buffet Station & Dessert Bar", description: "Themed skirtings, food warmers, and dessert tier risers" },
  { name: "Ceiling Draping & Fairy Lights", description: "Overhead fabrics, warm ambient fairy lights & festoons" },
  { name: "Entrance Arch / Photo Wall Area", description: "Welcome signage, photo spot for guest arrivals" },
  { name: "Sound System, Mood Lights & Trussing", description: "Speakers, wireless mics, moving heads & stage lights" },
  { name: "Stage Setup", description: "Stage platform and decorative background setup" },
  { name: "Buffet Setup", description: "Buffet table stations with warmers and decorative skirting" },
  { name: "Cake Table", description: "Specialty cake display table and themed backdrop" },
  { name: "Backdrop Setup", description: "Photo booth, ceremonial arch, or decorative photo backdrop" },
  { name: "Entrance Arch", description: "Grand entrance archway with floral or balloon arrangement" },
  { name: "Sound System", description: "Audio amplification, microphones, and sound engineering" },
];

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

// Seed default services if database collection is empty
const ensureDefaultServices = async () => {
  try {
    const count = await Service.countDocuments();
    if (count === 0) {
      console.log("[Service] Seeding default setup services...");
      for (const item of DEFAULT_SERVICES) {
        await Service.create({
          name: item.name,
          description: item.description || "",
          category: "Event Setup",
          available: true,
          is_active: true,
        }).catch((err) => {
          // ignore duplicate collisions
        });
      }
      console.log("[Service] Default setup services seeded successfully.");
    }
  } catch (err) {
    console.error("[Service] Error auto-seeding default services:", err.message);
  }
};

// GET /api/services
exports.getServices = async (req, res) => {
  try {
    await ensureDefaultServices();

    const isAdmin = req.user && (req.user.role === "admin" || req.user.role === "manager");
    const includeInactive = req.query.all === "true" || (isAdmin && req.query.active_only !== "true");

    const filter = includeInactive ? {} : { available: { $ne: false }, is_active: { $ne: false } };
    const services = await Service.find(filter).sort({ createdAt: 1 });

    res.json(services);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve services", error: error.message });
  }
};

// POST /api/services
exports.createService = async (req, res) => {
  try {
    const rawName = req.body.name;
    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      return res.status(400).json({ message: "Service name is required." });
    }

    const trimmedName = rawName.trim();
    const identifier = normalizeIdentifier(trimmedName);
    const escaped = escapeRegex(trimmedName);

    // Duplicate check
    const existing = await Service.findOne({
      $or: [
        { identifier },
        { name: { $regex: new RegExp(`^${escaped}$`, "i") } },
      ],
    });

    if (existing) {
      if (!existing.available || !existing.is_active) {
        // Re-activate if it was inactive
        existing.available = true;
        existing.is_active = true;
        if (req.body.description !== undefined) {
          existing.description = req.body.description.trim();
        }
        await existing.save();
        return res.status(200).json(existing);
      }
      return res.status(400).json({ message: `Service "${trimmedName}" already exists.` });
    }

    const service = new Service({
      name: trimmedName,
      description: req.body.description ? String(req.body.description).trim() : "",
      category: req.body.category ? String(req.body.category).trim() : "Event Setup",
      available: req.body.available !== undefined ? Boolean(req.body.available) : true,
      is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true,
    });

    await service.save();
    res.status(201).json(service);
  } catch (error) {
    if (error.status === 400 || error.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to create service", error: error.message });
  }
};

// PUT /api/services/:id
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    if (req.body.name) {
      const trimmedName = req.body.name.trim();
      const identifier = normalizeIdentifier(trimmedName);
      const escaped = escapeRegex(trimmedName);

      // Check conflict with other services
      const conflict = await Service.findOne({
        _id: { $ne: id },
        $or: [
          { identifier },
          { name: { $regex: new RegExp(`^${escaped}$`, "i") } },
        ],
      });

      if (conflict) {
        return res.status(400).json({ message: `Service "${trimmedName}" already exists.` });
      }

      service.name = trimmedName;
      service.identifier = identifier;
    }

    if (req.body.description !== undefined) {
      service.description = String(req.body.description).trim();
    }

    if (req.body.available !== undefined) {
      service.available = Boolean(req.body.available);
      service.is_active = Boolean(req.body.available);
    } else if (req.body.is_active !== undefined) {
      service.is_active = Boolean(req.body.is_active);
      service.available = Boolean(req.body.is_active);
    }

    if (req.body.category !== undefined) {
      service.category = String(req.body.category).trim();
    }

    await service.save();
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: "Failed to update service", error: error.message });
  }
};

// DELETE /api/services/:id
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    await Service.findByIdAndDelete(id);
    res.json({ message: "Service removed successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete service", error: error.message });
  }
};
