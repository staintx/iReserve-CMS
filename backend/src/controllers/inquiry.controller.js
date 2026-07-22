const Inquiry = require("../models/Inquiry");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");
const { createNotification, notifyAdmins } = require("../utils/notify");
const logAction = require("../utils/logAction");

exports.create = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    customer_id: req.user?._id || req.body.customer_id,
    status: req.body.status || "new"
  };

  const inquiry = await Inquiry.create(payload);

  const io = req.app.get("io");
  await notifyAdmins({
    title: "New Inquiry Received",
    body: `A new inquiry has been submitted by ${req.user ? req.user.full_name || req.user.email : "a customer"}.`,
    type: "info",
    link: `/admin/inquiries/${inquiry._id}/review`,
    meta: { inquiry_id: inquiry._id }
  }, io);

  res.status(201).json(inquiry);
});

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await Inquiry.find().populate("customer_id package_id"));
});

exports.getMine = asyncHandler(async (req, res) => {
  res.json(await Inquiry.find({ customer_id: req.user._id }).populate("customer_id package_id"));
});

exports.getById = asyncHandler(async (req, res) => {
  if (req.user?.role === "customer") {
    const inquiry = await Inquiry.findOne({ _id: req.params.id, customer_id: req.user._id })
      .populate("customer_id package_id");
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
    return res.json(inquiry);
  }

  res.json(await Inquiry.findById(req.params.id).populate("customer_id package_id"));
});

exports.review = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  if (inquiry.status !== "new") {
    return res.status(400).json({ message: "Only new inquiries can be reviewed" });
  }

  const previousStatus = inquiry.status;
  inquiry.status = "under review";
  inquiry.reviewed_by = req.user._id;
  inquiry.reviewed_at = new Date();
  await inquiry.save();

  await logAction({
    user_id: req.user._id,
    action: "inquiry_reviewed",
    entity_type: "inquiry",
    entity_id: inquiry._id,
    details: `Reviewed inquiry #${inquiry._id} — Status changed from "${previousStatus}" to "under review"`,
    changes: { status: { from: previousStatus, to: "under review" } },
    ip_address: req.ip
  });

  if (inquiry.customer_id) {
    const io = req.app.get("io");
    await createNotification({
      userId: inquiry.customer_id,
      title: "Inquiry under review",
      body: "Your inquiry is now being reviewed by our team.",
      type: "info",
      link: "/customer/inquiries",
      meta: { inquiry_id: inquiry._id }
    }, io);
  }

  res.json(inquiry);
});

exports.update = asyncHandler(async (req, res) => {
  const current = await Inquiry.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Inquiry not found" });

  if (current.status === "new") {
    return res.status(400).json({ message: "Inquiry must be reviewed before it can be updated" });
  }

  // Auto-resolve quote_change_request if admin sends the quotation back to customer
  if (current.quote_change_request && !current.quote_change_request.resolved_at && req.body.status === "awaiting confirmation") {
    req.body.quote_change_request = {
      ...current.quote_change_request,
      resolved_at: new Date()
    };
  }

  const updated = await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });

  // Build changes for the log
  const trackFields = ["status", "quote_amount", "quote_notes", "event_type", "event_theme", "event_date", "guest_count", "duration_hours", "start_time"];
  const changes = {};
  for (const field of trackFields) {
    if (req.body[field] !== undefined && String(current[field] ?? "") !== String(req.body[field] ?? "")) {
      changes[field] = { from: current[field], to: req.body[field] };
    }
  }

  const changedFieldNames = Object.keys(changes);
  const detailParts = changedFieldNames.length > 0
    ? changedFieldNames.join(", ")
    : Object.keys(req.body).join(", ");

  await logAction({
    user_id: req.user._id,
    action: "inquiry_updated",
    entity_type: "inquiry",
    entity_id: updated._id,
    details: `Updated inquiry #${updated._id} — Fields: ${detailParts}`,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    ip_address: req.ip
  });

  if (updated?.customer_id && req.user?.role !== "customer") {
    const statusChanged = current.status !== updated.status;
    const quoteChanged = current.quote_amount !== updated.quote_amount || current.quote_notes !== updated.quote_notes;
    const dateRequestChanged = req.body.date_change_request !== undefined;
    if (statusChanged || quoteChanged) {
      const io = req.app.get("io");
      await createNotification({
        userId: updated.customer_id,
        title: "Inquiry update",
        body: statusChanged
          ? `Your inquiry status is now ${updated.status}.`
          : "Your inquiry quote details have been updated.",
        type: statusChanged ? "info" : "success",
        link: "/customer/inquiries",
        meta: { inquiry_id: updated._id }
      }, io);
    }

    if (dateRequestChanged) {
      const io = req.app.get("io");
      await createNotification({
        userId: updated.customer_id,
        title: "Date change requested",
        body: req.body.date_change_request?.message || "Please update the event date for your quotation.",
        type: "warning",
        link: "/customer/inquiries",
        meta: { inquiry_id: updated._id, date_change_request: req.body.date_change_request || null }
      }, io);
    }
  }

  res.json(updated);
});

