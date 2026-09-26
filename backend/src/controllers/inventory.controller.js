const Inventory = require("../models/Inventory");
const Booking = require("../models/Booking");
const Package = require("../models/Package");
const Inquiry = require("../models/Inquiry");
const Quotation = require("../models/Quotation");
const InventoryLog = require("../models/InventoryLog");
const writeInventoryLog = require("../utils/writeInventoryLog");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { INVENTORY_PARSER_PROMPT } = require("../services/zellePrompts");
const logAction = require("../utils/logAction");
const Notification = require("../models/Notification");
const { notifyAdmins } = require("../utils/notify");

const ALLOWED_CATEGORIES = ["Event Setup & Furniture", "Dining & Service Inventory"];

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

const checkAndNotifyStockAlerts = async (alertItems, targetDateStr, io) => {
  if (!Array.isArray(alertItems) || alertItems.length === 0) return;

  for (const alert of alertItems) {
    const { item, stockOnHand, stockStatus, threshold } = alert;
    if (!item || !item._id || !["low_stock", "no_stock"].includes(stockStatus)) continue;

    try {
      // Deduplication: check if an unread notification exists OR one created within last 24h for this item, date, and status
      const existing = await Notification.findOne({
        "meta.inventory_id": item._id,
        "meta.date": targetDateStr,
        "meta.stock_status": stockStatus,
        $or: [
          { is_read: false },
          { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        ]
      });

      if (existing) continue;

      let title = "";
      let body = "";
      if (stockStatus === "no_stock") {
        title = "No Stock Alert";
        body = `${item.item_name} has reached no stock.\nStock on Hand: 0\nTotal Quantity: ${item.quantity || 0}`;
      } else {
        title = "Low Stock Alert";
        body = `${item.item_name} is now low in stock.\nStock on Hand: ${stockOnHand}\nLow Stock Threshold: ${threshold}`;
      }

      await notifyAdmins({
        title,
        body,
        type: "warning",
        link: "/admin/inventory",
        meta: {
          inventory_id: item._id,
          item_name: item.item_name,
          date: targetDateStr,
          stock_status: stockStatus,
          stock_on_hand: stockOnHand,
          threshold: threshold
        }
      }, io);
    } catch (err) {
      console.error("Error sending stock alert notification for", item.item_name, err);
    }
  }
};

exports.create = async (req, res) => {
  try {
    const rawName = req.body.item_name;
    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      return res.status(400).json({ message: "Item name is required" });
    }

    const trimmedName = rawName.trim();
    const identifier = normalizeIdentifier(trimmedName);
    const escaped = escapeRegex(trimmedName);

    // Duplicate check: unique identifier or case-insensitive item name
    const existing = await Inventory.findOne({
      $or: [
        ...(identifier ? [{ identifier }] : []),
        { item_name: { $regex: new RegExp(`^${escaped}$`, "i") } }
      ]
    });

    if (existing) {
      return res.status(400).json({
        message: "This item is already included in the inventory."
      });
    }

    const rawThreshold =
      req.body.low_stock_threshold !== undefined &&
      req.body.low_stock_threshold !== null &&
      req.body.low_stock_threshold !== ""
        ? req.body.low_stock_threshold
        : req.body.lowStockThreshold;

    let threshold = null;
    if (rawThreshold !== undefined && rawThreshold !== null && rawThreshold !== "") {
      threshold = Number(rawThreshold);
      if (!Number.isInteger(threshold) || threshold <= 0) {
        return res.status(400).json({ message: "Low stock threshold must be a whole number greater than 0" });
      }
      const rawQty = req.body.quantity !== undefined ? Number(req.body.quantity) : 0;
      if (rawQty > 0 && threshold > rawQty) {
        return res.status(400).json({ message: "Low stock threshold cannot be greater than Total Quantity" });
      }
    }

    const payload = {
      ...req.body,
      item_name: trimmedName,
      identifier: identifier,
      low_stock_threshold: threshold
    };

    const item = await Inventory.create(payload);
    writeInventoryLog({
      inventory_id: item._id,
      event_type: "created",
      delta: item.quantity || 0,
      actor_id: req.user?._id,
      reason: "Item added to inventory",
    });
    return res.status(201).json(item);
  } catch (error) {
    if (error.message === "This item is already included in the inventory." || error.code === 11000) {
      return res.status(400).json({ message: "This item is already included in the inventory." });
    }
    return res.status(500).json({ message: error.message || "Failed to create inventory item" });
  }
};

