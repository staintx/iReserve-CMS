const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");
const Quotation = require("../models/Quotation");
const Inventory = require("../models/Inventory");
const InventoryReservation = require("../models/InventoryReservation");
const Package = require("../models/Package");
const MenuItem = require("../models/MenuItem");
const BusinessInfo = require("../models/BusinessInfo");
const BlockedDate = require("../models/BlockedDate");

// --- Perf: batch inventory check (2 queries instead of 2N) ---
const checkInventoryAvailability = async (
  eventDate,
  inventoryItems,
  excludeBookingId = null,
) => {
  if (!inventoryItems || inventoryItems.length === 0)
    return { available: true };

  const dayStart = new Date(eventDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(eventDate);
  dayEnd.setHours(23, 59, 59, 999);

  const inventoryIds = inventoryItems.filter(i => i.inventory_id).map(i => i.inventory_id);
  if (inventoryIds.length === 0) return { available: true };

  const reservationQuery = {
    inventory_id: { $in: inventoryIds },
    event_date: { $gte: dayStart, $lte: dayEnd },
  };
  if (excludeBookingId) {
    reservationQuery.booking_id = { $ne: excludeBookingId };
  }

  const [inventories, reservations] = await Promise.all([
    Inventory.find({ _id: { $in: inventoryIds } }).lean(),
    InventoryReservation.find(reservationQuery).lean(),
  ]);

  const invMap = new Map(inventories.map(inv => [String(inv._id), inv]));
  const reservedMap = new Map();
  for (const res of reservations) {
    const key = String(res.inventory_id);
    reservedMap.set(key, (reservedMap.get(key) || 0) + res.quantity);
  }

  for (const item of inventoryItems) {
    if (!item.inventory_id) continue;
    const inv = invMap.get(String(item.inventory_id));
    if (!inv) continue;
    const reserved = reservedMap.get(String(item.inventory_id)) || 0;
    if (reserved + Number(item.quantity || 0) > inv.quantity) {
      return { available: false, itemName: inv.item_name };
    }
  }
  return { available: true };
};

const asyncHandler = require("../utils/asyncHandler");
const { createNotification, notifyAdmins } = require("../utils/notify");
const logAction = require("../utils/logAction");
const writeInventoryLog = require("../utils/writeInventoryLog");
const {
  sendBookingConfirmationEmail,
  sendBookingStatusEmail,
} = require("../utils/booking-emails");

const calculateBookingPrice = async (body) => {
  let sum = 0;
  const guestCount = Number(body.guest_count) || 0;

  const hasFood =
    body.include_food !== false &&
    ((Array.isArray(body.menu_items) && body.menu_items.length > 0) ||
      (Array.isArray(body.selected_menu) && body.selected_menu.length > 0));

  if (body.package_id && !hasFood) {
    const pkg = await Package.findById(body.package_id);
    if (pkg) {
      const packageType = pkg.package_type || "Event Setup Only";
      if (packageType === "Event Setup Only") {
        // Prefer an admin-selected scaffold option price when provided
        let basePrice = Number(pkg.setup_price) || 0;
        if (
          body.selected_scaffold_option_id &&
          Array.isArray(pkg.scaffold_size_options)
        ) {
          const opt = pkg.scaffold_size_options.find(
            (o) => String(o._id) === String(body.selected_scaffold_option_id),
          );
          if (opt) basePrice = Number(opt.price) || basePrice;
        }
        sum += basePrice;
      } else {
        const basePrice = Number(pkg.price_per_guest) || 0;
        sum += basePrice * guestCount;
      }
    }
  }

  // Include food menu prices if food is included and dishes are selected (setup is free)
  if (hasFood && guestCount > 0) {
    if (Array.isArray(body.menu_items) && body.menu_items.length > 0) {
      for (const item of body.menu_items) {
        sum += (Number(item.price) || 0) * guestCount;
      }
    } else if (Array.isArray(body.selected_menu) && body.selected_menu.length > 0) {
      for (const item of body.selected_menu) {
        if (item && typeof item === "object" && item.price !== undefined) {
          sum += (Number(item.price) || 0) * guestCount;
        } else if (item) {
          const found = await MenuItem.findById(item);
          if (found && found.price) {
            sum += (Number(found.price) || 0) * guestCount;
          }
        }
      }
    }
  }

  if (Array.isArray(body.service_items)) {
    for (const svc of body.service_items) {
      sum += (Number(svc.price) || 0) * (Number(svc.quantity) || 1);
    }
  }

  if (Array.isArray(body.additional_charges)) {
    for (const charge of body.additional_charges) {
      sum += Number(charge.amount) || 0;
    }
  }

  return sum;
};

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue) return null;
  const normalized = String(timeValue).trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const period = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (period) {
    if (hours === 12) hours = 0;
    if (period === "pm") hours += 12;
  }
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const getDateStatus = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { valid: false, past: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { valid: true, past: date < today };
};

const getThreeDayLockout = (eventDate) => {
  const msUntilEvent = new Date(eventDate).getTime() - Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  return msUntilEvent <= threeDaysMs;
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const sameLocation = (requestLocation, existingLocation) => {
  // Food Only / Pickup orders do not occupy the venue and shouldn't trigger a location conflict
  if (requestLocation?.delivery_method === "pickup") return false;
  if (requestLocation?.service_type === "Food Only") return false;
  if (requestLocation?.event_type?.toLowerCase().includes("food delivery")) return false;
  
  // Existing Food Only orders don't block the venue either
  if (existingLocation?.event_type?.toLowerCase().includes("food delivery")) return false;

  // If the request doesn't have a municipality yet, we can't definitively say it's the same location.
  // Returning true here would cause province-only conflicts.
  if (!requestLocation?.municipality) return false;

  const keys = ["venue_type", "province", "municipality", "barangay", "street"];

  return keys.every((key) => {
    const requested = requestLocation?.[key];
    if (!requested) return true;
    return normalizeText(existingLocation?.[key]) === normalizeText(requested);
  });
};

const getTimeRange = (startTime, durationHours) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const duration = Number(durationHours);
  if (startMinutes === null || Number.isNaN(duration) || duration <= 0)
    return null;
  return { startMinutes, endMinutes: startMinutes + duration * 60 };
};

