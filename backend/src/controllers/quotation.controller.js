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

  res.json({ message: "Quotation rejected", quotation });
});
