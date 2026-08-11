const Quotation = require("../models/Quotation");
const Inquiry = require("../models/Inquiry");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");

// Helper to check customer ownership of inquiry/quotation
const verifyCustomerOwnership = (inquiry, userId) => {
  const customerId = inquiry?.customer_id?._id || inquiry?.customer_id;
  return String(customerId) === String(userId);
};

// Admin generates a new quotation or new version
exports.createQuotation = asyncHandler(async (req, res) => {
  const { inquiry_id } = req.body;
  const inquiry = await Inquiry.findById(inquiry_id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  // Validate numeric fields to prevent negative values
  const numericCheck = [
    { field: "package_price", label: "Package price" },
    { field: "transportation_fee", label: "Transportation fee" },
    { field: "equipment_fee", label: "Equipment fee" },
    { field: "decoration_fee", label: "Decoration fee" },
    { field: "taxes", label: "Taxes" },
    { field: "discounts", label: "Discounts" },
    { field: "deposit_amount", label: "Required deposit" },
    { field: "subtotal", label: "Subtotal" },
    { field: "total_cost", label: "Total cost" },
    { field: "remaining_balance", label: "Remaining balance" },
  ];

  for (const item of numericCheck) {
    const val = req.body[item.field];
    if (val !== undefined && val !== null && Number(val) < 0) {
      return res.status(400).json({ message: `${item.label} cannot be a negative number.` });
    }
  }

  if (Array.isArray(req.body.menu_items)) {
    for (const item of req.body.menu_items) {
      if (item.price !== undefined && Number(item.price) < 0) {
        return res.status(400).json({ message: `Menu item price cannot be negative.` });
      }
    }
  }

  if (Array.isArray(req.body.add_ons)) {
    for (const item of req.body.add_ons) {
      if (item.price !== undefined && Number(item.price) < 0) {
        return res.status(400).json({ message: `Add-on price cannot be negative.` });
      }
      if (item.quantity !== undefined && Number(item.quantity) < 0) {
        return res.status(400).json({ message: `Add-on quantity cannot be negative.` });
      }
    }
  }

  // Get current highest version for this inquiry
  const latestQuote = await Quotation.findOne({ inquiry_id }).sort({ version_number: -1 });
  const nextVersion = latestQuote ? latestQuote.version_number + 1 : 1;

  const payload = {
    ...req.body,
    version_number: nextVersion,
    status: "Sent"
  };

  const quotation = await Quotation.create(payload);
  
  inquiry.status = "Quotation Sent";
  inquiry.revision_count = nextVersion - 1;
  await inquiry.save();

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "quotation", action: "create" });

  res.status(201).json(quotation);
});

// Get all quotations (Admin)
exports.getAllQuotations = asyncHandler(async (req, res) => {
  const quotations = await Quotation.find()
    .populate({
      path: "inquiry_id",
      populate: { path: "customer_id", select: "first_name last_name email phone" }
    })
    .sort({ createdAt: -1 });
  res.json(quotations);
});

// Get all quotations for an inquiry
exports.getQuotationsByInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.inquiryId);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  if (req.user?.role === "customer" && !verifyCustomerOwnership(inquiry, req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to this quotation" });
  }

  const quotations = await Quotation.find({ inquiry_id: req.params.inquiryId }).sort({ version_number: -1 });
  res.json(quotations);
});

// Get specific quotation
exports.getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id).populate("inquiry_id");
  if (!quotation) return res.status(404).json({ message: "Quotation not found" });

  if (req.user?.role === "customer" && !verifyCustomerOwnership(quotation.inquiry_id, req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to this quotation" });
  }

  res.json(quotation);
});

// Customer accepts quotation
exports.acceptQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id).populate("inquiry_id");
  if (!quotation) return res.status(404).json({ message: "Quotation not found" });

  if (req.user?.role === "customer" && !verifyCustomerOwnership(quotation.inquiry_id, req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to accept this quotation" });
  }

  const inquiryId = quotation.inquiry_id?._id || quotation.inquiry_id;
  const existingApprovedPayment = await Payment.findOne({ inquiry_id: inquiryId, status: "approved" });
  if (existingApprovedPayment) {
    return res.status(400).json({ message: "This quotation/inquiry has already been paid and accepted." });
  }

  quotation.status = "Awaiting Final Confirmation";
  await quotation.save();

  const inquiry = await Inquiry.findById(inquiryId);
  if (inquiry) {
    inquiry.status = "Awaiting Final Confirmation";
    await inquiry.save();
  }

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "quotation", action: "accept" });

  res.json({ message: "Quotation accepted, awaiting final admin confirmation", quotation });
});

// Customer requests revision
exports.requestRevision = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id).populate("inquiry_id");
  if (!quotation) return res.status(404).json({ message: "Quotation not found" });

  if (req.user?.role === "customer" && !verifyCustomerOwnership(quotation.inquiry_id, req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to modify this quotation" });
  }

  quotation.status = "Revision Requested";
  quotation.customer_response = req.body.customer_response;
  quotation.revision_requested_at = new Date();
  await quotation.save();

  const inquiryId = quotation.inquiry_id?._id || quotation.inquiry_id;
  const inquiry = await Inquiry.findById(inquiryId);
  if (inquiry) {
    inquiry.status = "Revision Requested";
    await inquiry.save();
  }

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "quotation", action: "revise" });

  res.json({ message: "Revision requested", quotation });
});

// Customer rejects quotation
exports.rejectQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id).populate("inquiry_id");
  if (!quotation) return res.status(404).json({ message: "Quotation not found" });

  if (req.user?.role === "customer" && !verifyCustomerOwnership(quotation.inquiry_id, req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to reject this quotation" });
  }

  quotation.status = "Rejected";
  await quotation.save();

  const inquiryId = quotation.inquiry_id?._id || quotation.inquiry_id;
  const inquiry = await Inquiry.findById(inquiryId);
  if (inquiry) {
    inquiry.status = "Quote Rejected";
    await inquiry.save();
  }

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "quotation", action: "reject" });

  res.json({ message: "Quotation rejected", quotation });
});