const filterAvailableStaff = async (
  eventDate,
  startTime,
  durationHours,
  bufferMinutes,
  staffIds,
  excludeBookingId = null,
) => {
  if (!staffIds || staffIds.length === 0) return staffIds;

  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return staffIds;
  const buffer =
    Number(bufferMinutes) || Number(process.env.BOOKING_BUFFER_MINUTES) || 0;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const query = {
    status: { $in: ["pending deposit", "confirmed", "preparing", "ongoing"] },
    event_date: { $gte: dayStart, $lte: dayEnd },
    $or: [
      { event_manager_id: { $in: staffIds } },
      { staff_ids: { $in: staffIds } },
    ],
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const conflictingBookings = await Booking.find(query);
  if (conflictingBookings.length === 0) return staffIds;

  const newRange = getTimeRange(startTime, durationHours);
  const bookedStaff = new Set();

  conflictingBookings.forEach((b) => {
    if (!newRange) {
      if (b.event_manager_id) bookedStaff.add(b.event_manager_id.toString());
      if (b.staff_ids)
        b.staff_ids.forEach((id) => bookedStaff.add(id.toString()));
      return;
    }

    const existingRange = getTimeRange(b.start_time, b.duration_hours);
    if (!existingRange) {
      if (b.event_manager_id) bookedStaff.add(b.event_manager_id.toString());
      if (b.staff_ids)
        b.staff_ids.forEach((id) => bookedStaff.add(id.toString()));
      return;
    }

    const existingStart = existingRange.startMinutes - buffer;
    const existingEnd = existingRange.endMinutes + buffer;
    const isOverlap =
      newRange.startMinutes < existingEnd &&
      newRange.endMinutes > existingStart;

    if (isOverlap) {
      if (b.event_manager_id) bookedStaff.add(b.event_manager_id.toString());
      if (b.staff_ids)
        b.staff_ids.forEach((id) => bookedStaff.add(id.toString()));
    }
  });

  return staffIds.filter((id) => !bookedStaff.has(id.toString()));
};

const findBookingConflict = async ({
  eventDate,
  startTime,
  durationHours,
  excludeId,
  location,
  bufferMinutes,
  ignoreLocation = false,
}) => {
  if (!eventDate) return null;
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return null;
  const buffer =
    Number(bufferMinutes) || Number(process.env.BOOKING_BUFFER_MINUTES) || 0;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const query = {
    status: { $in: ["pending deposit", "confirmed", "preparing", "ongoing"] },
    event_date: { $gte: dayStart, $lte: dayEnd },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const existingBookings = await Booking.find(query);
  if (existingBookings.length === 0) return null;

  const newRange = getTimeRange(startTime, durationHours);
  if (!newRange) {
    return (
      existingBookings.find((booking) => ignoreLocation || sameLocation(location, booking)) ||
      null
    );
  }

  return (
    existingBookings.find((booking) => {
      if (!ignoreLocation && location?.municipality && !sameLocation(location, booking)) {
        return false;
      }
      const existingRange = getTimeRange(
        booking.start_time,
        booking.duration_hours,
      );
      if (!existingRange) return true;
      const existingStart = existingRange.startMinutes - buffer;
      const existingEnd = existingRange.endMinutes + buffer;
      return (
        newRange.startMinutes < existingEnd &&
        newRange.endMinutes > existingStart
      );
    }) || null
  );
};

// --- Perf: cache BusinessInfo (60s TTL) for rarely-changing settings ---
let _businessInfoCache = null;
let _businessInfoCacheTime = 0;
const BUSINESS_INFO_TTL = 60000;
const getCachedBusinessInfo = async () => {
  const now = Date.now();
  if (_businessInfoCache && now - _businessInfoCacheTime < BUSINESS_INFO_TTL) {
    return _businessInfoCache;
  }
  _businessInfoCache = await BusinessInfo.findOne().lean();
  _businessInfoCacheTime = now;
  return _businessInfoCache;
};

const checkMaxBookingsLimit = async (eventDate, excludeId = null) => {
  if (!eventDate) return false;
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return false;
  
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const query = {
    status: { $in: ["pending deposit", "confirmed", "preparing", "ongoing"] },
    event_date: { $gte: dayStart, $lte: dayEnd },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const [count, businessInfo] = await Promise.all([
    Booking.countDocuments(query),
    getCachedBusinessInfo(),
  ]);
  const limit = businessInfo?.max_bookings_per_day || 2;
  
  return count >= limit;
};

exports.create = asyncHandler(async (req, res) => {
  if (req.body.package_id === "") {
    delete req.body.package_id;
  }

  const dateStatus = getDateStatus(req.body.event_date);
  if (!dateStatus.valid) {
    return res.status(400).json({ message: "Event date is invalid" });
  }
  if (dateStatus.past) {
    return res
      .status(400)
      .json({ message: "Event date must be today or later" });
  }

  if (req.user?.role === "customer") {
    req.body.customer_id = req.user._id;
    req.body.status = "inquiry";
    req.body.payment_status = "pending";
  } else if (!req.body.status) {
    req.body.status = "inquiry";
  }

  if (req.body.delivery_method === "pickup") {
    const businessInfo = await BusinessInfo.findOne();
    const pickupLocation =
      businessInfo?.pickup_address?.trim() || businessInfo?.address?.trim();

    if (!pickupLocation) {
      return res.status(400).json({
        message:
          "Pickup is unavailable until the pickup location address is configured.",
      });
    }

    // The caterer's address is authoritative for pickup bookings. Customer
    // delivery-address fields are intentionally not required or persisted.
    req.body.pickup_location = pickupLocation;
    delete req.body.province;
    delete req.body.municipality;
    delete req.body.barangay;
    delete req.body.street;
    delete req.body.landmark;
    delete req.body.zip_code;
  }

  // Check Blocked Dates
  const parsedEventDate = new Date(req.body.event_date);
  parsedEventDate.setHours(0, 0, 0, 0);
  const blocked = await BlockedDate.findOne({ date: parsedEventDate });
  if (blocked) {
    return res.status(409).json({ message: `This date is blocked: ${blocked.reason || 'Unavailable'}` });
  }

  // Conflict checks (max bookings, schedule conflicts, inventory) are bypassed during inquiry creation
  // to allow the Admin to review and suggest alternatives.
  // Filter out conflicting staff members
  const requestedStaffIds = [];
  if (req.body.event_manager_id)
    requestedStaffIds.push(req.body.event_manager_id);
  if (Array.isArray(req.body.staff_ids))
    requestedStaffIds.push(...req.body.staff_ids);

  if (requestedStaffIds.length > 0) {
    const availableStaffIds = await filterAvailableStaff(
      req.body.event_date,
      req.body.start_time,
      req.body.duration_hours,
      req.body.buffer_minutes,
      requestedStaffIds,
    );

    const availableStaffSet = new Set(
      availableStaffIds.map((id) => id.toString()),
    );

    if (
      req.body.event_manager_id &&
      !availableStaffSet.has(req.body.event_manager_id.toString())
    ) {
      req.body.event_manager_id = undefined;
    }
    if (Array.isArray(req.body.staff_ids)) {
      req.body.staff_ids = req.body.staff_ids.filter((id) =>
        availableStaffSet.has(id.toString()),
      );
    }
    if (Array.isArray(req.body.staff_assignments)) {
      req.body.staff_assignments = req.body.staff_assignments.filter(
        (a) => a.user_id && availableStaffSet.has(a.user_id.toString()),
      );
    }
  }

  // Server-side price calculation — override any client-submitted total_price
  if (req.user?.role === "customer") {
    const serverPrice = await calculateBookingPrice(req.body);
    if (serverPrice > 0) {
      req.body.total_price = serverPrice;
    }
  }

  const booking = await Booking.create(req.body);

  if (booking.status === "confirmed" && booking.inventory_items?.length > 0) {
    const reservations = booking.inventory_items
      .filter((item) => item.inventory_id)
      .map((item) => ({
        inventory_id: item.inventory_id,
        booking_id: booking._id,
        event_date: booking.event_date,
        quantity: item.quantity,
      }));
    if (reservations.length > 0) {
      await InventoryReservation.insertMany(reservations);
      reservations.forEach((r) =>
        writeInventoryLog({
          inventory_id: r.inventory_id,
          event_type: "reservation_allocated",
          delta: -r.quantity,
          actor_id: req.user?._id,
          booking_id: booking._id,
          reason: `Booking ${booking.reference || booking._id} confirmed`,
        }),
      );
    }
  }

  await logAction({
    user_id: req.user._id,
    action: "booking_created",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Created booking for ${booking.event_type || "event"} on ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "N/A"}`,
    ip_address: req.ip,
  });

  // Send booking confirmation email only if immediately confirmed (e.g., COD)
  const customerEmail = booking.contact_email || req.user?.email;
  if (customerEmail && booking.status === "confirmed") {
    sendBookingConfirmationEmail({ booking, customerEmail }).catch(() => {});
  }

  // Payment is NOT triggered during inquiry creation.
  // It will be triggered after the quote is accepted by the customer.

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "booking", action: "create" });

  res.status(201).json(booking);
});

exports.getAll = asyncHandler(async (req, res) => {
  res.json(
    await Booking.find().populate("customer_id package_id event_manager_id").lean(),
  );
});

exports.getMine = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer_id: req.user._id }).populate(
    "customer_id package_id event_manager_id",
  ).lean();
  res.json(bookings);
});

exports.getById = asyncHandler(async (req, res) => {
  if (req.user?.role === "customer") {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customer_id: req.user._id,
    }).populate("customer_id package_id event_manager_id staff_ids").lean();
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    return res.json(booking);
  }

  res.json(
    await Booking.findById(req.params.id).populate(
      "customer_id package_id event_manager_id staff_ids",
    ).lean(),
  );
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.package_id === "") {
    delete req.body.package_id;
  }
  const current = await Booking.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Booking not found" });

  if (getThreeDayLockout(current.event_date)) {
    const allowedLateFields = [
      "status",
      "payment_status",
      "payment_method",
      "event_manager_id",
      "staff_ids",
      "staff_assignments",
      "equipment_assignments",
      "equipment_returned",
    ];
    const hasDisallowedFields = Object.keys(req.body).some(
      (key) => !allowedLateFields.includes(key),
    );
    if (hasDisallowedFields) {
      return res
        .status(400)
        .json({
          message: "Booking details cannot be changed 3 days before the event.",
        });
    }
  }

  if (req.body.event_date) {
    const dateStatus = getDateStatus(req.body.event_date);
    if (!dateStatus.valid) {
      return res.status(400).json({ message: "Event date is invalid" });
    }
    if (dateStatus.past) {
      return res
        .status(400)
        .json({ message: "Event date must be today or later" });
    }
    
    // Check Blocked Dates
    const parsedEventDate = new Date(req.body.event_date);
    parsedEventDate.setHours(0, 0, 0, 0);
    const blocked = await BlockedDate.findOne({ date: parsedEventDate });
    if (blocked) {
      return res.status(409).json({ message: `This date is blocked: ${blocked.reason || 'Unavailable'}` });
    }
    
    // Check Max Bookings Limit (exclude current booking)
    const maxLimitReached = await checkMaxBookingsLimit(req.body.event_date, current._id);
    if (maxLimitReached) {
      return res.status(409).json({ message: "This date has reached the maximum number of bookings allowed." });
    }
  }

  const nextEventDate = req.body.event_date || current.event_date;
  const nextStartTime = req.body.start_time || current.start_time;
  const nextDuration = req.body.duration_hours || current.duration_hours;

  const conflict = await findBookingConflict({
    eventDate: nextEventDate,
    startTime: nextStartTime,
    durationHours: nextDuration,
    excludeId: current._id,
    location: {
      venue_type: req.body.venue_type || current.venue_type,
      province: req.body.province || current.province,
      municipality: req.body.municipality || current.municipality,
      barangay: req.body.barangay || current.barangay,
      street: req.body.street || current.street,
      delivery_method: req.body.delivery_method || current.delivery_method,
      event_type: req.body.event_type || current.event_type,
    },
    bufferMinutes: req.body.buffer_minutes,
  });
  if (conflict) {
    return res.status(409).json({
      message: "Booking conflict detected for the selected date/time",
      conflict_id: conflict._id,
    });
  }

  const requestedInventory =
    req.body.inventory_items || current.inventory_items;
  const invCheck = await checkInventoryAvailability(
    nextEventDate,
    requestedInventory,
    current._id,
  );
  if (!invCheck.available) {
    return res.status(409).json({
      message: `Inventory conflict: Not enough '${invCheck.itemName}' available on this date.`,
    });
  }

  // Filter out conflicting staff members
  const requestedStaffIds = [];
  if (req.body.event_manager_id)
    requestedStaffIds.push(req.body.event_manager_id);
  else if (current.event_manager_id)
    requestedStaffIds.push(current.event_manager_id);

  if (req.body.staff_ids) requestedStaffIds.push(...req.body.staff_ids);
  else if (current.staff_ids) requestedStaffIds.push(...current.staff_ids);

  if (requestedStaffIds.length > 0) {
    const availableStaffIds = await filterAvailableStaff(
      nextEventDate,
      nextStartTime,
      nextDuration,
      req.body.buffer_minutes,
      requestedStaffIds,
      current._id,
    );

    const availableStaffSet = new Set(
      availableStaffIds.map((id) => id.toString()),
    );

    if (
      req.body.event_manager_id &&
      !availableStaffSet.has(req.body.event_manager_id.toString())
    ) {
      req.body.event_manager_id = undefined; // Drop it
    }
    if (Array.isArray(req.body.staff_ids)) {
      req.body.staff_ids = req.body.staff_ids.filter((id) =>
        availableStaffSet.has(id.toString()),
      );
    }
    if (Array.isArray(req.body.staff_assignments)) {
      req.body.staff_assignments = req.body.staff_assignments.filter(
        (a) => a.user_id && availableStaffSet.has(a.user_id.toString()),
      );
    }
  }

  const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (current.status !== "confirmed" && updated.status === "confirmed") {
    if (updated.inventory_items?.length > 0) {
      const reservations = updated.inventory_items
        .filter((item) => item.inventory_id)
        .map((item) => ({
          inventory_id: item.inventory_id,
          booking_id: updated._id,
          event_date: updated.event_date,
          quantity: item.quantity,
        }));
      if (reservations.length > 0) {
        await InventoryReservation.insertMany(reservations);
        reservations.forEach((r) =>
          writeInventoryLog({
            inventory_id: r.inventory_id,
            event_type: "reservation_allocated",
            delta: -r.quantity,
            actor_id: req.user?._id,
            booking_id: updated._id,
            reason: `Booking ${updated.reference || updated._id} confirmed`,
          }),
        );
      }
    }
  } else if (
    current.status === "confirmed" &&
    ["cancelled", "refunded"].includes(updated.status)
  ) {
    const releasedReservations = await InventoryReservation.find({ booking_id: updated._id });
    await InventoryReservation.deleteMany({ booking_id: updated._id });
    releasedReservations.forEach((r) =>
      writeInventoryLog({
        inventory_id: r.inventory_id,
        event_type: "reservation_released",
        delta: r.quantity,
        actor_id: req.user?._id,
        booking_id: updated._id,
        reason: `Booking ${updated.reference || updated._id} ${updated.status}`,
      }),
    );
  }

  // Build changes object for the log
  const trackFields = [
    "status",
    "payment_status",
    "payment_method",
    "event_type",
    "event_theme",
    "event_date",
    "start_time",
    "guest_count",
    "duration_hours",
    "total_price",
    "event_manager_id",
    "venue_type",
    "province",
    "municipality",
    "barangay",
    "street",
  ];
  const changes = {};
  for (const field of trackFields) {
    if (
      req.body[field] !== undefined &&
      String(current[field] ?? "") !== String(req.body[field] ?? "")
    ) {
      changes[field] = { from: current[field], to: req.body[field] };
    }
  }

  const changedFieldNames = Object.keys(changes);
  const detailParts =
    changedFieldNames.length > 0
      ? changedFieldNames.join(", ")
      : Object.keys(req.body).join(", ");

  if (req.user) {
    // --- Perf: fire-and-forget logging ---
    logAction({
      user_id: req.user._id,
      action: "booking_updated",
      entity_type: "booking",
      entity_id: updated._id,
      details: `Updated booking #${updated._id} — Fields: ${detailParts}`,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      ip_address: req.ip,
    }).catch(console.error);
  }

  if (updated?.customer_id && req.user?.role !== "customer") {
    const statusChanged = current.status !== updated.status;
    const paymentChanged = current.payment_status !== updated.payment_status;
    const otherChanged = Object.keys(req.body).some(
      (key) => !["status", "payment_status", "payment_method"].includes(key),
    );

    if (statusChanged || paymentChanged || otherChanged) {
      let label = "Booking Updated";
      let message = "Your booking details have been updated.";
      if (statusChanged) {
        label = "Booking Status Update";
        message = `Your booking status is now: ${updated.status}.`;
      } else if (paymentChanged) {
        label = "Payment Status Update";
        message = `Your payment status is now: ${updated.payment_status}.`;
      }

      const io = req.app.get("io");
      // --- Perf: fire-and-forget notification ---
      createNotification(
        {
          userId: updated.customer_id,
          title: label,
          body: message,
          type: "info",
          link: "/customer/bookings",
        },
        io,
      ).catch(console.error);

      // Send email on status change
      if (statusChanged) {
        const statusEmail = updated.contact_email || current.contact_email;
        if (statusEmail) {
          sendBookingStatusEmail({
            booking: updated,
            newStatus: updated.status,
            customerEmail: statusEmail,
          }).catch(() => {});
        }
      }
    }

    if (otherChanged) {
      updated.revision_count = (updated.revision_count || 0) + 1;
      updated.is_revised = true;
      if (!Array.isArray(updated.revisions)) updated.revisions = [];
      updated.revisions.push({
        revision_number: updated.revision_count,
        proposed_by: req.user?.role === "customer" ? "customer" : "admin",
        confirmed_by: "admin",
        admin_confirmed_at: new Date(),
        customer_confirmed_at: req.user?.role === "customer" ? new Date() : undefined,
        status: "confirmed",
        changes,
        message: req.body.revision_note || "Booking details updated by administrator",
        price_difference: (updated.total_price || 0) - (current.total_price || 0),
        snapshot: {
          event_date: updated.event_date,
          start_time: updated.start_time,
          guest_count: updated.guest_count,
          total_price: updated.total_price,
          venue_type: updated.venue_type,
          service_type: updated.service_type,
          status: updated.status,
        },
        created_at: new Date(),
      });
      
      if (updated.change_request?.status === "pending") {
        updated.change_request = {
          ...updated.change_request.toObject?.(),
          status: "approved",
          resolved_at: new Date(),
          reviewed_by: req.user?._id
        };
      }
      await updated.save();
    }
  }

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "booking", action: "update" });

  res.json(updated);
});

