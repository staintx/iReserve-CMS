const Addon = require("../models/Addon");
const Package = require("../models/Package");
const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");
const Quotation = require("../models/Quotation");
const { generateContentWithRetry, cleanAndParseJson } = require("../services/geminiClient");
const logAction = require("../utils/logAction");

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

// Get all addons (public & admin)
exports.getAddons = async (req, res) => {
  try {
    const addons = await Addon.find().sort({ createdAt: -1 });
    const formatted = addons.map((addon) => {
      const obj = addon.toObject ? addon.toObject() : { ...addon };
      if (!obj.identifier && obj.name) {
        obj.identifier = normalizeIdentifier(obj.name);
      }
      return obj;
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new addon (admin)
exports.createAddon = async (req, res) => {
  try {
    const rawName = req.body.name;
    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      return res.status(400).json({ message: "Addon name is required" });
    }

    const trimmedName = rawName.trim();
    const identifier = normalizeIdentifier(trimmedName);
    const escaped = escapeRegex(trimmedName);

    // Duplicate check: unique identifier or case-insensitive name
    const existing = await Addon.findOne({
      $or: [
        ...(identifier ? [{ identifier }] : []),
        { name: { $regex: new RegExp(`^${escaped}$`, "i") } },
      ],
    });

    if (existing) {
      return res.status(400).json({
        message: "This addon is already included in the catalog.",
      });
    }

    const newAddon = new Addon({
      ...req.body,
      name: trimmedName,
      identifier,
    });
    await newAddon.save();

    await logAction({
      user_id: req.user._id,
      action: "addon_created",
      entity_type: "addon",
      entity_id: newAddon._id,
      details: `Created addon "${newAddon.name}"`,
      ip_address: req.ip,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "addon", action: "create", addon_id: newAddon._id });
    }

    res.status(201).json(newAddon);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "This addon is already included in the catalog." });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update an addon (admin)
exports.updateAddon = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.name !== undefined) {
      if (typeof updates.name !== "string" || !updates.name.trim()) {
        return res.status(400).json({ message: "Addon name cannot be empty" });
      }
      const trimmedName = updates.name.trim();
      const identifier = normalizeIdentifier(trimmedName);
      const escaped = escapeRegex(trimmedName);

      const conflict = await Addon.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(identifier ? [{ identifier }] : []),
          { name: { $regex: new RegExp(`^${escaped}$`, "i") } },
        ],
      });

      if (conflict) {
        return res.status(400).json({
          message: "This addon is already included in the catalog.",
        });
      }

      updates.name = trimmedName;
      updates.identifier = identifier;
    }

    const updated = await Addon.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Addon not found" });

    await logAction({
      user_id: req.user._id,
      action: "addon_updated",
      entity_type: "addon",
      entity_id: updated._id,
      details: `Updated addon "${updated.name}"`,
      ip_address: req.ip,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "addon", action: "update", addon_id: updated._id });
    }

    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "This addon is already included in the catalog." });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete an addon (admin)
