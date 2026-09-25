const MenuItem = require("../models/MenuItem");
const Package = require("../models/Package");
const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");
const Quotation = require("../models/Quotation");
const { generateContentWithRetry, cleanAndParseJson } = require("../services/geminiClient");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const logAction = require("../utils/logAction");

const escapeRegex = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

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

exports.getUsage = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const itemIdStr = String(item._id);
    const itemName = item.name ? item.name.trim() : "";
    const escapedName = escapeRegex(itemName);
    const nameRegex = new RegExp(`^${escapedName}$`, "i");

    // 1. Packages / Special Offers / Combos
    const allPackages = await Package.find({}, "name offer_type event_type menu_items offer_food_items").lean();
    const matchingPackages = allPackages.filter((pkg) => {
      // menu_items
      if (Array.isArray(pkg.menu_items)) {
        for (const m of pkg.menu_items) {
          const mId = String(m?._id || m || "");
          if (mId && mId === itemIdStr) return true;
        }
      }
      // offer_food_items (for combos/special offers)
      if (Array.isArray(pkg.offer_food_items)) {
        for (const ofi of pkg.offer_food_items) {
          if (ofi.item_name && nameRegex.test(ofi.item_name.trim())) return true;
        }
      }
      return false;
    });

    const matchingPkgIds = matchingPackages.map((p) => p._id);
    const matchingPkgNames = matchingPackages.map((p) => p.name);

    // 2. Active / upcoming customer usage
    // Past/completed events should NOT prevent deletion or trigger active usage warning
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Active Bookings
    const activeBookingsRaw = await Booking.find({
      status: { $nin: ["Cancelled", "cancelled", "refunded", "Completed", "completed"] },
      event_date: { $gte: startOfToday },
      $or: [
        { "menu_items.name": nameRegex },
        { "offer_food_snapshot.item_name": nameRegex },
        ...(matchingPkgIds.length > 0 ? [{ package_id: { $in: matchingPkgIds } }] : [])
      ]
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
        { selected_menu: item._id },
        { "offer_food_snapshot.item_name": nameRegex },
        ...(matchingPkgIds.length > 0 ? [{ package_id: { $in: matchingPkgIds } }] : [])
      ]
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
        { "menu_items.name": nameRegex },
        { "offer_food_snapshot.item_name": nameRegex },
        ...(matchingPkgIds.length > 0 ? [{ package_id: { $in: matchingPkgIds } }] : [])
      ]
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
      itemId: item._id,
      itemName: item.name,
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
    console.error("Error checking menu usage:", error);
    return res.status(500).json({ message: "Failed to check menu item usage" });
  }
};

// Parse Menu Items with Gemini AI (admin)
exports.parseWithAI = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service is currently unavailable. Please try again later." });


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

    const { text } = await generateContentWithRetry({
      contents: parts,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const parsedData = cleanAndParseJson(text);

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
      error: error.message || "Failed to parse menu items with AI",
      details: error.originalError?.message || error.message,
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