exports.addGuests = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.customer_id) !== String(req.user?._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (getThreeDayLockout(booking.event_date)) {
    return res
      .status(400)
      .json({
        message: "Booking details cannot be changed 3 days before the event.",
      });
  }

  const additionalGuests = Number(req.body.additional_guests);
  if (!additionalGuests || additionalGuests <= 0) {
    return res.status(400).json({ message: "Invalid number of guests to add" });
  }

  // Use the package's per-head price instead of hardcoded value
  let pricePerHead = 500;
  if (booking.package_id) {
    const pkg = await Package.findById(booking.package_id);
    if (pkg && pkg.package_type !== "Event Setup Only") {
      pricePerHead = Number(pkg.price_per_guest) || pricePerHead;
    }
  }
  const amountDue = additionalGuests * pricePerHead;

  booking.guest_count += additionalGuests;
  booking.total_price += amountDue;
  await booking.save();

  // Create payment checkout
  const { createCheckoutSession } = require("../services/payment.service");
  const Payment = require("../models/Payment");

  const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const successUrl = `${appBaseUrl}/customer/payments?status=success`;
  const cancelUrl = `${appBaseUrl}/customer/payments?status=cancelled`;

  const payment = await Payment.create({
    booking_id: booking._id,
    customer_id: booking.customer_id,
    amount: amountDue,
    currency: "PHP",
    payment_type: "upgrade",
    method: "paymongo",
    status: "pending",
    gateway: "paymongo",
  });

  const checkout = await createCheckoutSession({
    amount: amountDue,
    currency: "PHP",
    paymentMethodTypes: ["gcash", "paymaya", "card"],
    description: `Added ${additionalGuests} guests for Booking ${booking._id}`,
    successUrl,
    cancelUrl,
    metadata: {
      local_payment_id: String(payment._id),
      booking_id: String(booking._id),
      customer_id: String(booking.customer_id),
      payment_type: "upgrade",
      additional_guests: additionalGuests,
    },
  });

  payment.gateway_checkout_id = checkout.data.id;
  payment.checkout_url = checkout.data.attributes.checkout_url;
  await payment.save();

  await logAction({
    user_id: req.user._id,
    action: "booking_guests_added",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Customer added ${additionalGuests} guests via self-service`,
    ip_address: req.ip,
  });

  res.json({ booking, checkout_url: payment.checkout_url });
});

exports.upgradeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.customer_id) !== String(req.user?._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (getThreeDayLockout(booking.event_date)) {
    return res
      .status(400)
      .json({
        message: "Booking details cannot be changed 3 days before the event.",
      });
  }

  let amountDue = 0;
  let upgradeDescription = "";

  if (
    req.body.new_package_id &&
    String(req.body.new_package_id) !== String(booking.package_id)
  ) {
    const Package = require("../models/Package");
    const newPackage = await Package.findById(req.body.new_package_id);
    const oldPackage = await Package.findById(booking.package_id);

    if (newPackage && oldPackage && newPackage.price > oldPackage.price) {
      amountDue += newPackage.price - oldPackage.price;
      upgradeDescription += `Upgraded to ${newPackage.name}. `;
      booking.package_id = newPackage._id;
    }
  }

  if (req.body.added_services && Array.isArray(req.body.added_services)) {
    for (const service of req.body.added_services) {
      const qty = Number(service.quantity) || 1;
      const price = Number(service.price) || 0;
      if (price > 0) {
        amountDue += price * qty;
        upgradeDescription += `Added ${service.name} (x${qty}). `;
        if (!booking.service_items) booking.service_items = [];
        booking.service_items.push({
          name: service.name,
          quantity: qty,
          price: price,
        });
      }
    }
  }

  if (amountDue <= 0) {
    return res
      .status(400)
      .json({ message: "No valid upgrade selected or amount is zero" });
  }

  booking.total_price += amountDue;
  await booking.save();

  const { createCheckoutSession } = require("../services/payment.service");
  const Payment = require("../models/Payment");

  const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const successUrl = `${appBaseUrl}/customer/payments?status=success`;
  const cancelUrl = `${appBaseUrl}/customer/payments?status=cancelled`;

  const payment = await Payment.create({
    booking_id: booking._id,
    customer_id: booking.customer_id,
    amount: amountDue,
    currency: "PHP",
    payment_type: "upgrade",
    method: "paymongo",
    status: "pending",
    gateway: "paymongo",
  });

  const checkout = await createCheckoutSession({
    amount: amountDue,
    currency: "PHP",
    paymentMethodTypes: ["gcash", "paymaya", "card"],
    description:
      upgradeDescription.trim() || `Upgrade for Booking ${booking._id}`,
    successUrl,
    cancelUrl,
    metadata: {
      local_payment_id: String(payment._id),
      booking_id: String(booking._id),
      customer_id: String(booking.customer_id),
      payment_type: "upgrade",
    },
  });

  payment.gateway_checkout_id = checkout.data.id;
  payment.checkout_url = checkout.data.attributes.checkout_url;
  await payment.save();

  logAction({
    user_id: req.user._id,
    action: "booking_upgraded",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Customer self-service upgrade: ${upgradeDescription.trim()}`,
    ip_address: req.ip,
  }).catch(console.error);

  res.json({ booking, checkout_url: payment.checkout_url });
});