exports.getAll = async (req, res) => {
  const items = await Inventory.find();
  const formatted = items.map(item => {
    const obj = item.toObject ? item.toObject() : { ...item };
    if (!obj.identifier && obj.item_name) {
      obj.identifier = normalizeIdentifier(obj.item_name);
    }
    return obj;
  });
  return res.json(formatted);
};

exports.getPublic = async (req, res) => res.json(await Inventory.find({ available: true }));
exports.getById = async (req, res) => res.json(await Inventory.findById(req.params.id));

exports.update = async (req, res) => {
  try {
    const { reason, ...updates } = req.body;

    if (updates.item_name !== undefined) {
      if (typeof updates.item_name !== "string" || !updates.item_name.trim()) {
        return res.status(400).json({ message: "Item name cannot be empty" });
      }
      const trimmedName = updates.item_name.trim();
      const identifier = normalizeIdentifier(trimmedName);
      const escaped = escapeRegex(trimmedName);

      const conflict = await Inventory.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(identifier ? [{ identifier }] : []),
          { item_name: { $regex: new RegExp(`^${escaped}$`, "i") } }
        ]
      });

      if (conflict) {
        return res.status(400).json({
          message: "This item is already included in the inventory."
        });
      }

      updates.item_name = trimmedName;
      updates.identifier = identifier;
    }

    const before = await Inventory.findById(req.params.id);
    if (!before) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const rawUpdateThreshold =
      updates.low_stock_threshold !== undefined &&
      updates.low_stock_threshold !== null &&
      updates.low_stock_threshold !== ""
        ? updates.low_stock_threshold
        : updates.lowStockThreshold;

    if (rawUpdateThreshold !== undefined && rawUpdateThreshold !== null && rawUpdateThreshold !== "") {
      const threshold = Number(rawUpdateThreshold);
      if (!Number.isInteger(threshold) || threshold <= 0) {
        return res.status(400).json({ message: "Low stock threshold must be a whole number greater than 0" });
      }
      const targetQty = updates.quantity !== undefined ? Number(updates.quantity) : (before ? before.quantity : 0);
      if (targetQty > 0 && threshold > targetQty) {
        return res.status(400).json({ message: "Low stock threshold cannot be greater than Total Quantity" });
      }
      updates.low_stock_threshold = threshold;
    } else if (rawUpdateThreshold === null || rawUpdateThreshold === "") {
      updates.low_stock_threshold = null;
    }

    const item = await Inventory.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });

    if (before && item && typeof updates.quantity === "number" && updates.quantity !== before.quantity) {
      writeInventoryLog({
        inventory_id: item._id,
        event_type: "manual_adjustment",
        delta: updates.quantity - before.quantity,
        actor_id: req.user?._id,
        reason: reason || "Manual stock adjustment",
      });
    }

    if (before && item && typeof updates.available === "boolean" && updates.available !== before.available) {
      writeInventoryLog({
        inventory_id: item._id,
        event_type: "manual_adjustment",
        delta: 0,
        actor_id: req.user?._id,
        reason: reason || (updates.available ? "Item marked as Available" : "Item marked as Unavailable"),
      });
    }

    return res.json(item);
  } catch (error) {
    if (error.message === "This item is already included in the inventory." || error.code === 11000) {
      return res.status(400).json({ message: "This item is already included in the inventory." });
    }
    return res.status(500).json({ message: error.message || "Failed to update inventory item" });
  }
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

const parseInclusionItem = (str) => {
  if (!str) return { name: "", quantity: 1 };
  let text = String(str).trim();

  // Strip wrapping quotes and escapes
  for (let i = 0; i < 4; i++) {
    text = text.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  // Strip category brackets at start: [Dining & Service Inventory]
  text = text.replace(/^\s*\[[^\]]*\]\s*/, "").trim();

  // Strip quotes again if they were inside brackets
  for (let i = 0; i < 2; i++) {
    text = text.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  let quantity = 1;
  // 1. Check parens at end e.g. (150) or (150 pcs) or (1 tray)
  const parenMatch = text.match(/\(([^)]*)\)\s*$/);
  if (parenMatch) {
    const digits = parenMatch[1].match(/\d+/);
    if (digits) {
      quantity = parseInt(digits[0], 10);
    }
    text = text.replace(/\s*\([^)]*\)\s*$/, "").trim();
  } else {
    // 2. Check x6 or × 6 at end
    const xMatch = text.match(/[\s×x](\d+)\s*$/i);
    if (xMatch) {
      quantity = parseInt(xMatch[1], 10);
      text = text.replace(/[\s×x](\d+)\s*$/i, "").trim();
    } else {
      // 3. Check leading digits e.g. '6 Round Tables'
      const leadMatch = text.match(/^(\d+)\s+(.*)$/);
      if (leadMatch) {
        quantity = parseInt(leadMatch[1], 10);
        text = leadMatch[2].trim();
      }
    }
  }

  return { name: text.trim(), quantity: Math.max(1, quantity) };
};

