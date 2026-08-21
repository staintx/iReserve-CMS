const MenuItem = require("../models/MenuItem");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const logAction = require("../utils/logAction");

const ALLOWED_CATEGORIES = [
  "Appetizer",
  "Soup",
  "Salad",
  "Main Course",
  "Vegetable",
  "Pasta",
  "Rice",
  "Dessert",
  "Beverage",
  "Drinking Water",
];

exports.create = async (req, res) => {
  let image_url = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "menu");
    image_url = result.secure_url;
  }
  const newItem = await MenuItem.create({ ...req.body, image_url });

  await logAction({
    user_id: req.user._id,
    action: "menu_item_created",
    entity_type: "menu",
    entity_id: newItem._id,
    details: `Created menu item "${newItem.name}" (${newItem.category})`,
    ip_address: req.ip,
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "menu", action: "create", menu_id: newItem._id });
  }

  res.status(201).json(newItem);
};

exports.getAll = async (req, res) => res.json(await MenuItem.find());
exports.getById = async (req, res) => res.json(await MenuItem.findById(req.params.id));

exports.update = async (req, res) => {
  let data = req.body;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "menu");
    data.image_url = result.secure_url;
  }
  const updated = await MenuItem.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' });

  await logAction({
    user_id: req.user._id,
    action: "menu_item_updated",
    entity_type: "menu",
    entity_id: updated?._id,
    details: `Updated menu item "${updated?.name}"`,
    ip_address: req.ip,
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "menu", action: "update", menu_id: updated?._id });
  }

  res.json(updated);
};

exports.remove = async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  const itemName = item ? item.name : req.params.id;
  await MenuItem.findByIdAndDelete(req.params.id);

  await logAction({
    user_id: req.user._id,
    action: "menu_item_deleted",
    entity_type: "menu",
    entity_id: req.params.id,
    details: `Deleted menu item "${itemName}"`,
    ip_address: req.ip,
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "menu", action: "delete", menu_id: req.params.id });
  }

  res.json({ message: "Deleted" });
};

// Parse Menu Items with Gemini AI (admin)
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

    const prompt = `You are an expert culinary data extraction assistant for an event catering CMS.
Analyze the provided document/menu/flyer/image/text and extract ALL distinct food and beverage items into a JSON object with an "items" array.

Use the following schema:
{
  "items": [
    {
      "name": "string (Clean, appetizing title-cased name of the dish/beverage)",
      "category": "Appetizer" | "Soup" | "Salad" | "Main Course" | "Vegetable" | "Pasta" | "Rice" | "Dessert" | "Beverage" | "Drinking Water",
      "description": "string (brief 1-2 sentence description of ingredients/flavor profile)",
      "available": true
    }
  ]
}

Guidelines:
1. Category Standardization: You MUST map each dish/drink to one of the following exact categories:
   - "Appetizer" (e.g., Spring Rolls, Lumpia, Calamari, Nachos, Canapés, Finger foods)
   - "Soup" (e.g., Cream of Mushroom, Pumpkin Soup, Sinigang, Corn Chowder, Crab & Corn)
   - "Salad" (e.g., Caesar Salad, Kani Salad, Green Garden Salad, Potato Salad)
   - "Main Course" (e.g., Roast Beef, Beef Salpicao, Pork Belly, Chicken Teriyaki, Fish Fillet with Tartar Sauce, Sweet & Sour Fish, Lechon Kawali)
   - "Vegetable" (e.g., Buttered Vegetables, Chopsuey, Mixed Veggies, Broccoli with Mushroom)
   - "Pasta" (e.g., Creamy Carbonara, Spaghetti Bolognese, Baked Macaroni, Lasagna, Fettuccine Alfredo, Sotanghon Guisado, Pancit Canton)
   - "Rice" (e.g., Steamed Jasmine Rice, Yang Chow Fried Rice, Garlic Rice, Java Rice)
   - "Dessert" (e.g., Buko Pandan, Mango Graham Float, Leche Flan, Fruit Tart, Chocolate Mousse, Brownies)
   - "Beverage" (e.g., Red Iced Tea, Blue Lemonade, Cucumber Mint Cooler, Fruit Punch, Soda, Coffee)
   - "Drinking Water" (e.g., Purified Drinking Water, Mineral Water)
2. Extract all distinct items mentioned across all pages or buffet lists.
3. If no description is present, generate a delicious, professional 1-sentence culinary description.
4. Set "available" to true by default.
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

    let items = [];
    if (Array.isArray(parsedData.items)) {
      items = parsedData.items;
    } else if (Array.isArray(parsedData)) {
      items = parsedData;
    } else if (parsedData && typeof parsedData === "object") {
      items = [parsedData];
    }

    const cleaned = items
      .filter((i) => i && i.name)
      .map((i) => {
        let cat = ALLOWED_CATEGORIES.includes(i.category) ? i.category : "Main Course";
        return {
          name: String(i.name).trim(),
          category: cat,
          description: i.description ? String(i.description).trim() : "",
          available: i.available !== false,
        };
      });

    res.json({ items: cleaned });
  } catch (error) {
    console.error("AI Menu parsing error:", error);
    res.status(500).json({
      error: "Failed to parse menu items with AI",
      details: error.message,
    });
  }
};

// Bulk create menu items (admin)
exports.createBulk = async (req, res) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ error: "No menu items provided for bulk creation" });
    }

    const toInsert = rawItems
      .filter((i) => i && i.name && i.name.trim())
      .map((i) => {
        const cat = ALLOWED_CATEGORIES.includes(i.category) ? i.category : "Main Course";
        return {
          name: i.name.trim(),
          category: cat,
          description: i.description ? i.description.trim() : "",
          price: Number(i.price) || 0,
          image_url: i.image_url || "",
          available: i.available !== false,
        };
      });

    const created = await MenuItem.insertMany(toInsert);

    await logAction({
      user_id: req.user._id,
      action: "menu_bulk_created",
      entity_type: "menu",
      entity_id: created[0]?._id,
      details: `Bulk created ${created.length} menu items via AI Ingestion`,
      ip_address: req.ip,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "menu", action: "bulk_create", count: created.length });
    }

    res.status(201).json({
      message: `Successfully created ${created.length} menu items`,
      items: created,
    });
  } catch (error) {
    console.error("Bulk Menu creation error:", error);
    res.status(500).json({
      error: "Failed to create menu items in bulk",
      details: error.message,
    });
  }
};