exports.requestChange = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.customer_id) !== String(req.user?._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (getThreeDayLockout(booking.event_date)) {
    return res
      .status(400)
      .json({
        message: "Booking details cannot be changed 3 days before the event.",
      });
  }

  const requestMessage = String(req.body.message || "").trim();
  if (!requestMessage) {
    return res
      .status(400)
      .json({ message: "Please describe the booking changes you want." });
  }

  const isUpdate = booking.change_request?.status === "pending";

  booking.change_request = {
    status: "pending",
    message: requestMessage,
    requested_at: new Date(),
    resolved_at: null,
  };
  await booking.save();  logAction({
    user_id: req.user._id,
    action: "booking_change_requested",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Requested booking change for ${booking.event_type || "event"} on ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "N/A"}`,
    changes: { change_request: { to: requestMessage } },
    ip_address: req.ip,
  }).catch(console.error);

  const io = req.app.get("io");
  notifyAdmins(
    {
      title: isUpdate
        ? "Booking change request updated"
        : "Booking change request",
      body: isUpdate
        ? `${req.user.full_name || req.user.email || "A customer"} updated the change request for booking #${booking._id}.`
        : `${req.user.full_name || req.user.email || "A customer"} requested a change for booking #${booking._id}.`,
      type: "info",
      link: `/admin/bookings/${booking._id}/details`,
      meta: {
        booking_id: booking._id,
        message: requestMessage,
      },
    },
    io
  ).catch(console.error);

  res.json(booking);
});

exports.processRefund = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const refundAmount = Number(req.body.amount);
  if (isNaN(refundAmount) || refundAmount < 0) {
    return res.status(400).json({ message: "Invalid refund amount" });
  }

  const deductionReason =
    req.body.reason || "Post-ocular cancellation deduction";

  // Cancel booking and update payment status
  booking.status = "cancelled";
  booking.payment_status = "refunded";
  await booking.save();

  // Delete any existing inventory reservations
  await InventoryReservation.deleteMany({ booking_id: booking._id });

  // Create negative payment record for refund
  const Payment = require("../models/Payment");
  await Payment.create({
    booking_id: booking._id,
    customer_id: booking.customer_id,
    amount: -refundAmount,
    currency: "PHP",
    payment_type: "refund",
    method: "manual",
    status: "approved",
    gateway: "manual",
    metadata: {
      reason: deductionReason,
    },
  });

  await logAction({
    user_id: req.user._id,
    action: "booking_refunded",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Processed custom refund of PHP ${refundAmount}. Reason: ${deductionReason}`,
    ip_address: req.ip,
  });

  const io = req.app.get("io");

  // Notify customer about the refund
  if (booking.customer_id) {
    await createNotification(
      {
        userId: booking.customer_id,
        title: "Booking Cancelled & Refunded",
        body: `Your booking has been cancelled. A refund of ₱${refundAmount.toLocaleString()} has been processed.`,
        type: "info",
        link: "/customer/bookings",
        meta: { booking_id: booking._id },
      },
      io,
    );
  }

  await notifyAdmins(
    {
      title: "Booking Cancelled & Refunded",
      body: `Admin processed a custom refund of ₱${refundAmount.toLocaleString()} for booking #${booking.reference || booking._id}.`,
      type: "info",
      link: `/admin/bookings/${booking._id}/details`,
      meta: { booking_id: booking._id },
    },
    io,
  );

  res.json({ message: "Refund processed successfully", booking });
});

exports.remove = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  const bookingLabel = booking
    ? `${booking.event_type || "booking"} on ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "N/A"}`
    : req.params.id;

  await Booking.findByIdAndDelete(req.params.id);

  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "booking_deleted",
      entity_type: "booking",
      entity_id: req.params.id,
      details: `Deleted booking — ${bookingLabel}`,
      ip_address: req.ip,
    });
  }

  // Emit realtime update so listings refresh
  try {
    const io = req.app.get("io");
    if (io) io.emit("system:refresh", { type: "booking", action: "delete", booking_id: req.params.id });
  } catch (e) {}

  res.json({ message: "Deleted" });
});

exports.checkAvailability = asyncHandler(async (req, res) => {
  if (!req.query.event_date) {
    return res.status(400).json({ message: "Event date is required" });
  }

  const parsedEventDate = new Date(req.query.event_date);
  parsedEventDate.setHours(0, 0, 0, 0);
  const blocked = await BlockedDate.findOne({ date: parsedEventDate });
  if (blocked) {
    return res.json({
      available: false,
      conflict_id: null,
      inventory_issue: null,
      blocked: true,
      reason: blocked.reason || "This date is unavailable."
    });
  }

  // Check Max Bookings Limit
  const maxLimitReached = await checkMaxBookingsLimit(req.query.event_date);
  if (maxLimitReached) {
    return res.json({
      available: false,
      conflict_id: null,
      inventory_issue: null,
      blocked: true,
      reason: "This date has reached the maximum number of bookings allowed."
    });
  }

  const conflict = await findBookingConflict({
    eventDate: req.query.event_date,
    startTime: req.query.start_time,
    durationHours: req.query.duration_hours,
    location: {
      venue_type: req.query.venue_type,
      province: req.query.province,
      municipality: req.query.municipality,
      barangay: req.query.barangay,
      street: req.query.street,
      delivery_method: req.query.delivery_method,
      service_type: req.query.service_type,
    },
    bufferMinutes: req.query.buffer_minutes,
  });

  let inventoryAvailable = true;
  let itemName = null;
  if (req.query.inventory_items) {
    try {
      const items = JSON.parse(req.query.inventory_items);
      const invCheck = await checkInventoryAvailability(
        req.query.event_date,
        items,
      );
      if (!invCheck.available) {
        inventoryAvailable = false;
        itemName = invCheck.itemName;
      }
    } catch (e) {
      // ignore parse error
    }
  }

  res.json({
    available: !conflict && inventoryAvailable,
    conflict_id: conflict?._id || null,
    inventory_issue: !inventoryAvailable ? itemName : null,
  });
});

exports.verifyReturns = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const { returns } = req.body;
  if (!Array.isArray(returns)) {
    return res.status(400).json({ message: "Returns data must be an array" });
  }

  const currentReturns = booking.equipment_returns || [];
  const Inventory = require("../models/Inventory");

  for (const returnData of returns) {
    const { inventory_id, quantity_returned } = returnData;

    let existingRecord = currentReturns.find(
      (r) => r.inventory_id && r.inventory_id.toString() === inventory_id,
    );

    if (!existingRecord) {
      const bookedItem = (booking.inventory_items || []).find(
        (i) => i.inventory_id && i.inventory_id.toString() === inventory_id,
      );
      if (bookedItem) {
        existingRecord = {
          inventory_id: bookedItem.inventory_id,
          name: bookedItem.name,
          quantity_booked: bookedItem.quantity,
          quantity_returned: 0,
        };
        currentReturns.push(existingRecord);
      }
    }

    if (existingRecord) {
      const oldReturned = existingRecord.quantity_returned || 0;
      const newReturned = Number(quantity_returned) || 0;

      let delta = 0;
      if (!existingRecord.verified_at) {
        delta = newReturned - (existingRecord.quantity_booked || 0);
      } else {
        delta = newReturned - oldReturned;
      }

      if (delta !== 0) {
        const invItem = await Inventory.findById(inventory_id);
        if (invItem) {
          invItem.quantity = Math.max(0, (invItem.quantity || 0) + delta);
          await invItem.save();
        }
      }

      existingRecord.quantity_returned = newReturned;
      existingRecord.verified_at = new Date();
      existingRecord.verified_by = req.user._id;
    }
  }

  booking.equipment_returns = currentReturns;
  await booking.save();

  await logAction({
    user_id: req.user._id,
    action: "booking_returns_verified",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Verified equipment returns for booking #${booking._id}`,
    ip_address: req.ip,
  });

  res.json(booking);
});

