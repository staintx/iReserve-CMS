const Quote = require("../models/Quote");
const asyncHandler = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    customer_id: req.user?._id || req.body.customer_id
  };
  res.status(201).json(await Quote.create(payload));
});

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await Quote.find().populate("customer_id"));
});

exports.getMine = asyncHandler(async (req, res) => {
  res.json(await Quote.find({ customer_id: req.user._id }).populate("customer_id"));
});

exports.getById = asyncHandler(async (req, res) => {
  res.json(await Quote.findById(req.params.id).populate("customer_id"));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

exports.remove = asyncHandler(async (req, res) => {
  await Quote.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

exports.convertToBooking = asyncHandler(async (req, res) => {
  const quote = await Quote.findById(req.params.id);
  if (!quote) return res.status(404).json({ message: "Quote not found" });
  if (quote.converted_booking_id) return res.status(400).json({ message: "Quote already converted" });

  const Booking = require("../models/Booking");
  const InventoryReservation = require("../models/InventoryReservation");
  const { calculateBookingPrice, findBookingConflict, checkInventoryAvailability } = require("./booking.controller");
  
  // Conflict Check
  const conflict = await findBookingConflict({
    eventDate: quote.event_date,
    startTime: quote.start_time,
    durationHours: quote.duration_hours,
    location: quote,
    bufferMinutes: req.body.buffer_minutes || 0
  });
  if (conflict) {
    return res.status(409).json({ message: "Booking conflict detected for the selected date/time", conflict_id: conflict._id });
  }

  // Inventory Check
  const inventoryItems = req.body.inventory_items || [];
  if (inventoryItems.length > 0) {
    const invCheck = await checkInventoryAvailability(quote.event_date, inventoryItems);
    if (!invCheck.available) {
      return res.status(409).json({ message: `Inventory conflict: Not enough '${invCheck.itemName}' available on this date.` });
    }
  }

  const payload = {
    customer_id: quote.customer_id,
    event_type: quote.event_type,
    event_theme: quote.event_theme,
    event_date: quote.event_date,
    start_time: quote.start_time,
    guest_count: quote.guest_count,
    duration_hours: quote.duration_hours,
    venue_type: quote.venue_type,
    indoor_outdoor: quote.indoor_outdoor,
    province: quote.province,
    municipality: quote.municipality,
    barangay: quote.barangay,
    street: quote.street,
    landmark: quote.landmark,
    zip_code: quote.zip_code,
    selected_menu: quote.selected_menu,
    special_requests: quote.notes,
    allergies: quote.allergies,
    contact_first_name: quote.full_name?.split(" ")[0],
    contact_last_name: quote.full_name?.split(" ").slice(1).join(" "),
    contact_email: quote.email,
    contact_phone: quote.phone,
    package_id: req.body.package_id || null, // Optional, chosen by Admin during conversion
    additional_services: req.body.additional_services || [],
    inventory_items: inventoryItems,
    status: "confirmed", // Converted quotes are implicitly confirmed since admin is doing it
    payment_status: "pending"
  };
  
  // Create booking
  const newBooking = new Booking(payload);
  
  // Allow admin to override price, otherwise calculate
  if (req.body.total_price) {
    newBooking.total_price = Number(req.body.total_price);
  } else {
    newBooking.total_price = await calculateBookingPrice(newBooking);
  }

  await newBooking.save();

  // Create Reservations
  if (newBooking.inventory_items && newBooking.inventory_items.length > 0) {
    const reservations = newBooking.inventory_items
      .filter(item => item.inventory_id)
      .map(item => ({
        inventory_id: item.inventory_id,
        booking_id: newBooking._id,
        event_date: newBooking.event_date,
        quantity: item.quantity
      }));
    if (reservations.length > 0) {
      await InventoryReservation.insertMany(reservations);
    }
  }

  // Mark quote as converted
  quote.status = "converted";
  quote.converted_booking_id = newBooking._id;
  await quote.save();

  res.json({ message: "Quote converted successfully", booking: newBooking });
});
