const Addon = require("../models/Addon");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logAction = require("../utils/logAction");

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

// Parse Addons with Gemini AI (admin)
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

    const result = await model.generateContent(parts);
    const response = await result.response;
    let text = response.text().trim();
    if (text.startsWith("```json")) text = text.substring(7);
    if (text.startsWith("```")) text = text.substring(3);
    if (text.endsWith("```")) text = text.substring(0, text.length - 3).trim();

    const parsedData = JSON.parse(text);

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
      error: "Failed to parse addons with AI",
      details: error.message,
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

    const toInsert = rawAddons
      .filter((a) => a && a.name && a.name.trim())
      .map((a) => ({
        name: a.name.trim(),
        description: a.description ? a.description.trim() : "",
        available: a.available !== false,
      }));

    const created = await Addon.insertMany(toInsert);

    await logAction({
      user_id: req.user._id,
      action: "addons_bulk_created",
      entity_type: "addon",
      entity_id: created[0]?._id,
      details: `Bulk created ${created.length} addons via AI Ingestion`,
      ip_address: req.ip,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "addon", action: "bulk_create", count: created.length });
    }

    res.status(201).json({
      message: `Successfully created ${created.length} addons`,
      addons: created,
    });
  } catch (error) {
    console.error("Bulk Addons creation error:", error);
    res.status(500).json({
      error: "Failed to create addons in bulk",
      details: error.message,
    });
  }
};