exports.suggestDates = asyncHandler(async (req, res) => {
  const {
    event_date,
    start_time,
    duration_hours,
    venue_type,
    province,
    municipality,
    barangay,
    street,
    delivery_method,
    service_type,
  } = req.query;
  if (!event_date)
    return res.status(400).json({ message: "event_date is required" });

  const range = Number(req.query.range) || 14;
  const baseDate = new Date(event_date);
  if (Number.isNaN(baseDate.getTime()))
    return res.status(400).json({ message: "Invalid date" });

  const location = { venue_type, province, municipality, barangay, street, delivery_method, service_type };

  // --- Perf: batch-fetch all data for the entire range in 2 queries instead of N ---
  const rangeStart = new Date(baseDate);
  rangeStart.setDate(rangeStart.getDate() - range);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(baseDate);
  rangeEnd.setDate(rangeEnd.getDate() + range);
  rangeEnd.setHours(23, 59, 59, 999);

  const [blockedDates, rangeBookings] = await Promise.all([
    BlockedDate.find({ date: { $gte: rangeStart, $lte: rangeEnd } }).lean(),
    Booking.find({
      status: { $in: ["pending deposit", "confirmed", "preparing", "ongoing"] },
      event_date: { $gte: rangeStart, $lte: rangeEnd },
    }).lean(),
  ]);
  const blockedTimestamps = new Set(blockedDates.map(b => new Date(b.date).setHours(0,0,0,0)));

  const newRange = getTimeRange(start_time, duration_hours);

  const suggestions = [];

  for (let offset = 1; offset <= range && suggestions.length < 5; offset++) {
    for (const direction of [1, -1]) {
      if (suggestions.length >= 5) break;
      const candidate = new Date(baseDate);
      candidate.setDate(candidate.getDate() + offset * direction);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (candidate < today) continue;

      // Skip blocked dates
      if (blockedTimestamps.has(new Date(candidate).setHours(0,0,0,0))) {
        continue;
      }

      // --- In-memory conflict check against pre-fetched bookings ---
      const candStart = new Date(candidate);
      candStart.setHours(0, 0, 0, 0);
      const candEnd = new Date(candidate);
      candEnd.setHours(23, 59, 59, 999);

      const dayBookings = rangeBookings.filter(b => {
        const bd = new Date(b.event_date);
        return bd >= candStart && bd <= candEnd;
      });

      let conflict = null;
      if (dayBookings.length > 0) {
        if (!newRange) {
          conflict = dayBookings.find(booking => sameLocation(location, booking)) || null;
        } else {
          conflict = dayBookings.find(booking => {
            if (location?.municipality && !sameLocation(location, booking)) return false;
            const existingRange = getTimeRange(booking.start_time, booking.duration_hours);
            if (!existingRange) return true;
            return newRange.startMinutes < existingRange.endMinutes && newRange.endMinutes > existingRange.startMinutes;
          }) || null;
        }
      }

      if (!conflict) {
        suggestions.push(candidate.toISOString().split("T")[0]);
      }
    }
  }

  res.json({ suggestions });
});