exports.updateMineStatus = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findOne({ _id: req.params.id, customer_id: req.user._id });
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  const blockedStatuses = ["approved", "booked", "completed"];
  if (blockedStatuses.includes(inquiry.status)) {
    return res.status(400).json({ message: "Inquiry status can no longer be changed" });
  }

  const previousStatus = inquiry.status;
  inquiry.status = req.body.status;
  await inquiry.save();

  await logAction({
    user_id: req.user._id,
    action: "inquiry_customer_status_update",
    entity_type: "inquiry",
    entity_id: inquiry._id,
    details: `Customer ${req.body.status === "confirmed" ? "accepted" : "cancelled"} inquiry #${inquiry._id} — Status changed from "${previousStatus}" to "${req.body.status}"`,
    changes: { status: { from: previousStatus, to: req.body.status } },
    ip_address: req.ip
  });

  const io = req.app.get("io");

  const isConfirmed = req.body.status === "confirmed";
  await createNotification({
    userId: req.user._id,
    title: isConfirmed ? "Quotation Accepted" : "Inquiry Cancelled",
    body: isConfirmed ? "You have accepted the quotation. The admin will create your booking shortly." : "Your inquiry has been cancelled.",
    type: isConfirmed ? "success" : "info",
    link: "/customer/inquiries",
    meta: { inquiry_id: inquiry._id }
  }, io);

  if (isConfirmed) {
    let booking = await Booking.findOne({ inquiry_id: inquiry._id });
    if (!booking) {
      booking = await Booking.create({
        customer_id: inquiry.customer_id,
        inquiry_id: inquiry._id,
        package_id: inquiry.package_id,
        event_type: inquiry.event_type,
        event_theme: inquiry.event_theme,
        event_date: inquiry.event_date,
        start_time: inquiry.start_time,
        guest_count: inquiry.guest_count,
        duration_hours: inquiry.duration_hours,
        include_food: inquiry.include_food,
        venue_type: inquiry.venue_type,
        indoor_outdoor: inquiry.indoor_outdoor,
        province: inquiry.province,
        municipality: inquiry.municipality,
        barangay: inquiry.barangay,
        street: inquiry.street,
        landmark: inquiry.landmark,
        zip_code: inquiry.zip_code,
        venue_contact_name: inquiry.venue_contact_name,
        venue_contact_phone: inquiry.venue_contact_phone,
        selected_menu: inquiry.selected_menu,
        menu_items: inquiry.menu_items,
        dietary_restrictions: inquiry.dietary_restrictions,
        allergies: inquiry.allergies,
        special_requests: inquiry.special_requests,
        additional_services: inquiry.additional_services,
        service_items: inquiry.service_items,
        additional_charges: inquiry.additional_charges,
        contact_first_name: inquiry.contact_first_name,
        contact_last_name: inquiry.contact_last_name,
        contact_email: inquiry.contact_email,
        contact_phone: inquiry.contact_phone,
        contact_alt_phone: inquiry.contact_alt_phone,
        contact_method: inquiry.contact_method,
        total_price: Number(inquiry.quote_amount || inquiry.package_amount || 0),
        payment_method: inquiry.payment_method,
        status: "pending deposit"
      });
    }

    await notifyAdmins({
      title: "Quotation Accepted",
      body: `Quotation for inquiry ${inquiry._id} has been accepted by ${req.user.full_name || req.user.email}.`,
      type: "success",
      link: booking?._id ? `/admin/bookings/${booking._id}/details` : `/admin/inquiries/${inquiry._id}/review`,
      meta: { inquiry_id: inquiry._id, booking_id: booking?._id || null }
    }, io);

    await createNotification({
      userId: req.user._id,
      title: "Quotation accepted",
      body: "Your booking has been created and is now awaiting admin processing.",
      type: "success",
      link: "/customer/bookings",
      meta: { inquiry_id: inquiry._id, booking_id: booking?._id || null }
    }, io);
  }

  res.json(inquiry);
});

exports.updateMineDate = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findOne({ _id: req.params.id, customer_id: req.user._id });
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  if (inquiry.status !== "negotiating") {
    return res.status(400).json({ message: "This inquiry is not waiting for a new date request." });
  }

  const nextDate = new Date(req.body.event_date);
  if (Number.isNaN(nextDate.getTime())) {
    return res.status(400).json({ message: "Event date must be a valid date." });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (nextDate < today) {
    return res.status(400).json({ message: "Event date must be today or later." });
  }

  inquiry.event_date = nextDate;
  inquiry.status = "confirmed";
  inquiry.date_change_request = undefined;
  await inquiry.save();

  const io = req.app.get("io");
  await createNotification({
    userId: req.user._id,
    title: "Date updated",
    body: "Your new event date has been sent to the admin.",
    type: "success",
    link: "/customer/inquiries",
    meta: { inquiry_id: inquiry._id }
  }, io);

  await notifyAdmins({
    title: "Customer updated event date",
    body: `${req.user.full_name || req.user.email || "A customer"} updated the event date for inquiry ${inquiry._id}.`,
    type: "info",
    link: `/admin/inquiries/${inquiry._id}/review`,
    meta: { inquiry_id: inquiry._id, event_date: inquiry.event_date }
  }, io);

  res.json(inquiry);
});

exports.updateQuoteChange = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findOne({ _id: req.params.id, customer_id: req.user._id });
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  if (inquiry.status !== "awaiting confirmation") {
    return res.status(400).json({ message: "Can only request changes when quotation is awaiting confirmation." });
  }

  if (!req.body.message) {
    return res.status(400).json({ message: "Change request message is required." });
  }

  inquiry.quote_change_request = {
    message: req.body.message,
    requested_at: new Date()
  };
  inquiry.status = "negotiating";
  await inquiry.save();

  const io = req.app.get("io");
  await createNotification({
    userId: req.user._id,
    title: "Change request sent",
    body: "Your quotation change request has been sent to the admin.",
    type: "success",
    link: "/customer/inquiries",
    meta: { inquiry_id: inquiry._id }
  }, io);

  await notifyAdmins({
    title: "Customer requested quote change",
    body: `${req.user.full_name || req.user.email || "A customer"} requested changes for quotation ${inquiry._id}.`,
    type: "warning",
    link: `/admin/inquiries/${inquiry._id}/review`,
    meta: { inquiry_id: inquiry._id }
  }, io);

  res.json(inquiry);
});


exports.remove = asyncHandler(async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});