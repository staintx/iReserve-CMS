const Inquiry = require("../models/Inquiry");
const asyncHandler = require("../utils/asyncHandler");
const { createNotification } = require("../utils/notify");

exports.create = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    customer_id: req.user?._id || req.body.customer_id,
    status: req.body.status || "pending"
  };

  res.status(201).json(await Inquiry.create(payload));
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

  if (inquiry.status !== "pending") {
    return res.status(400).json({ message: "Only pending inquiries can be reviewed" });
  }

  inquiry.status = "reviewed";
  inquiry.reviewed_by = req.user._id;
  inquiry.reviewed_at = new Date();
  await inquiry.save();

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

  if (current.status === "pending") {
    return res.status(400).json({ message: "Inquiry must be reviewed before it can be updated" });
  }

  const updated = await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });

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
    return res.status(400).json({ message: "Inquiry can no longer be cancelled" });
  }

  inquiry.status = req.body.status;
  await inquiry.save();
  const io = req.app.get("io");
  await createNotification({
    userId: req.user._id,
    title: "Inquiry cancelled",
    body: "Your inquiry has been cancelled.",
    type: "info",
    link: "/customer/inquiries",
    meta: { inquiry_id: inquiry._id }
  }, io);
  res.json(inquiry);
});

exports.remove = asyncHandler(async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});