exports.scheduleOcular = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const { scheduled_date, scheduled_time, notes } = req.body;
  if (!scheduled_date)
    return res.status(400).json({ message: "Scheduled date is required" });

  booking.ocular_visit = {
    ...(booking.ocular_visit?.toObject?.() || booking.ocular_visit || {}),
    scheduled_date: new Date(scheduled_date),
    scheduled_time: scheduled_time || "",
    status: "scheduled",
    notes: notes || booking.ocular_visit?.notes || "",
  };
  await booking.save();

  const io = req.app.get("io");
  if (booking.customer_id) {
    await createNotification(
      {
        userId: booking.customer_id,
        title: "Ocular Visit Scheduled",
        body: `Your ocular visit has been scheduled for ${new Date(scheduled_date).toLocaleDateString()}${scheduled_time ? ` at ${scheduled_time}` : ""}.`,
        type: "info",
        link: "/customer/bookings",
        meta: { booking_id: booking._id },
      },
      io,
    );
  }

  await logAction({
    user_id: req.user._id,
    action: "ocular_scheduled",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Scheduled ocular visit for ${new Date(scheduled_date).toLocaleDateString()}`,
    ip_address: req.ip,
  });

  res.json(booking);
});

exports.completeOcular = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const { outcome, notes } = req.body;
  if (!outcome || !["proceed", "cancel", "reschedule", "revise"].includes(outcome)) {
    return res
      .status(400)
      .json({
        message: "Outcome must be 'proceed', 'cancel', 'reschedule', or 'revise'",
      });
  }

  booking.ocular_visit = {
    ...(booking.ocular_visit?.toObject?.() || booking.ocular_visit || {}),
    status: "completed",
    outcome,
    notes: notes || booking.ocular_visit?.notes || "",
    completed_at: new Date(),
  };

  if (outcome === "cancel") {
    booking.status = "cancelled";
    booking.payment_status = "refund_requested";
  }

  await booking.save();

  const io = req.app.get("io");
  if (booking.customer_id) {
    let title = "Ocular Visit Complete";
    let body = "Your ocular visit has been completed.";
    if (outcome === "cancel") {
      title = "Booking Cancellation — Ocular Result";
      body =
        "After the ocular visit, this booking will be cancelled. An admin will process your refund.";
    } else if (outcome === "proceed") {
      body =
        "Your ocular visit was successful. Your event is confirmed to proceed!";
    } else if (outcome === "reschedule") {
      title = "Ocular Visit — Reschedule Needed";
      body =
        "Based on the ocular visit, a reschedule is recommended. We will contact you shortly.";
    } else if (outcome === "revise") {
      title = "Ocular Visit — Booking Revision Requested";
      body =
        "Based on the site inspection measurements and layout review, a booking revision has been requested. Please review the updated setup details under your booking.";
    }
    await createNotification(
      {
        userId: booking.customer_id,
        title,
        body,
        type: outcome === "cancel" ? "warning" : "info",
        link: "/customer/bookings",
        meta: { booking_id: booking._id },
      },
      io,
    );
  }

  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "ocular_completed",
      entity_type: "booking",
      entity_id: booking._id,
      details: `Ocular visit completed with outcome: ${outcome}`,
      ip_address: req.ip,
    });
  }

  res.json(booking);
});

exports.requestOcular = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.customer_id) !== String(req.user?._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { scheduled_date, scheduled_time, notes } = req.body;
  if (!scheduled_date)
    return res.status(400).json({ message: "Scheduled date is required" });

  booking.ocular_visit = {
    ...(booking.ocular_visit?.toObject?.() || booking.ocular_visit || {}),
    scheduled_date: new Date(scheduled_date),
    scheduled_time: scheduled_time || "",
    status: "requested",
    notes: notes || booking.ocular_visit?.notes || "",
  };
  await booking.save();

  const io = req.app.get("io");
  await notifyAdmins(
    {
      title: "Ocular Visit Requested",
      body: `${req.user.full_name || req.user.email || "A customer"} requested an ocular visit for booking #${booking.reference || booking._id}.`,
      type: "info",
      link: `/admin/bookings/${booking._id}/details`,
      meta: { booking_id: booking._id },
    },
    io,
  );

  await logAction({
    user_id: req.user._id,
    action: "ocular_requested",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Requested ocular visit for ${new Date(scheduled_date).toLocaleDateString()}`,
    ip_address: req.ip,
  });

  res.json(booking);
});

exports.requestCancellation = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.customer_id) !== String(req.user?._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  booking.change_request = {
    status: "pending",
    message: "Customer requested a cancellation and refund.",
    requested_at: new Date(),
    resolved_at: null,
  };
  await booking.save();

  const io = req.app.get("io");
  await notifyAdmins(
    {
      title: "Booking Cancellation Requested",
      body: `${req.user.full_name || req.user.email || "A customer"} requested to cancel booking #${booking.reference || booking._id}.`,
      type: "warning",
      link: `/admin/bookings/${booking._id}/details`,
      meta: { booking_id: booking._id },
    },
    io,
  );

  await logAction({
    user_id: req.user._id,
    action: "booking_cancellation_requested",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Customer requested a cancellation/refund.`,
    ip_address: req.ip,
  });

  res.json(booking);
});

exports.checkInventoryAvailability = checkInventoryAvailability;
exports.findBookingConflict = findBookingConflict;
exports.filterAvailableStaff = filterAvailableStaff;
exports.getBookedDates = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required" });
  }

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const formatDateKey = (d) => {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  // 1. Get dates from BlockedDate model
  const blockedDates = await BlockedDate.find({
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });
  const blockedDatesSet = new Set(
    blockedDates.map(b => formatDateKey(b.date)).filter(Boolean)
  );

  // 2. Get bookings to check against max limit
  const businessInfo = await getCachedBusinessInfo();
  const limit = businessInfo?.max_bookings_per_day || 2;

  const bookings = await Booking.find({
    status: { $in: ["pending deposit", "confirmed", "preparing", "ongoing"] },
    event_date: { $gte: startOfMonth, $lte: endOfMonth }
  });

  const dateCounts = {};
  bookings.forEach(booking => {
    if (booking.event_date) {
      const d = formatDateKey(booking.event_date);
      if (d) dateCounts[d] = (dateCounts[d] || 0) + 1;
    }
  });

  const fullyBookedDates = Object.keys(dateCounts).filter(dateStr => dateCounts[dateStr] >= limit);

  // Merge blocked dates and fully booked dates
  const result = Array.from(new Set([...blockedDatesSet, ...fullyBookedDates]));

  res.json(result);
});

// --- Perf: 1 query instead of 11 (one per time slot) ---
exports.getAvailableTimes = asyncHandler(async (req, res) => {
  const { event_date, duration_hours, venue_type, province, municipality, barangay, street, delivery_method, service_type } = req.query;

  if (!event_date) {
    return res.status(400).json({ message: "Event date is required" });
  }

  // 0. Check BlockedDate model
  const parsedEventDate = new Date(event_date);
  parsedEventDate.setHours(0, 0, 0, 0);
  const blocked = await BlockedDate.findOne({ date: parsedEventDate });

  // 1. Check max bookings limit for the day first.
  const maxLimitReached = await checkMaxBookingsLimit(event_date);
  
  // Define the standard time slots
  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
  ];

  if (blocked || maxLimitReached) {
    return res.json(timeSlots.map((time) => ({ time, status: "full" })));
  }

  // Fetch all day's bookings ONCE instead of per-slot
  const dayStart = new Date(event_date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(event_date);
  dayEnd.setHours(23, 59, 59, 999);
  const buffer = Number(req.query.buffer_minutes) || 0;

  const existingBookings = await Booking.find({
    status: { $in: ["pending deposit", "confirmed", "preparing", "ongoing"] },
    event_date: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  const results = timeSlots.map(time => {
    const newRange = getTimeRange(time, duration_hours || 4);
    if (!newRange) {
      // Can't parse time — check if any booking exists at all (same as ignoreLocation=true path)
      const conflict = existingBookings.length > 0 ? existingBookings[0] : null;
      return { time, status: conflict ? "full" : "available" };
    }

    // In-memory conflict check (ignoreLocation=true means skip location check)
    const conflict = existingBookings.find(booking => {
      const existingRange = getTimeRange(booking.start_time, booking.duration_hours);
      if (!existingRange) return true; // Can't parse existing → treat as conflict
      const existingStart = existingRange.startMinutes - buffer;
      const existingEnd = existingRange.endMinutes + buffer;
      return newRange.startMinutes < existingEnd && newRange.endMinutes > existingStart;
    });

    return { time, status: conflict ? "full" : "available" };
  });

  res.json(results);
});

exports.scheduleOcular = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (!booking.ocular_visit) booking.ocular_visit = {};
  booking.ocular_visit.scheduled_date = req.body.scheduled_date;
  booking.ocular_visit.scheduled_time = req.body.scheduled_time;
  booking.ocular_visit.status = "scheduled";

  await booking.save();
  
  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "ocular_scheduled",
      entity_type: "booking",
      entity_id: booking._id,
      details: `Ocular visit scheduled for ${new Date(req.body.scheduled_date).toLocaleDateString()} at ${req.body.scheduled_time}`,
      ip_address: req.ip,
    });
  }

  res.json(booking);
});



exports.requestOcular = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, customer_id: req.user._id });
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (!booking.ocular_visit) booking.ocular_visit = {};
  booking.ocular_visit.scheduled_date = req.body.scheduled_date;
  booking.ocular_visit.scheduled_time = req.body.scheduled_time;
  booking.ocular_visit.status = "requested";
  
  await booking.save();
  
  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "ocular_requested",
      entity_type: "booking",
      entity_id: booking._id,
      details: `Customer requested ocular visit for ${new Date(req.body.scheduled_date).toLocaleDateString()} at ${req.body.scheduled_time}`,
      ip_address: req.ip,
    });
  }
  
  const io = req.app.get("io");
  await notifyAdmins({
    title: "New Ocular Request",
    body: `Customer requested an ocular visit for booking ${booking.reference || booking._id}.`,
    type: "info",
    link: `/admin/ocular-visits`,
    meta: { booking_id: booking._id }
  }, io);

  res.json(booking);
});

exports.requestChange = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, customer_id: req.user._id });
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  booking.change_request = {
    status: "pending",
    message: req.body.message,
    requested_at: new Date()
  };

  await booking.save();
  
  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "change_request_submitted",
      entity_type: "booking",
      entity_id: booking._id,
      details: `Customer requested a change: ${req.body.message}`,
      ip_address: req.ip,
    });
  }

  const io = req.app.get("io");
  const { notifyAdmins } = require("../utils/notify");
  await notifyAdmins({
    title: "New Change Request",
    body: `Customer requested a change for booking ${booking.reference || booking._id}.`,
    type: "warning",
    link: `/admin/bookings/${booking._id}/details`,
    meta: { booking_id: booking._id }
  }, io);

  res.json(booking);
});

exports.resolveChangeRequest = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (!booking.change_request || booking.change_request.status !== "pending") {
    return res.status(400).json({ message: "No pending change request found." });
  }

  booking.change_request.status = req.body.status; // 'approved' or 'rejected'
  booking.change_request.resolved_at = new Date();

  await booking.save();
  
  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "change_request_resolved",
      entity_type: "booking",
      entity_id: booking._id,
      details: `Admin ${req.body.status} change request.`,
      ip_address: req.ip,
    });
  }

  res.json(booking);
});

exports.proposeRevision = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const proposedBy = req.user.role === "customer" ? "customer" : "admin";
  const targetStatus = proposedBy === "admin" ? "pending_customer_approval" : "pending_admin_approval";

  const { proposed_changes, message, total_price, event_date, start_time, guest_count, venue_type, service_type, menu_items, service_items, additional_charges, special_requests } = req.body;

  if (proposedBy === "admin") {
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "A revision note / reason for the proposal is required." });
    }
    if (guest_count !== undefined && (guest_count === "" || Number(guest_count) <= 0)) {
      return res.status(400).json({ message: "Guest count must be a valid number greater than 0." });
    }
    if (total_price !== undefined && (total_price === "" || Number(total_price) < 0)) {
      return res.status(400).json({ message: "Total price cannot be negative." });
    }
    if (event_date !== undefined && !event_date) {
      return res.status(400).json({ message: "Target event date is required." });
    }
  }

  const currentPrice = Number(booking.total_price) || 0;
  const newPrice = total_price !== undefined ? Number(total_price) : currentPrice;
  const priceDifference = newPrice - currentPrice;

  // Build changes dictionary
  const changes = proposed_changes || {};
  if (!proposed_changes) {
    if (event_date && new Date(event_date).toISOString() !== new Date(booking.event_date).toISOString()) {
      changes.event_date = { from: booking.event_date, to: event_date };
    }
    if (guest_count !== undefined && Number(guest_count) !== Number(booking.guest_count)) {
      changes.guest_count = { from: booking.guest_count, to: guest_count };
    }
    if (start_time && start_time !== booking.start_time) {
      changes.start_time = { from: booking.start_time, to: start_time };
    }
    if (total_price !== undefined && Number(total_price) !== Number(booking.total_price)) {
      changes.total_price = { from: booking.total_price, to: total_price };
    }
    if (venue_type && venue_type !== booking.venue_type) {
      changes.venue_type = { from: booking.venue_type, to: venue_type };
    }
  }

  booking.pending_revision = {
    status: targetStatus,
    proposed_by: proposedBy,
    proposed_by_user_id: req.user._id,
    proposed_changes: changes,
    proposed_snapshot: {
      event_date: event_date || booking.event_date,
      start_time: start_time || booking.start_time,
      guest_count: guest_count !== undefined ? Number(guest_count) : booking.guest_count,
      total_price: newPrice,
      venue_type: venue_type || booking.venue_type,
      service_type: service_type || booking.service_type,
      menu_items: menu_items || booking.menu_items,
      service_items: service_items || booking.service_items,
      additional_charges: additional_charges || booking.additional_charges,
      special_requests: special_requests !== undefined ? special_requests : booking.special_requests,
    },
    message: message || (proposedBy === "admin" ? "Admin proposed booking revisions" : "Customer requested booking revisions"),
    price_difference: priceDifference,
    requested_at: new Date(),
  };

  await booking.save();

  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "booking_revision_proposed",
      entity_type: "booking",
      entity_id: booking._id,
      details: `Proposed revision for booking ${booking.reference || booking._id} by ${proposedBy}`,
      changes,
      ip_address: req.ip,
    });
  }

  const io = req.app.get("io");
  if (proposedBy === "admin" && booking.customer_id) {
    await createNotification(
      {
        userId: booking.customer_id,
        title: "Revised Booking Proposal",
        body: `Catering management sent a revised proposal for your booking (${booking.reference || booking._id}). Please review and confirm.`,
        type: "warning",
        link: `/customer/events/${booking._id}`,
        meta: { booking_id: booking._id },
      },
      io,
    );
  } else if (proposedBy === "customer") {
    await notifyAdmins(
      {
        title: "Customer Proposed Booking Revision",
        body: `Customer submitted a revised proposal for booking ${booking.reference || booking._id}.`,
        type: "warning",
        link: `/admin/bookings/${booking._id}/details`,
        meta: { booking_id: booking._id },
      },
      io,
    );
  }

  res.json(booking);
});

exports.acceptRevision = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (!booking.pending_revision || !["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status)) {
    return res.status(400).json({ message: "No pending revision proposal to confirm." });
  }

  const snapshot = booking.pending_revision.proposed_snapshot || {};
  
  // Apply snapshot to live booking
  if (snapshot.event_date) booking.event_date = snapshot.event_date;
  if (snapshot.start_time) booking.start_time = snapshot.start_time;
  if (snapshot.guest_count !== undefined) booking.guest_count = snapshot.guest_count;
  if (snapshot.total_price !== undefined) booking.total_price = snapshot.total_price;
  if (snapshot.venue_type) booking.venue_type = snapshot.venue_type;
  if (snapshot.service_type) booking.service_type = snapshot.service_type;
  if (snapshot.menu_items) booking.menu_items = snapshot.menu_items;
  if (snapshot.service_items) booking.service_items = snapshot.service_items;
  if (snapshot.additional_charges) booking.additional_charges = snapshot.additional_charges;
  if (snapshot.special_requests !== undefined) booking.special_requests = snapshot.special_requests;

  booking.revision_count = (booking.revision_count || 0) + 1;
  booking.is_revised = true;

  const actorRole = req.user.role === "customer" ? "customer" : "admin";

  const confirmedRevision = {
    revision_number: booking.revision_count,
    proposed_by: booking.pending_revision.proposed_by,
    confirmed_by: actorRole,
    admin_confirmed_at: actorRole === "admin" ? new Date() : booking.pending_revision.requested_at,
    customer_confirmed_at: actorRole === "customer" ? new Date() : booking.pending_revision.requested_at,
    status: "confirmed",
    changes: booking.pending_revision.proposed_changes,
    message: booking.pending_revision.message,
    price_difference: booking.pending_revision.price_difference,
    snapshot: snapshot,
    created_at: new Date(),
  };

  if (!Array.isArray(booking.revisions)) booking.revisions = [];
  booking.revisions.push(confirmedRevision);

  booking.pending_revision.status = "approved";
  booking.pending_revision.resolved_at = new Date();

  if (booking.change_request?.status === "pending") {
    booking.change_request.status = "approved";
    booking.change_request.resolved_at = new Date();
  }

  await booking.save();

  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "booking_revision_accepted",
      entity_type: "booking",
      entity_id: booking._id,
      details: `Revision v${booking.revision_count} confirmed by ${actorRole}`,
      changes: booking.pending_revision.proposed_changes,
      ip_address: req.ip,
    });
  }

  const io = req.app.get("io");
  if (actorRole === "customer") {
    await notifyAdmins(
      {
        title: "Revised Booking Confirmed by Customer",
        body: `Customer confirmed revision v${booking.revision_count} for booking ${booking.reference || booking._id}.`,
        type: "info",
        link: `/admin/bookings/${booking._id}/details`,
        meta: { booking_id: booking._id },
      },
      io,
    );
  } else if (booking.customer_id) {
    await createNotification(
      {
        userId: booking.customer_id,
        title: "Revised Booking Confirmed",
        body: `Your booking revision v${booking.revision_count} has been confirmed and updated!`,
        type: "info",
        link: `/customer/events/${booking._id}`,
        meta: { booking_id: booking._id },
      },
      io,
    );
  }

  res.json(booking);
});

exports.rejectRevision = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (!booking.pending_revision || !["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status)) {
    return res.status(400).json({ message: "No pending revision proposal to decline." });
  }

  const actorRole = req.user.role === "customer" ? "customer" : "admin";
  const reason = req.body.reason || "Proposal declined by recipient";

  booking.pending_revision.status = "rejected";
  booking.pending_revision.resolved_at = new Date();
  booking.pending_revision.rejection_reason = reason;

  const rejectedRevision = {
    revision_number: (booking.revision_count || 0) + 1,
    proposed_by: booking.pending_revision.proposed_by,
    confirmed_by: actorRole,
    status: "rejected",
    changes: booking.pending_revision.proposed_changes,
    message: `Rejected: ${reason}`,
    price_difference: booking.pending_revision.price_difference,
    snapshot: booking.pending_revision.proposed_snapshot,
    created_at: new Date(),
  };

  if (!Array.isArray(booking.revisions)) booking.revisions = [];
  booking.revisions.push(rejectedRevision);

  if (booking.change_request?.status === "pending" && actorRole === "admin") {
    booking.change_request.status = "rejected";
    booking.change_request.resolved_at = new Date();
  }

  await booking.save();

  if (req.user) {
    await logAction({
      user_id: req.user._id,
      action: "booking_revision_rejected",
      entity_type: "booking",
      entity_id: booking._id,
      details: `Revision proposal declined by ${actorRole}: ${reason}`,
      ip_address: req.ip,
    });
  }

  const io = req.app.get("io");
  if (actorRole === "customer") {
    await notifyAdmins(
      {
        title: "Revision Proposal Declined by Customer",
        body: `Customer declined revision proposal for booking ${booking.reference || booking._id}: ${reason}`,
        type: "info",
        link: `/admin/bookings/${booking._id}/details`,
        meta: { booking_id: booking._id },
      },
      io,
    );
  } else if (booking.customer_id) {
    await createNotification(
      {
        userId: booking.customer_id,
        title: "Revision Proposal Update",
        body: `Your booking revision proposal was declined: ${reason}`,
        type: "info",
        link: `/customer/events/${booking._id}`,
        meta: { booking_id: booking._id },
      },
      io,
    );
  }

  res.json(booking);
});

exports.sendQuote = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (booking.status !== "inquiry") {
    return res.status(400).json({ message: "Only inquiries can receive quotes." });
  }

  if (req.body.total_price) {
    booking.total_price = req.body.total_price;
  }
  
  if (req.body.note) {
    booking.event_manager_notes.push({
      note: req.body.note,
      created_at: new Date()
    });
  }

  booking.status = "quote_sent";
  await booking.save();

  // Notify customer
  const io = req.app.get("io");
  if (io && booking.customer_id) {
    await createNotification({
      userId: booking.customer_id,
      title: "Quote Received",
      body: `You have received a quote for your event on ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : 'N/A'}.`,
      type: "info",
      link: `/customer/bookings/${booking._id}`,
      meta: { booking_id: booking._id }
    }, io);
  }

  // Emit realtime refresh for booking/inquiry lists
  if (io) io.emit("system:refresh", { type: "booking", action: "quote_sent", booking_id: booking._id });

  res.json({ message: "Quote sent successfully", booking });
});

exports.acceptQuote = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (booking.status !== "quote_sent") {
    return res.status(400).json({ message: "Only sent quotes can be accepted." });
  }

  // Double check inventory and conflicts before accepting
  const { checkMaxBookingsLimit, findBookingConflict, checkInventoryAvailability } = module.exports;
  
  const maxLimitReached = await checkMaxBookingsLimit(booking.event_date, booking._id);
  if (maxLimitReached) {
    return res.status(409).json({ message: "This date has reached the maximum number of bookings allowed." });
  }

  const conflict = await findBookingConflict({
    eventDate: booking.event_date,
    startTime: booking.start_time,
    durationHours: booking.duration_hours,
    location: booking,
    bufferMinutes: 60, // Default buffer
    excludeId: booking._id
  });
  if (conflict) {
    return res.status(409).json({ message: "Booking conflict detected for this date/time. Please contact admin." });
  }

  const invCheck = await checkInventoryAvailability(
    booking.event_date,
    booking.inventory_items
  );
  if (!invCheck.available) {
    return res.status(409).json({ message: `Inventory conflict: Not enough '${invCheck.itemName}' available.` });
  }

  booking.status = "customer_accepted";
  
  // Set payment method if provided
  if (req.body.payment_method) {
    booking.payment_method = req.body.payment_method;
  }

  // Create payment checkout
  let checkout_url = null;
  if (booking.payment_method) {
    try {
      const Payment = require("../models/Payment");
      const { createCheckoutSession } = require("../services/payment.service");
      const BusinessInfo = require("../models/BusinessInfo");

      const businessInfo = await BusinessInfo.findOne();
      const depositPercentage = businessInfo?.deposit_percentage ?? 20;
      const depositAmount = (booking.total_price * depositPercentage) / 100;

      if (depositAmount > 0) {
        const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const cancelUrl = `${appBaseUrl}/customer/bookings/${booking._id}?payment=cancelled`;

        const payment = await Payment.create({
          booking_id: booking._id,
          customer_id: booking.customer_id,
          amount: depositAmount,
          currency: "PHP",
          payment_type: "deposit",
          method: booking.payment_method,
          status: "pending",
          gateway: "paymongo",
        });
        
        const successUrl = `${appBaseUrl}/customer/booking-success?booking_id=${booking._id}&payment_id=${payment._id}`;

        let pmTypes = [booking.payment_method];
        if (booking.payment_method === "online_banking") {
          pmTypes = ["dob", "dob_ubp"];
        }

        const checkout = await createCheckoutSession({
          amount: depositAmount,
          currency: "PHP",
          paymentMethodTypes: pmTypes,
          description: `Deposit for Booking ${booking.reference || booking._id}`,
          successUrl,
          cancelUrl,
          metadata: {
            local_payment_id: String(payment._id),
            booking_id: String(booking._id),
            customer_id: String(booking.customer_id),
            payment_type: "deposit",
          },
        });

        payment.gateway_checkout_id = checkout.data.id;
        payment.checkout_url = checkout.data.attributes.checkout_url;
        await payment.save();
        
        checkout_url = payment.checkout_url;
      }
    } catch (err) {
      console.error("PayMongo Checkout Error during acceptQuote:", err);
      return res.status(500).json({ message: "Failed to generate payment link. Please try again." });
    }
  }

  await booking.save();
  
  // Create system log
  const { logAction } = require("../services/audit.service");
  await logAction({
    user_id: req.user._id,
    action: "quote_accepted",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Customer accepted quote for booking ${booking.reference}`,
    ip_address: req.ip,
  });

  res.json({ message: "Quote accepted", booking, checkout_url });
  // Emit realtime refresh so admin/customer views update
  try {
    const io = req.app.get("io");
    if (io) io.emit("system:refresh", { type: "booking", action: "accept_quote", booking_id: booking._id });
  } catch (e) {}
});