const normalizeInventoryName = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const findInventoryItem = (nameOrId, invById, invByName, allInventory) => {
  if (!nameOrId) return null;
  const idStr = String(nameOrId._id || nameOrId);
  if (invById.has(idStr)) return invById.get(idStr);

  const clean = normalizeInventoryName(
    typeof nameOrId === "string" ? nameOrId : nameOrId.name || nameOrId.item_name
  );
  if (!clean) return null;

  if (invByName.has(clean)) return invByName.get(clean);

  // Check singular/plural
  if (clean.endsWith("s") && invByName.has(clean.slice(0, -1))) {
    return invByName.get(clean.slice(0, -1));
  }
  if (invByName.has(clean + "s")) {
    return invByName.get(clean + "s");
  }

  // Check startsWith/prefix match
  for (const inv of allInventory) {
    const invNorm = normalizeInventoryName(inv.item_name);
    if (invNorm === clean) return inv;
    if (invNorm && clean && (invNorm.startsWith(clean) || clean.startsWith(invNorm))) {
      return inv;
    }
  }

  return null;
};

const isSameEventDate = (eventDate, targetDateStr) => {
  if (!eventDate || !targetDateStr) return false;
  const d = new Date(eventDate);
  if (isNaN(d.getTime())) return false;
  const utc = d.toISOString().slice(0, 10);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return utc === targetDateStr || local === targetDateStr;
};

