const Booking = require("../models/Booking");
const Inventory = require("../models/Inventory");
const InventoryReservation = require("../models/InventoryReservation");
const Package = require("../models/Package");
const BusinessInfo = require("../models/BusinessInfo");
const BlockedDate = require("../models/BlockedDate");

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

  for (const item of inventoryItems) {
    if (!item.inventory_id) continue;
    const inv = await Inventory.findById(item.inventory_id);
    if (!inv) continue;

    const query = {
      inventory_id: item.inventory_id,
      event_date: { $gte: dayStart, $lte: dayEnd },
    };
    if (excludeBookingId) {
      query.booking_id = { $ne: excludeBookingId };
    }

    const reservations = await InventoryReservation.find(query);
    const reservedQuantity = reservations.reduce(
      (sum, res) => sum + res.quantity,
      0,
    );

    if (reservedQuantity + Number(item.quantity || 0) > inv.quantity) {
      return { available: false, itemName: inv.item_name };
    }
  }
  return { available: true };
};

const asyncHandler = require("../utils/asyncHandler");
const { createNotification, notifyAdmins } = require("../utils/notify");
const logAction = require("../utils/logAction");
const {
  sendBookingConfirmationEmail,
  sendBookingStatusEmail,
} = require("../utils/booking-emails");

const calculateBookingPrice = async (body) => {
  let sum = 0;
  const guestCount = Number(body.guest_count) || 0;

  if (body.package_id) {
    const pkg = await Package.findById(body.package_id);
    if (pkg) {
      const packageType = pkg.package_type || "Food + Event Setup";
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

  const keys = ["venue_type", "province", "municipality", "barangay", "street"];
  const hasAny = keys.some((key) => Boolean(requestLocation?.[key]));
  if (!hasAny) return true;

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
      existingBookings.find((booking) => sameLocation(location, booking)) ||
      null
    );
  }

  return (
    existingBookings.find((booking) => {
      if (!sameLocation(location, booking)) return false;
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

  const count = await Booking.countDocuments(query);
  const businessInfo = await BusinessInfo.findOne();
  const limit = businessInfo?.max_bookings_per_day || 2;
  
  return count >= limit;
};

exports.create = asyncHandler(async (req, res) => {
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
    req.body.status =
      req.body.payment_method === "cod" ? "confirmed" : "pending deposit";
    req.body.payment_status = "pending";
  } else if (!req.body.status) {
    req.body.status =
      req.body.payment_method === "cod" ? "confirmed" : "pending deposit";
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

  // Check Max Bookings Limit
  const maxLimitReached = await checkMaxBookingsLimit(req.body.event_date);
  if (maxLimitReached) {
    return res.status(409).json({ message: "This date has reached the maximum number of bookings allowed." });
  }

  const conflict = await findBookingConflict({
    eventDate: req.body.event_date,
    startTime: req.body.start_time,
    durationHours: req.body.duration_hours,
    location: req.body,
    bufferMinutes: req.body.buffer_minutes,
  });
  if (conflict) {
    return res.status(409).json({
      message: "Booking conflict detected for the selected date/time",
      conflict_id: conflict._id,
    });
  }

  const invCheck = await checkInventoryAvailability(
    req.body.event_date,
    req.body.inventory_items,
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

  // Send booking confirmation email
  const customerEmail = booking.contact_email || req.user?.email;
  if (customerEmail) {
    sendBookingConfirmationEmail({ booking, customerEmail }).catch(() => {});
  }

  // Create payment checkout for deposit
  if (
    req.user?.role === "customer" &&
    req.body.payment_method &&
    req.body.payment_method !== "cod"
  ) {
    try {
      const Payment = require("../models/Payment");
      const { createCheckoutSession } = require("../services/payment.service");

      const businessInfo = await BusinessInfo.findOne();
      const depositPercentage = businessInfo?.deposit_percentage ?? 20;
      const depositAmount = (booking.total_price * depositPercentage) / 100;

      if (depositAmount > 0) {
        const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const cancelUrl = `${appBaseUrl}/customer/book?status=cancelled`;

        const payment = await Payment.create({
          booking_id: booking._id,
          customer_id: booking.customer_id,
          amount: depositAmount,
          currency: "PHP",
          payment_type: "deposit",
          method: req.body.payment_method, // "gcash", "paymaya", "card"
          status: "pending",
          gateway: "paymongo",
        });
        const successUrl = `${appBaseUrl}/customer/booking-success?booking_id=${booking._id}&payment_id=${payment._id}`;

        const checkout = await createCheckoutSession({
          amount: depositAmount,
          currency: "PHP",
          paymentMethodTypes: [req.body.payment_method], // Only allow the selected one
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

        return res.status(201).json({
          ...booking.toObject(),
          checkout_url: payment.checkout_url,
        });
      }
    } catch (err) {
      console.error("PayMongo Checkout Error:", err);
      // Fallback to regular booking if payment creation fails
    }
  }

  res.status(201).json(booking);
});

exports.getAll = asyncHandler(async (req, res) => {
  res.json(
    await Booking.find().populate("customer_id package_id event_manager_id"),
  );
});

exports.getMine = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer_id: req.user._id }).populate(
    "customer_id package_id event_manager_id",
  );
  res.json(bookings);
});

exports.getById = asyncHandler(async (req, res) => {
  if (req.user?.role === "customer") {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customer_id: req.user._id,
    }).populate("customer_id package_id event_manager_id staff_ids");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    return res.json(booking);
  }

  res.json(
    await Booking.findById(req.params.id).populate(
      "customer_id package_id event_manager_id staff_ids",
    ),
  );
});