exports.convertInquiry = asyncHandler(async (req, res) => {
  const inquiryId = req.params.id;
  const inquiry = await Inquiry.findById(inquiryId).populate("package_id customer_id");
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  // If already converted, return existing booking
  if (inquiry.converted_booking_id) {
    const existingBooking = await Booking.findById(inquiry.converted_booking_id);
    if (existingBooking) {
      return res.status(200).json({
        message: "Inquiry already converted to booking",
        booking: existingBooking,
      });
    }
  }

  // Find latest quotation if available (prefer Accepted, fallback to latest)
  let quotation = await Quotation.findOne({ inquiry_id: inquiryId, status: "Accepted" });
  if (!quotation) {
    quotation = await Quotation.findOne({ inquiry_id: inquiryId }).sort({ version_number: -1, createdAt: -1 });
  }

  // Derive service_type
  const serviceType = inquiry.service_type || (
    inquiry.delivery_method === "setup" ? "Food and Event Setup" :
    inquiry.event_type?.toLowerCase().includes("food delivery") ? "Food Only" : "Food and Event Setup"
  );

  // Build menu items array
  let menuItems = [];
  if (quotation && quotation.menu_items && quotation.menu_items.length > 0) {
    menuItems = quotation.menu_items;
  } else if (inquiry.selected_menu && inquiry.selected_menu.length > 0) {
    menuItems = inquiry.selected_menu.map(m => (typeof m === 'object' ? { name: m.name || String(m), price: m.price || 0 } : { name: String(m), price: 0 }));
  }

  // Build service items / add-ons array
  let serviceItems = [];
  if (quotation && quotation.add_ons && quotation.add_ons.length > 0) {
    serviceItems = quotation.add_ons;
  } else if (inquiry.service_items && inquiry.service_items.length > 0) {
    serviceItems = inquiry.service_items;
  }

  // Additional charges from quotation fees
  const additionalCharges = [];
  if (quotation?.transportation_fee > 0) additionalCharges.push({ name: "Transportation Fee", amount: quotation.transportation_fee });
  if (quotation?.equipment_fee > 0) additionalCharges.push({ name: "Equipment Rental Fee", amount: quotation.equipment_fee });
  if (quotation?.decoration_fee > 0) additionalCharges.push({ name: "Styling & Decoration Fee", amount: quotation.decoration_fee });

  // Build inventory items for reservation from Package setup_equipment and inventory add-ons
  let inventoryItems = [];
  const pkgId = quotation?.package_id || inquiry.package_id?._id || inquiry.package_id;
  if (pkgId) {
    const Package = require("../models/Package");
    const pkg = await Package.findById(pkgId);
    if (pkg && pkg.setup_equipment && pkg.setup_equipment.length > 0) {
      inventoryItems = pkg.setup_equipment
        .filter((eq) => eq.inventory_id)
        .map((eq) => ({
          inventory_id: eq.inventory_id._id || eq.inventory_id,
          name: eq.name || eq.item_name || "Equipment Item",
          quantity: Number(eq.quantity || 1),
        }));
    }

    if (pkg && Array.isArray(pkg.add_ons) && Array.isArray(serviceItems)) {
      serviceItems.forEach((sel) => {
        const selName = typeof sel === "string" ? sel : sel.name;
        const matchedAddOn = pkg.add_ons.find(
          (a) => a.name?.toLowerCase() === selName?.toLowerCase(),
        );
        if (matchedAddOn && matchedAddOn.inventory_id) {
          const qty = Number(typeof sel === "object" && sel.quantity ? sel.quantity : 1);
          inventoryItems.push({
            inventory_id: matchedAddOn.inventory_id._id || matchedAddOn.inventory_id,
            name: matchedAddOn.name,
            quantity: qty,
          });
        }
      });
    }
  }

  const totalPrice = quotation?.total_cost || inquiry.total_price || 0;

  const payload = {
    customer_id: inquiry.customer_id?._id || inquiry.customer_id,
    package_id: pkgId,
    event_type: inquiry.event_type || "Event",
    event_date: inquiry.event_date,
    start_time: inquiry.start_time || "12:00",
    guest_count: quotation?.guest_count || inquiry.guest_count || 1,
    include_food: true,
    venue_type: inquiry.venue_type || "Venue",
    service_type: serviceType,
    delivery_method: inquiry.delivery_method || "setup",
    province: inquiry.province || "N/A",
    municipality: inquiry.municipality || "N/A",
    barangay: inquiry.barangay || "N/A",
    street: inquiry.street || "",
    landmark: inquiry.landmark || "",
    zip_code: inquiry.zip_code || "",
    
    menu_items: menuItems,
    service_items: serviceItems,
    additional_charges: additionalCharges,
    inventory_items: inventoryItems,
    
    dietary_restrictions: inquiry.dietary_requirements || "",
    special_requests: inquiry.special_requests || "",
    
    contact_first_name: inquiry.contact_first_name || inquiry.customer_id?.first_name || "N/A",
    contact_last_name: inquiry.contact_last_name || inquiry.customer_id?.last_name || "N/A",
    contact_email: inquiry.contact_email || inquiry.customer_id?.email || "N/A",
    contact_phone: inquiry.contact_phone || inquiry.customer_id?.phone || "N/A",
    contact_alt_phone: inquiry.contact_alt_phone || "",
    contact_method: inquiry.contact_method || "Email",
    
    total_price: totalPrice,
    payment_status: "pending",
    status: "pending deposit",
  };

  const newBooking = await Booking.create(payload);

  inquiry.status = "Converted to Booking";
  inquiry.converted_booking_id = newBooking._id;
  await inquiry.save();

  if (quotation) {
    quotation.status = "Converted to Booking";
    await quotation.save();
  }

  const Payment = require("../models/Payment");
  await Payment.updateMany({ inquiry_id: inquiryId }, { booking_id: newBooking._id });

  const existingPayment = await Payment.findOne({ booking_id: newBooking._id });
  let depositAmount = quotation?.deposit_amount;
  if (!depositAmount || depositAmount <= 0) {
    const BusinessInfo = require("../models/BusinessInfo");
    let businessInfo;
    try { businessInfo = await BusinessInfo.findOne(); } catch(e) {}
    const depositPercentage = businessInfo?.deposit_percentage ?? 20;
    depositAmount = (newBooking.total_price * depositPercentage) / 100;
  }
  
  if (!existingPayment && depositAmount > 0) {
    await Payment.create({
      booking_id: newBooking._id,
      customer_id: newBooking.customer_id,
      amount: depositAmount,
      currency: "PHP",
      payment_type: "deposit",
      status: "pending",
      gateway: "paymongo"
    });
  }

  const { syncBookingStatus } = require("./payment.controller");
  if (syncBookingStatus) {
    await syncBookingStatus(newBooking._id);
  }

  if (inventoryItems.length > 0) {
    const InventoryReservation = require("../models/InventoryReservation");
    const reservations = inventoryItems
      .filter(item => item.inventory_id)
      .map(item => ({
        booking_id: newBooking._id,
        inventory_id: item.inventory_id,
        quantity_reserved: item.quantity,
        event_date: newBooking.event_date,
        status: "reserved"
      }));
    if (reservations.length > 0) {
      await InventoryReservation.insertMany(reservations);
    }
  }

  // Notify realtime clients about the conversion
  try {
    const io = req.app.get("io");
    if (io) {
      io.emit("system:refresh", { type: "booking", action: "converted", booking_id: newBooking._id });
      io.emit("system:refresh", { type: "inquiry", action: "converted", inquiry_id: inquiryId });
      if (quotation) io.emit("system:refresh", { type: "quotation", action: "converted", quotation_id: quotation._id });
    }
  } catch (e) {}

  res.status(201).json({ message: "Inquiry converted to booking successfully", booking: newBooking });
});