exports.deleteAddon = async (req, res) => {
  try {
    const addon = await Addon.findById(req.params.id);
    const addonName = addon ? addon.name : req.params.id;
    const deleted = await Addon.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Addon not found" });

    await logAction({
      user_id: req.user._id,
      action: "addon_deleted",
      entity_type: "addon",
      entity_id: req.params.id,
      details: `Deleted addon "${addonName}"`,
      ip_address: req.ip,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "addon", action: "delete", addon_id: req.params.id });
    }

    res.json({ message: "Addon deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Usage cross-reference (admin)
exports.getUsage = async (req, res) => {
  try {
    const addon = await Addon.findById(req.params.id);
    if (!addon) {
      return res.status(404).json({ message: "Addon not found" });
    }

    const addonName = addon.name ? addon.name.trim() : "";
    const escapedName = escapeRegex(addonName);
    const nameRegex = new RegExp(`^${escapedName}$`, "i");
    const partialRegex = new RegExp(escapedName, "i");

    // 1. Packages / Inclusions
    const allPackages = await Package.find({}, "name offer_type event_type inclusions").lean();
    const matchingPackages = allPackages.filter((pkg) => {
      if (Array.isArray(pkg.inclusions)) {
        for (const inc of pkg.inclusions) {
          const incStr = typeof inc === "object" ? inc?.name || "" : String(inc);
          if (partialRegex.test(incStr)) return true;
        }
      }
      return false;
    });

    const matchingPkgIds = matchingPackages.map((p) => p._id);
    const matchingPkgNames = matchingPackages.map((p) => p.name);

    // 2. Active / upcoming customer usage
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Active Bookings
    const activeBookingsRaw = await Booking.find({
      status: { $nin: ["Cancelled", "cancelled", "refunded", "Completed", "completed"] },
      event_date: { $gte: startOfToday },
      $or: [
        { "add_ons.name": nameRegex },
        { "custom_addons.name": nameRegex },
        { additional_services: partialRegex },
        { package_inclusions: partialRegex },
        ...(matchingPkgIds.length > 0 ? [{ package_id: { $in: matchingPkgIds } }] : []),
      ],
    }, "reference event_date package_name_snapshot status contact_first_name contact_last_name celebrant_name")
      .sort({ event_date: 1 })
      .lean();

    const activeBookings = activeBookingsRaw.map((b) => {
      const customerName = [b.contact_first_name, b.contact_last_name].filter(Boolean).join(" ");
      return {
        _id: b._id,
        reference: b.reference || "Booking",
        event_date: b.event_date,
        package_name: b.package_name_snapshot || (matchingPkgNames.length > 0 ? matchingPkgNames[0] : "Package"),
        customer_name: customerName || b.celebrant_name || "",
        status: b.status,
      };
    });

    // Active Inquiries
    const activeInquiriesRaw = await Inquiry.find({
      status: { $nin: ["Cancelled", "cancelled", "Rejected", "Quote Rejected", "Expired", "Converted to Booking"] },
      archived: { $ne: true },
      event_date: { $gte: startOfToday },
      $or: [
        { "custom_addons.name": nameRegex },
        { package_inclusions: partialRegex },
        ...(matchingPkgIds.length > 0 ? [{ package_id: { $in: matchingPkgIds } }] : []),
      ],
    }, "reference event_date package_name_snapshot status contact_first_name contact_last_name celebrant_name")
      .sort({ event_date: 1 })
      .lean();

    const activeInquiries = activeInquiriesRaw.map((inq) => {
      const customerName = [inq.contact_first_name, inq.contact_last_name].filter(Boolean).join(" ");
      return {
        _id: inq._id,
        reference: inq.reference || "Inquiry",
        event_date: inq.event_date,
        package_name: inq.package_name_snapshot || (matchingPkgNames.length > 0 ? matchingPkgNames[0] : "Package"),
        customer_name: customerName || inq.celebrant_name || "",
        status: inq.status,
      };
    });

    // Active Quotations
    const activeQuotationsRaw = await Quotation.find({
      status: { $in: ["Draft", "Sent", "Revision Requested", "Accepted", "Awaiting Final Confirmation"] },
      $or: [
        { "add_ons.name": nameRegex },
        { package_inclusions: partialRegex },
        ...(matchingPkgIds.length > 0 ? [{ package_id: { $in: matchingPkgIds } }] : []),
      ],
    }, "quotation_number status package_name inquiry_id")
      .populate("inquiry_id", "reference event_date status archived contact_first_name contact_last_name")
      .sort({ createdAt: -1 })
      .lean();

    const activeQuotations = activeQuotationsRaw
      .filter((q) => {
        if (!q.inquiry_id) return true;
        const inq = q.inquiry_id;
        if (inq.archived) return false;
        if (["Cancelled", "cancelled", "Rejected", "Quote Rejected", "Expired", "Converted to Booking"].includes(inq.status)) {
          return false;
        }
        if (inq.event_date && new Date(inq.event_date) < startOfToday) {
          return false;
        }
        return true;
      })
      .map((q) => ({
        _id: q._id,
        quotation_number: q.quotation_number || "Quotation",
        package_name: q.package_name || (matchingPkgNames.length > 0 ? matchingPkgNames[0] : "Package"),
        inquiry_reference: q.inquiry_id?.reference || "",
        status: q.status,
      }));

    const hasActiveCustomerUsage = activeBookings.length > 0 || activeInquiries.length > 0 || activeQuotations.length > 0;
    const hasUsage = matchingPackages.length > 0 || hasActiveCustomerUsage;

    return res.json({
      itemId: addon._id,
      itemName: addon.name,
      hasUsage,
      hasActiveCustomerUsage,
      packages: matchingPackages.map((p) => ({
        _id: p._id,
        name: p.name,
        offer_type: p.offer_type,
        event_type: p.event_type,
      })),
      activeBookings,
      activeInquiries,
      activeQuotations,
    });
  } catch (error) {
    console.error("Error checking addon usage:", error);
    return res.status(500).json({ message: "Failed to check addon usage" });
  }
};

// Parse Addons with Gemini AI (admin)
exports.parseWithAI = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service is currently unavailable. Please try again later." });

    const prompt = `You are an expert data extraction assistant for an event catering & rental CMS.
Analyze the provided document/image/text and extract ALL distinct ADD-ON items into a JSON object with an "addons" array.
An add-on is an optional rental, equipment, service, entertainment, decor, or setup addition (e.g. "Entourage Setup", "Extra Monoblock Chairs", "Videoke Machine", "Low Fog Machine", "Projector & Screen", "Tiffany Chairs", "Balloon Arch", "Master of Ceremony / Host", "Photo Booth", "Candy Corner", "Standee", "Ceiling Draping", etc.).

Use the following schema:
{
  "addons": [
    {
      "name": "string (Clean, title-cased addon name)",
      "description": "string (brief 1-2 sentence description of what the addon provides or includes)",
      "available": true
    }
  ]
}

Guidelines:
1. Extract all distinct add-on items mentioned across all pages or sections.
2. If no description is stated, create a helpful, concise description.
3. Set "available" to true by default.
Return ONLY valid JSON.`;

    const parts = [prompt];

    if (req.file) {
      parts.push({
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
      });
    } else if (req.body.text) {
      parts.push(req.body.text);
    } else {
      return res.status(400).json({ error: "No file or text provided" });
    }

    const { text } = await generateContentWithRetry({
      contents: parts,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const parsedData = cleanAndParseJson(text);

    let addons = [];
    if (Array.isArray(parsedData.addons)) {
      addons = parsedData.addons;
    } else if (Array.isArray(parsedData)) {
      addons = parsedData;
    } else if (parsedData && typeof parsedData === "object") {
      addons = [parsedData];
    }

    const cleaned = addons
      .filter((a) => a && a.name)
      .map((a) => ({
        name: String(a.name).trim(),
        description: a.description ? String(a.description).trim() : "",
        available: a.available !== false,
      }));

    res.json({ addons: cleaned });
  } catch (error) {
    console.error("AI Addon parsing error:", error);
    res.status(500).json({
      error: error.message || "Failed to parse addons with AI",
      details: error.originalError?.message || error.message,
    });
  }
};

// Bulk create addons (admin)
exports.createBulk = async (req, res) => {
  try {
    const rawAddons = Array.isArray(req.body.addons) ? req.body.addons : [];
    if (rawAddons.length === 0) {
      return res.status(400).json({ error: "No addons provided for bulk creation" });
    }

    const existing = await Addon.find({}, "name identifier");
    const existingIdents = new Set(
      existing.map((e) => e.identifier || normalizeIdentifier(e.name)).filter(Boolean)
    );
    const existingNames = new Set(
      existing.map((e) => (e.name || "").trim().toLowerCase()).filter(Boolean)
    );

    const createdItems = [];
    const skippedItems = [];

    for (const a of rawAddons) {
      const rawName = String(a.name || "").trim();
      if (!rawName) continue;

      const ident = normalizeIdentifier(rawName);
      const lowerName = rawName.toLowerCase();

      if (existingIdents.has(ident) || existingNames.has(lowerName)) {
        skippedItems.push({
          name: rawName,
          reason: "Addon already exists in catalog",
        });
        continue;
      }

      const itemPayload = {
        name: rawName,
        identifier: ident,
        description: a.description ? a.description.trim() : "",
        available: a.available !== false,
      };

      const newItem = await Addon.create(itemPayload);
      existingIdents.add(ident);
      existingNames.add(lowerName);
      createdItems.push(newItem);
    }

    if (createdItems.length > 0) {
      await logAction({
        user_id: req.user._id,
        action: "addons_bulk_created",
        entity_type: "addon",
        entity_id: createdItems[0]._id,
        details: `Bulk created ${createdItems.length} addons via Zelle AI Ingestion${
          skippedItems.length > 0 ? ` (${skippedItems.length} skipped duplicates)` : ""
        }`,
        ip_address: req.ip,
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("system:refresh", { type: "addon", action: "bulk_create", count: createdItems.length });
      }
    }

    res.status(201).json({
      message: `Successfully created ${createdItems.length} addon${createdItems.length === 1 ? "" : "s"}${
        skippedItems.length > 0 ? ` (${skippedItems.length} duplicate${skippedItems.length === 1 ? "" : "s"} skipped)` : ""
      }`,
      addons: createdItems,
      skipped: skippedItems,
      totalImported: createdItems.length,
      totalSkipped: skippedItems.length,
    });
  } catch (error) {
    console.error("Bulk Addons creation error:", error);
    res.status(500).json({
      error: "Failed to create addons in bulk",
      details: error.message,
    });
  }
};