exports.update = asyncHandler(async (req, res) => {
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
      }
    }
  } else if (
    current.status === "confirmed" &&
    ["cancelled", "refunded"].includes(updated.status)
  ) {
    await InventoryReservation.deleteMany({ booking_id: updated._id });
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
    await logAction({
      user_id: req.user._id,
      action: "booking_updated",
      entity_type: "booking",
      entity_id: updated._id,
      details: `Updated booking #${updated._id} — Fields: ${detailParts}`,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      ip_address: req.ip,
    });
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
      await createNotification(
        {
          userId: updated.customer_id,
          title: label,
          body: message,
          type: "info",
          link: "/customer/bookings",
        },
        io,
      );

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

    if (otherChanged && updated.change_request?.status === "pending") {
      updated.change_request = {
        ...updated.change_request.toObject?.(),
        status: "approved",
        resolved_at: new Date(),
      };
      await updated.save();
    }
  }

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

  await logAction({
    user_id: req.user._id,
    action: "booking_upgraded",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Customer self-service upgrade: ${upgradeDescription.trim()}`,
    ip_address: req.ip,
  });

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
  await booking.save();

  await logAction({
    user_id: req.user._id,
    action: "booking_change_requested",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Requested booking change for ${booking.event_type || "event"} on ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "N/A"}`,
    changes: { change_request: { to: requestMessage } },
    ip_address: req.ip,
  });

  const io = req.app.get("io");
  await notifyAdmins(
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
    io,
  );

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
  
  // Get all blocked dates in the range
  const blockedDates = await BlockedDate.find({
    date: {
      $gte: new Date(new Date(event_date).setDate(new Date(event_date).getDate() - range)),
      $lte: new Date(new Date(event_date).setDate(new Date(event_date).getDate() + range))
    }
  });
  const blockedTimestamps = new Set(blockedDates.map(b => new Date(b.date).setHours(0,0,0,0)));

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

      const conflict = await findBookingConflict({
        eventDate: candidate,
        startTime: start_time,
        durationHours: duration_hours,
        location,
      });
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
  if (!outcome || !["proceed", "cancel", "reschedule"].includes(outcome)) {
    return res
      .status(400)
      .json({
        message: "Outcome must be 'proceed', 'cancel', or 'reschedule'",
      });
  }

  booking.ocular_visit = {
    ...(booking.ocular_visit?.toObject?.() || booking.ocular_visit || {}),
    status: "completed",
    outcome,
    notes: notes || booking.ocular_visit?.notes || "",
    completed_at: new Date(),
  };
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

  await logAction({
    user_id: req.user._id,
    action: "ocular_completed",
    entity_type: "booking",
    entity_id: booking._id,
    details: `Ocular visit completed with outcome: ${outcome}`,
    ip_address: req.ip,
  });

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

  // 1. Get dates from BlockedDate model
  const blockedDates = await BlockedDate.find({
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });
  const blockedDatesSet = new Set(blockedDates.map(b => b.date.toISOString().split('T')[0]));

  // 2. Get bookings to check against max limit
  const businessInfo = await BusinessInfo.findOne();
  const limit = businessInfo?.max_bookings_per_day || 2;

  const bookings = await Booking.find({
    status: { $in: ["pending deposit", "confirmed", "preparing", "ongoing"] },
    event_date: { $gte: startOfMonth, $lte: endOfMonth }
  });

  const dateCounts = {};
  bookings.forEach(booking => {
    if (booking.event_date) {
      const d = new Date(booking.event_date).toISOString().split('T')[0];
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    }
  });

  const fullyBookedDates = Object.keys(dateCounts).filter(dateStr => dateCounts[dateStr] >= limit);

  // Merge blocked dates and fully booked dates
  const result = Array.from(new Set([...blockedDatesSet, ...fullyBookedDates]));

  res.json(result);
});

exports.getAvailableTimes = asyncHandler(async (req, res) => {
  const { event_date, duration_hours, venue_type, province, municipality, barangay, street, delivery_method, service_type } = req.query;

  if (!event_date) {
    return res.status(400).json({ message: "Event date is required" });
  }

  // 1. Check max bookings limit for the day first.
  // If the day is fully booked, all times are full.
  const maxLimitReached = await checkMaxBookingsLimit(event_date);
  
  // Define the standard time slots
  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
  ];

  const results = [];

  for (const time of timeSlots) {
    if (maxLimitReached) {
      results.push({ time, status: "full" });
      continue;
    }

    const conflict = await findBookingConflict({
      eventDate: event_date,
      startTime: time,
      durationHours: duration_hours || 4,
      location: {
        venue_type,
        province,
        municipality,
        barangay,
        street,
        delivery_method,
        service_type
      },
      bufferMinutes: req.query.buffer_minutes || 0
    });

    results.push({
      time: time,
      status: conflict ? "full" : "available"
    });
  }

  res.json(results);
});