exports.assignInventory = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const { inventory_items } = req.body;
  if (!Array.isArray(inventory_items)) {
    return res.status(400).json({ message: "inventory_items must be an array" });
  }

  // Check inventory availability for the booking event date, excluding current booking
  const invCheck = await checkInventoryAvailability(
    booking.event_date,
    inventory_items,
    booking._id
  );

  if (!invCheck.available) {
    return res.status(409).json({
      message: `Inventory conflict: Not enough '${invCheck.itemName}' available on ${new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
    });
  }

  // Clean & sanitize items array
  const sanitizedItems = inventory_items
    .filter(item => item.inventory_id && Number(item.quantity) > 0)
    .map(item => ({
      inventory_id: item.inventory_id,
      name: item.name || item.item_name || "Equipment Item",
      quantity: Number(item.quantity)
    }));

  booking.inventory_items = sanitizedItems;

  // Sync equipment_returns array
  const existingReturnsMap = new Map();
  (booking.equipment_returns || []).forEach(ret => {
    if (ret.inventory_id) {
      existingReturnsMap.set(ret.inventory_id.toString(), ret);
    }
  });

  booking.equipment_returns = sanitizedItems.map(item => {
    const existing = existingReturnsMap.get(item.inventory_id.toString());
    return {
      inventory_id: item.inventory_id,
      name: item.name,
      quantity_booked: item.quantity,
      quantity_returned: existing ? existing.quantity_returned : 0,
      verified_at: existing ? existing.verified_at : null,
      verified_by: existing ? existing.verified_by : null
    };
  });

  await booking.save();

  // If active booking, update InventoryReservation & write logs
  const inactiveStatuses = ["cancelled", "Cancelled", "refunded", "inquiry", "quote_sent"];
  if (!inactiveStatuses.includes(booking.status)) {
    const oldReservations = await InventoryReservation.find({ booking_id: booking._id });
    await InventoryReservation.deleteMany({ booking_id: booking._id });

    oldReservations.forEach(r => {
      writeInventoryLog({
        inventory_id: r.inventory_id,
        event_type: "reservation_released",
        delta: r.quantity,
        actor_id: req.user?._id,
        booking_id: booking._id,
        reason: `Equipment reassigned for booking ${booking.reference || booking._id}`
      });
    });

    const newReservations = sanitizedItems.map(item => ({
      inventory_id: item.inventory_id,
      booking_id: booking._id,
      event_date: booking.event_date,
      quantity: item.quantity
    }));

    if (newReservations.length > 0) {
      await InventoryReservation.insertMany(newReservations);
      newReservations.forEach(r => {
        writeInventoryLog({
          inventory_id: r.inventory_id,
          event_type: "reservation_allocated",
          delta: -r.quantity,
          actor_id: req.user?._id,
          booking_id: booking._id,
          reason: `Equipment assigned to booking ${booking.reference || booking._id}`
        });
      });
    }
  }

  await logAction({
    user_id: req.user?._id,
    action: "booking_inventory_assigned",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Updated equipment inventory items for booking ${booking.reference || booking._id}`,
    ip_address: req.ip,
  });

  const updatedBooking = await Booking.findById(booking._id).populate("inventory_items.inventory_id");
  res.json({ message: "Equipment inventory assigned successfully", booking: updatedBooking });
});
