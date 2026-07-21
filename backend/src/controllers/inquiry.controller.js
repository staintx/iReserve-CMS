const Inquiry = require("../models/Inquiry");
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
    link: "/admin/inquiries",
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
    await notifyAdmins({
      title: "Quotation Accepted",
      body: `Quotation for inquiry ${inquiry._id} has been accepted by ${req.user.full_name || req.user.email}.`,
      type: "success",
      link: "/admin/inquiries",
      meta: { inquiry_id: inquiry._id }
    }, io);
  }

  res.json(inquiry);
});

exports.remove = asyncHandler(async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});