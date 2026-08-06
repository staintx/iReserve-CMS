const Inquiry = require("../models/Inquiry");
const asyncHandler = require("../utils/asyncHandler");
const { checkInventoryAvailability } = require("./booking.controller"); // Will reuse some inventory checking logic if needed


// Customer submits a new inquiry
exports.createInquiry = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    customer_id: req.user?._id || req.body.customer_id
  };

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
  
  // Here we could perform initial availability checks without reserving
  // e.g., if we know a date is completely blocked
  
  const inquiry = await Inquiry.create(payload);
  
  const { notifyAdmins } = require("../utils/notify");
  await notifyAdmins({
    title: "New Inquiry Submitted",
    body: `A new inquiry (${inquiry.reference}) has been submitted by ${inquiry.contact_first_name} ${inquiry.contact_last_name}.`,
    type: "new_inquiry",
    link: "/admin/bookings/inquiries"
  });
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
    .populate("customer_id", "first_name last_name email phone");
  res.json(inquiries);
});

// Get single inquiry
exports.getInquiryById = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id)
    .populate("customer_id", "first_name last_name email phone")
    .populate("package_id")
    .populate("selected_menu");
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  
  // Security check for customer
  if (req.user.role === "customer" && inquiry.customer_id._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  
  res.json(inquiry);
});

// Admin updates inquiry (status, details)
exports.updateInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  res.json(inquiry);
});

// Admin or Customer deletes/cancels inquiry
exports.deleteInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  
  inquiry.status = "Cancelled";
  await inquiry.save();
  
  res.json({ message: "Inquiry cancelled" });
});