exports.getUsage = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const itemIdStr = String(item._id);
    const itemNameNorm = normalizeInventoryName(item.item_name);
    const itemIdent = item.identifier ? normalizeInventoryName(item.identifier) : "";

    // 1. Check all packages where this item is used
    const allPackages = await Package.find({}, "name offer_type event_type inclusions setup_equipment").lean();
    const matchingPackages = allPackages.filter((pkg) => {
      // Check setup_equipment
      if (Array.isArray(pkg.setup_equipment)) {
        for (const eq of pkg.setup_equipment) {
          const eqId = String(eq.inventory_id?._id || eq.inventory_id || "");
          if (eqId && eqId === itemIdStr) return true;
        }
      }
      // Check inclusions
      if (Array.isArray(pkg.inclusions)) {
        for (const inc of pkg.inclusions) {
          const parsed = parseInclusionItem(inc);
          const incNorm = normalizeInventoryName(parsed.name);
          if (incNorm === itemNameNorm) return true;
          if (itemIdent && incNorm === itemIdent) return true;
          if (itemNameNorm.endsWith("s") && incNorm === itemNameNorm.slice(0, -1)) return true;
          if (incNorm.endsWith("s") && incNorm.slice(0, -1) === itemNameNorm) return true;
          if (itemNameNorm.length >= 4 && (incNorm.includes(itemNameNorm) || itemNameNorm.includes(incNorm))) return true;
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

    // Active bookings
    const activeBookingsRaw = await Booking.find({
      status: { $nin: ["Cancelled", "cancelled", "refunded", "Completed", "completed"] },
      event_date: { $gte: startOfToday },
      $or: [
        { "inventory_items.inventory_id": item._id },
        { "inventory_items.name": { $regex: new RegExp(`^${escapeRegex(item.item_name)}$`, "i") } },
        { package_inclusions: { $regex: new RegExp(escapeRegex(item.item_name), "i") } },
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

    // Active inquiries
    const activeInquiriesRaw = await Inquiry.find({
      status: { $nin: ["Cancelled", "cancelled", "Rejected", "Quote Rejected", "Expired", "Converted to Booking"] },
      archived: { $ne: true },
      event_date: { $gte: startOfToday },
      $or: [
        { "inventory_items.inventory_id": item._id },
        { "inventory_items.name": { $regex: new RegExp(`^${escapeRegex(item.item_name)}$`, "i") } },
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

    // Active quotations
    const activeQuotationsRaw = await Quotation.find({
      status: { $in: ["Draft", "Sent", "Revision Requested", "Accepted", "Awaiting Final Confirmation"] },
      $or: [
        { package_inclusions: { $regex: new RegExp(escapeRegex(item.item_name), "i") } },
        ...(matchingPkgIds.length > 0 ? [{ package_id: { $in: matchingPkgIds } }] : [])
      ]
    }, "quotation_number status package_name inquiry_id")
      .populate("inquiry_id", "reference event_date status archived contact_first_name contact_last_name")
      .sort({ createdAt: -1 })
      .lean();

    // Filter quotations to only those with active inquiry
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
      itemName: item.item_name,
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
    console.error("Error checking inventory usage:", error);
    return res.status(500).json({ message: "Failed to check inventory usage" });
  }
};


exports.getAvailability = async (req, res) => {
  try {
    const { date, excludeBookingId } = req.query;
    const allInventory = await Inventory.find().sort({ item_name: 1 });

    const invById = new Map(allInventory.map((i) => [String(i._id), i]));
    const invByName = new Map(allInventory.map((i) => [normalizeInventoryName(i.item_name), i]));

    let targetDateStr = "";
    let startOfDay, endOfDay;
    if (date && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetDateStr = date;
      const [y, m, d] = date.split("-").map(Number);
      const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
      const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
      const utcStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const utcEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      startOfDay = new Date(Math.min(localStart.getTime(), utcStart.getTime()));
      endOfDay = new Date(Math.max(localEnd.getTime(), utcEnd.getTime()));
    } else if (date) {
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      targetDateStr = targetDate.toISOString().slice(0, 10);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth() + 1;
      const d = targetDate.getDate();
      const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
      const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
      const utcStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const utcEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      startOfDay = new Date(Math.min(localStart.getTime(), utcStart.getTime()));
      endOfDay = new Date(Math.max(localEnd.getTime(), utcEnd.getTime()));
    } else {
      const now = new Date();
      targetDateStr = now.toISOString().slice(0, 10);
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
      const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
      const utcStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const utcEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      startOfDay = new Date(Math.min(localStart.getTime(), utcStart.getTime()));
      endOfDay = new Date(Math.max(localEnd.getTime(), utcEnd.getTime()));
    }

    const bookingQuery = {
      status: {
        $nin: ["cancelled", "Cancelled", "refunded", "inquiry", "quote_sent", "rejected"]
      },
      event_date: { $gte: startOfDay, $lte: endOfDay }
    };

    if (excludeBookingId) {
      bookingQuery._id = { $ne: excludeBookingId };
    }

    const activeBookings = await Booking.find(bookingQuery).populate("package_id");
    const dateBookings = activeBookings.filter((b) => isSameEventDate(b.event_date, targetDateStr));

    const reservedQuantities = {};
    const itemEventUsages = {};

    dateBookings.forEach((booking) => {
      const bookingReservedMap = new Map();

      // 1. Explicit inventory items assigned on the booking (e.g. manager equipment assignments)
      if (Array.isArray(booking.inventory_items)) {
        booking.inventory_items.forEach((item) => {
          const inv = findInventoryItem(item.inventory_id || item.name, invById, invByName, allInventory);
          if (inv && item.quantity != null) {
            const idStr = String(inv._id);
            bookingReservedMap.set(idStr, (bookingReservedMap.get(idStr) || 0) + Number(item.quantity || 0));
          }
        });
      }

      // 2. Setup equipment from booking or package
      const setupEq = (Array.isArray(booking.setup_equipment) && booking.setup_equipment.length > 0)
        ? booking.setup_equipment
        : (Array.isArray(booking.package_id?.setup_equipment) ? booking.package_id.setup_equipment : []);

      setupEq.forEach((eq) => {
        const inv = findInventoryItem(eq.inventory_id || eq.name || eq.item_name, invById, invByName, allInventory);
        if (inv && eq.quantity != null) {
          const idStr = String(inv._id);
          if (!bookingReservedMap.has(idStr)) {
            bookingReservedMap.set(idStr, Number(eq.quantity || 1));
          }
        }
      });

      // 3. Package inclusions
      const rawInclusions = 
        (Array.isArray(booking.package_inclusions) && booking.package_inclusions.length > 0)
          ? booking.package_inclusions
          : (Array.isArray(booking.inclusions) && booking.inclusions.length > 0)
            ? booking.inclusions
            : (Array.isArray(booking.package_id?.inclusions) ? booking.package_id.inclusions : []);

      // Check removed inclusions
      const removedNames = new Set(
        (Array.isArray(booking.removed_inclusions) ? booking.removed_inclusions : [])
          .map((r) => parseInclusionItem(r?.name || r).name.toLowerCase())
      );

      // Check inclusion adjustments
      const adjustmentsMap = new Map();
      (Array.isArray(booking.inclusion_adjustments) ? booking.inclusion_adjustments : []).forEach((adj) => {
        if (adj && adj.name) {
          const parsedName = parseInclusionItem(adj.name).name.toLowerCase();
          if (adj.quantity != null) {
            adjustmentsMap.set(parsedName, Number(adj.quantity));
          }
        }
      });

      rawInclusions.forEach((inc) => {
        const { name, quantity: defaultQty } = parseInclusionItem(inc);
        const nameLower = name.toLowerCase();
        if (removedNames.has(nameLower)) return;

        const finalQty = adjustmentsMap.has(nameLower) ? adjustmentsMap.get(nameLower) : defaultQty;
        const inv = findInventoryItem(name, invById, invByName, allInventory);
        if (inv && finalQty > 0) {
          const idStr = String(inv._id);
          if (!bookingReservedMap.has(idStr)) {
            bookingReservedMap.set(idStr, finalQty);
          }
        }
      });

      // Sum this booking's reserved items into the date-wide reservedQuantities and track individual event usages
      const customerName = [booking.contact_first_name, booking.contact_last_name].filter(Boolean).join(" ") || booking.celebrant_name || "Customer";
      for (const [idStr, qty] of bookingReservedMap.entries()) {
        reservedQuantities[idStr] = (reservedQuantities[idStr] || 0) + qty;
        if (!itemEventUsages[idStr]) {
          itemEventUsages[idStr] = [];
        }
        itemEventUsages[idStr].push({
          booking_id: booking._id,
          reference: booking.reference || "Booking",
          event_date: booking.event_date,
          customer_name: customerName,
          event_name: booking.event_type || booking.package_name_snapshot || booking.package_id?.name || "Event",
          package_name: booking.package_name_snapshot || booking.package_id?.name || "Package",
          quantity: qty,
          unit: qty === 1 ? "unit" : "pcs",
        });
      }
    });

    const alertItems = [];

    const result = allInventory.map((item) => {
      const idStr = item._id.toString();
      const reserved = reservedQuantities[idStr] || 0;
      const total = item.quantity || 0;
      const stockOnHand = Math.max(0, total - reserved);
      const threshold = (item.low_stock_threshold != null && item.low_stock_threshold > 0) ? item.low_stock_threshold : null;

      let stockStatus = "in_stock";
      if (stockOnHand === 0) {
        stockStatus = "no_stock";
      } else if (threshold != null && stockOnHand <= threshold) {
        stockStatus = "low_stock";
      } else {
        stockStatus = "in_stock";
      }

      if (stockStatus === "low_stock" || stockStatus === "no_stock") {
        alertItems.push({
          item,
          stockOnHand,
          stockStatus,
          threshold: threshold || 0
        });
      }

      const itemObj = item.toObject ? item.toObject() : { ...item };
      if (!itemObj.identifier && itemObj.item_name) {
        itemObj.identifier = normalizeIdentifier(itemObj.item_name);
      }
      return {
        ...itemObj,
        low_stock_threshold: item.low_stock_threshold,
        reserved_quantity: reserved,
        available_quantity: stockOnHand,
        stock_on_hand: stockOnHand,
        stock_status: stockStatus,
        event_usages: itemEventUsages[idStr] || [],
      };
    });

    if (alertItems.length > 0) {
      const io = req.app?.get("io");
      checkAndNotifyStockAlerts(alertItems, targetDateStr, io).catch((err) => {
        console.error("Error in background stock alert check:", err);
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to compute inventory availability", error: error.message });
  }
};

// Parse Inventory Items with Zelle AI (admin)
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

    const parts = [INVENTORY_PARSER_PROMPT];

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

    let rawList = [];
    if (Array.isArray(parsedData.inventory)) {
      rawList = parsedData.inventory;
    } else if (Array.isArray(parsedData.items)) {
      rawList = parsedData.items;
    } else if (Array.isArray(parsedData)) {
      rawList = parsedData;
    } else if (parsedData && typeof parsedData === "object") {
      rawList = [parsedData];
    }

    const normalizeCat = (cat, itemName = "") => {
      if (ALLOWED_CATEGORIES.includes(cat)) return cat;
      const lower = (String(cat || "") + " " + String(itemName || "")).toLowerCase();
      if (
        lower.includes("dining") ||
        lower.includes("tableware") ||
        lower.includes("plate") ||
        lower.includes("spoon") ||
        lower.includes("glass") ||
        lower.includes("cup") ||
        lower.includes("cutlery") ||
        lower.includes("warmer") ||
        lower.includes("chafing") ||
        lower.includes("cooler") ||
        lower.includes("dish") ||
        lower.includes("ice") ||
        lower.includes("jug") ||
        lower.includes("gallon") ||
        lower.includes("planggana") ||
        lower.includes("tulyasi")
      ) {
        return "Dining & Service Inventory";
      }
      return "Event Setup & Furniture";
    };

    const cleaned = rawList
      .filter((i) => i && (i.item_name || i.name))
      .map((i) => {
        const rawName = String(i.item_name || i.name || "").trim();
        const cleanedName = rawName.replace(/\s*\(\d+[^)]*\)$/, "").trim();
        const quantity = Math.max(0, parseInt(i.quantity, 10) || 1);
        return {
          item_name: cleanedName,
          quantity,
          available: i.available !== false,
        };
      });

    res.json({ inventory: cleaned });
  } catch (error) {
    console.error("AI Inventory parsing error:", error);
    res.status(500).json({
      error: "Failed to parse inventory items with AI",
      details: error.message,
    });
  }
};

// Bulk create inventory items (admin)
exports.createBulk = async (req, res) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ error: "No inventory items provided for bulk creation" });
    }

    const createdItems = [];
    const skippedItems = [];

    const existing = await Inventory.find({}, "item_name identifier");
    const existingIdents = new Set(
      existing.map((e) => e.identifier || normalizeIdentifier(e.item_name)).filter(Boolean)
    );
    const existingNames = new Set(
      existing.map((e) => (e.item_name || "").trim().toLowerCase()).filter(Boolean)
    );

    for (const raw of rawItems) {
      const rawName = String(raw.item_name || raw.name || "").trim();
      if (!rawName) continue;

      const ident = normalizeIdentifier(rawName);
      const lowerName = rawName.toLowerCase();

      // Skip duplicate item
      if (existingIdents.has(ident) || existingNames.has(lowerName)) {
        skippedItems.push({
          item_name: rawName,
          reason: "Item already exists in inventory",
        });
        continue;
      }

      const qty = Math.max(0, parseInt(raw.quantity, 10) || 0);

      const itemPayload = {
        item_name: rawName,
        identifier: ident,
        quantity: qty,
        available: raw.available !== false,
      };
      if (raw.category) {
        itemPayload.category = raw.category;
      }

      const newItem = await Inventory.create(itemPayload);

      writeInventoryLog({
        inventory_id: newItem._id,
        event_type: "created",
        delta: qty,
        actor_id: req.user?._id,
        reason: "Imported via Zelle AI",
      });

      existingIdents.add(ident);
      existingNames.add(lowerName);
      createdItems.push(newItem);
    }

    if (createdItems.length > 0) {
      await logAction({
        user_id: req.user?._id,
        action: "inventory_bulk_created",
        entity_type: "inventory",
        entity_id: createdItems[0]._id,
        details: `Bulk created ${createdItems.length} inventory items via Zelle AI Ingestion${
          skippedItems.length > 0 ? ` (${skippedItems.length} skipped duplicates)` : ""
        }`,
        ip_address: req.ip,
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("system:refresh", {
          type: "inventory",
          action: "bulk_create",
          count: createdItems.length,
        });
      }
    }

    res.status(201).json({
      message: `Successfully imported ${createdItems.length} item${
        createdItems.length === 1 ? "" : "s"
      }${
        skippedItems.length > 0
          ? ` (${skippedItems.length} duplicate${skippedItems.length === 1 ? "" : "s"} skipped)`
          : ""
      }`,
      created: createdItems,
      skipped: skippedItems,
      totalImported: createdItems.length,
      totalSkipped: skippedItems.length,
    });
  } catch (error) {
    console.error("Bulk Inventory creation error:", error);
    res.status(500).json({
      error: "Failed to create inventory items in bulk",
      details: error.message,
    });
  }
};

