const Inquiry = require("../models/Inquiry");
const BlockedDate = require("../models/BlockedDate");
const asyncHandler = require("../utils/asyncHandler");
const { checkInventoryAvailability } = require("./booking.controller");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const { cateringRequested, serviceTypeForRequest } = require("../utils/catering");

// Customer submits a new inquiry
exports.createInquiry = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    customer_id: req.user?._id || req.body.customer_id,
    status: "Pending Review",
  };

  // The catering answer decides the service type, not the package the customer
  // started from. Derived here as well as in the wizard so what is stored says
  // the same thing whatever the client sent: a request that includes food is
  // "Food and Event Setup" even if it began life on an Event Setup Only
  // package, and one without food carries no menu.
  payload.include_food = cateringRequested(payload);
  payload.service_type = serviceTypeForRequest(payload);
  if (!payload.include_food) payload.selected_menu = [];

  if (Array.isArray(payload.additional_services) && (!payload.service_items || payload.service_items.length === 0)) {
    payload.service_items = payload.additional_services.map(s => ({
      name: typeof s === "string" ? s : (s.name || String(s)),
      quantity: typeof s === "object" && s.quantity ? s.quantity : 1,
      price: typeof s === "object" && s.price ? s.price : 0
    }));
  }

  // Check if requested date is blocked by admin
  if (payload.event_date) {
    const parsedDate = new Date(payload.event_date);
    if (!isNaN(parsedDate.getTime())) {
      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const blocked = await BlockedDate.findOne({
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (blocked) {
        return res.status(400).json({
          message: `The selected date (${payload.event_date}) is blocked for inquiries and bookings (${blocked.reason || 'Blocked by administration'}). Please select a different date.`
        });
      }
    }
  }

  // Anti-spam check: prevent duplicate submissions within 60 seconds
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentInquiry = await Inquiry.findOne({
    customer_id: payload.customer_id,
    createdAt: { $gte: oneMinuteAgo }
  });

  if (recentInquiry) {
    return res.status(429).json({
      message: "You are submitting inquiries too quickly. Please wait a moment before trying again."
    });
  }

  const inquiry = await Inquiry.create(payload);
  
  const { notifyAdmins } = require("../utils/notify");
  await notifyAdmins({
    title: "New Inquiry Submitted",
    body: `A new inquiry (${inquiry.reference}) has been submitted by ${inquiry.contact_first_name} ${inquiry.contact_last_name}.`,
    type: "new_inquiry",
    link: "/admin/bookings/inquiries"
  });
  
  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "inquiry", action: "create" });

  res.status(201).json(inquiry);
});

// Admin or Customer gets all inquiries (filtered by role/user)
exports.getInquiries = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === "customer") {
    query.customer_id = req.user._id;
  }
  const inquiries = await Inquiry.find(query)
    .sort({ createdAt: -1 })
    .populate("customer_id", "first_name last_name email phone")
    .lean();
  res.json(inquiries);
});

// Get single inquiry
exports.getInquiryById = asyncHandler(async (req, res) => {
  const rawInquiry = await Inquiry.findById(req.params.id);
  if (!rawInquiry) return res.status(404).json({ message: "Inquiry not found" });

  const hadPackageSelection = Boolean(rawInquiry.package_id);

  const inquiry = await Inquiry.findById(req.params.id)
    .populate("customer_id", "first_name last_name email phone")
    .populate("package_id")
    .populate("selected_menu");
  
  // Security check for customer
  const inquiryCustomerId = inquiry.customer_id?._id || inquiry.customer_id;
  if (req.user.role === "customer" && String(inquiryCustomerId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to this inquiry" });
  }

  // Only transition status to "Under Review" when an admin/staff actually opens/views the inquiry details
  if (["admin", "staff", "manager"].includes(req.user?.role) && rawInquiry.status === "Pending Review") {
    rawInquiry.status = "Under Review";
    await rawInquiry.save();
    inquiry.status = "Under Review";

    const io = req.app.get("io");
    if (io) io.emit("system:refresh", { type: "inquiry", action: "update", id: rawInquiry._id });
  }
  
  const inquiryObj = inquiry.toObject();
  inquiryObj.had_package_selection = hadPackageSelection;

  res.json(inquiryObj);
});

// Admin updates inquiry (status, details)
exports.updateInquiry = asyncHandler(async (req, res) => {
  // runValidators: the enum was previously unenforced on this path, which is
  // how "Cancelled" got written for months without being a legal value.
  const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "inquiry", action: "update" });

  res.json(inquiry);
});

/**
 * Archive / restore. Filing only — the lifecycle status is left alone, so an
 * inquiry can be pulled back out of the archive exactly as it went in.
 */
exports.setInquiryArchived = asyncHandler(async (req, res) => {
  const archived = req.body?.archived !== false;

  const inquiry = await Inquiry.findByIdAndUpdate(
    req.params.id,
    { archived, archived_at: archived ? new Date() : null },
    { returnDocument: "after", runValidators: true },
  );
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "inquiry", action: "update" });

  res.json(inquiry);
});

// Admin or Customer deletes/cancels inquiry
exports.deleteInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  const inquiryCustomerId = inquiry.customer_id?._id || inquiry.customer_id;
  if (req.user.role === "customer" && String(inquiryCustomerId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to this inquiry" });
  }
  
  inquiry.status = "Cancelled";
  await inquiry.save();
  
  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "inquiry", action: "delete" });

  res.json({ message: "Inquiry cancelled" });
});

// Customer uploads inspiration / moodboard photos for custom event setup
exports.uploadInspirationImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No image files uploaded" });
  }

  const uploadPromises = req.files.map(async (file) => {
    const result = await uploadToCloudinary(file.buffer, "inquiries/inspiration");
    return result.secure_url;
  });

  const urls = await Promise.all(uploadPromises);
  res.status(200).json({ urls });
});
