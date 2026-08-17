const Quotation = require("../models/Quotation");
const Inquiry = require("../models/Inquiry");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");
const { computeQuotationTotals, money } = require("../utils/quotationPricing");

// Helper to check customer ownership of inquiry/quotation
const verifyCustomerOwnership = (inquiry, userId) => {
  const customerId = inquiry?.customer_id?._id || inquiry?.customer_id;
  return String(customerId) === String(userId);
};

/**
 * Whether an event date is already behind us.
 *
 * Compared at day granularity: an event happening later today is still ahead,
 * and only a date whose whole day has passed counts as past. A missing date is
 * not treated as past; the required-field check owns that case.
 */
function isPastEventDate(value) {
  if (!value) return false;
  const eventDate = new Date(value);
  if (Number.isNaN(eventDate.getTime())) return false;
  const startOfEventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate()
  );
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return startOfEventDay < startOfToday;
}

/** Peso amounts inside validation messages, so the admin reads real figures. */
const peso = (value) =>
  `PHP ${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Everything a quotation must have before it can go to a customer.
 *
 * Each failure names the field it is about so the builder can put the message
 * next to the input the admin has to fix, rather than showing one generic
 * error for a form this large.
 */
function validateQuotationPayload(body, totals) {
  const errors = {};
  const negative = (value) => value !== undefined && value !== null && Number(value) < 0;

  const numericFields = [
    { field: "package_starting_price", label: "Package starting price" },
    { field: "transportation_fee", label: "Transportation fee" },
    { field: "taxes", label: "Taxes" },
    { field: "discounts", label: "Discounts" },
    { field: "deposit_amount", label: "Required deposit" },
  ];
  numericFields.forEach(({ field, label }) => {
    if (negative(body[field])) errors[field] = `${label} cannot be a negative amount.`;
  });

  if (!String(body.package_name || "").trim()) {
    errors.package_name = "This quotation has no package name.";
  }

  if (!Number(body.guest_count) || Number(body.guest_count) < 1) {
    errors.guest_count = "Enter the guest count for this event.";
  }

  (Array.isArray(body.menu_items) ? body.menu_items : []).forEach((item, index) => {
    if (!String(item?.name || "").trim()) {
      errors[`menu_items.${index}.name`] = "Name this dish or remove the line.";
    }
    if (negative(item?.price)) {
      errors[`menu_items.${index}.price`] = "A dish price cannot be negative.";
    }
  });

  (Array.isArray(body.add_ons) ? body.add_ons : []).forEach((item, index) => {
    if (!String(item?.name || "").trim()) {
      errors[`add_ons.${index}.name`] = "Name this add-on or remove the line.";
    }
    if (negative(item?.price)) {
      errors[`add_ons.${index}.price`] = "An add-on price cannot be negative.";
    }
    if (item?.quantity !== undefined && Number(item.quantity) < 1) {
      errors[`add_ons.${index}.quantity`] = "Quantity must be at least 1.";
    }
  });

  (Array.isArray(body.removed_inclusions) ? body.removed_inclusions : []).forEach(
    (item, index) => {
      if (!String(item?.name || "").trim()) {
        errors[`removed_inclusions.${index}.name`] = "A removed inclusion needs a name.";
      }
      if (negative(item?.deduction)) {
        errors[`removed_inclusions.${index}.deduction`] =
          "A deduction cannot be a negative amount.";
      }
    }
  );

  (Array.isArray(body.additional_fees) ? body.additional_fees : []).forEach((fee, index) => {
    if (!String(fee?.name || "").trim()) {
      errors[`additional_fees.${index}.name`] = "Name this fee so the customer knows what it covers.";
    }
    if (negative(fee?.amount)) {
      errors[`additional_fees.${index}.amount`] = "A fee cannot be a negative amount.";
    }
  });

  // Deductions larger than the package they come off cannot be honoured: the
  // package line would have to go negative to balance.
  if (totals.inclusionDeductions > totals.startingPrice) {
    errors.removed_inclusions = `Removed inclusions deduct ${peso(
      totals.inclusionDeductions
    )} from a starting price of ${peso(
      totals.startingPrice
    )}. Lower the deductions or raise the starting price.`;
  }

  if (totals.totalCost <= 0) {
    errors.total_cost =
      "This quotation totals zero. Add the pricing before sending it to the customer.";
  }

  // The deposit is what reserves the date. A quotation the customer can accept
  // without paying anything is the one case this endpoint must never store.
  if (!Number(body.deposit_amount) || Number(body.deposit_amount) <= 0) {
    errors.deposit_amount = "Set the deposit the customer must pay to confirm this booking.";
  } else if (money(body.deposit_amount) > totals.totalCost) {
    errors.deposit_amount = `The deposit cannot be more than the total of ${peso(
      totals.totalCost
    )}.`;
  }

  return errors;
}

/**
 * The stored shape of a quotation, with every total recomputed.
 *
 * Totals are never trusted from the request: the stored total is what the
 * customer is charged, so it comes from the same formula every time regardless
 * of what the browser sent.
 */
function buildQuotationPayload(body, totals) {
  const payload = {
    ...body,
    package_starting_price: totals.startingPrice,
    package_price: totals.packagePrice,
    guest_count: totals.guestCount,
    subtotal: totals.subtotal,
    total_cost: totals.totalCost,
    deposit_amount: totals.depositAmount,
    remaining_balance: totals.remainingBalance,
  };

  // The two legacy fee fields are never written by the builder any more, and a
  // stale value carried in from the client would quietly reappear on the
  // customer's copy of the quotation.
  delete payload.equipment_fee;
  delete payload.decoration_fee;
  // Version, status and the event snapshot are decided here, never by the
  // caller. The snapshot in particular is what the customer is shown, so it
  // must come from the stored inquiry rather than from the browser.
  delete payload.version_number;
  delete payload.status;
  delete payload.event_snapshot;

  return payload;
}

/**
 * The version number a quotation gets when it is issued.
 *
 * Drafts are excluded on purpose: an unsent draft is a version in waiting, not
 * one the customer has ever seen, so it must not push the next real version up.
 */
async function nextVersionNumber(inquiryId) {
  const latestIssued = await Quotation.findOne({
    inquiry_id: inquiryId,
    status: { $ne: "Draft" },
  }).sort({ version_number: -1 });
  return latestIssued ? latestIssued.version_number + 1 : 1;
}

const findDraft = (inquiryId) => Quotation.findOne({ inquiry_id: inquiryId, status: "Draft" });

/**
 * The event details this version is being quoted against.
 *
 * Taken from the inquiry at the moment of sending, which is after the builder
 * has written the admin's corrections to it, so the snapshot and the quotation
 * always describe the same event. Never taken from the request body: the
 * customer's copy must not be something the browser can dictate.
 */
function buildEventSnapshot(inquiry) {
  return {
    contact_first_name: inquiry.contact_first_name,
    contact_last_name: inquiry.contact_last_name,
    contact_email: inquiry.contact_email,
    contact_phone: inquiry.contact_phone,
    event_type: inquiry.event_type,
    event_date: inquiry.event_date,
    start_time: inquiry.start_time,
    duration_hours: inquiry.duration_hours,
    service_type: inquiry.service_type,
    include_food: inquiry.include_food,
    delivery_method: inquiry.delivery_method,
    venue_type: inquiry.venue_type,
    province: inquiry.province,
    municipality: inquiry.municipality,
    barangay: inquiry.barangay,
    street: inquiry.street,
    landmark: inquiry.landmark,
    zip_code: inquiry.zip_code,
    special_requests: inquiry.special_requests,
    dietary_requirements: inquiry.dietary_requirements,
    allergies: inquiry.allergies,
    dietary_restrictions: inquiry.dietary_restrictions,
  };
}

/**
 * Admin saves work in progress.
 *
 * Deliberately skips the required-field checks that apply to sending: a draft
 * exists so an admin can stop halfway and come back, which is impossible if
 * every field has to be valid first. Nothing about a draft reaches the customer
 * or the inquiry, so an incomplete one is harmless. There is at most one draft
 * per inquiry, reused on every save.
 */
exports.saveQuotationDraft = asyncHandler(async (req, res) => {
  const { inquiry_id } = req.body;
  const inquiry = await Inquiry.findById(inquiry_id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  const totals = computeQuotationTotals(req.body);
  const payload = buildQuotationPayload(req.body, totals);

  const existing = await findDraft(inquiry_id);
  let draft;
  if (existing) {
    Object.assign(existing, payload);
    draft = await existing.save();
  } else {
    draft = await Quotation.create({
      ...payload,
      version_number: await nextVersionNumber(inquiry_id),
      status: "Draft",
    });
  }

  // The inquiry's status is left alone on purpose. Saving a draft is private
  // admin work, so the customer's view of where their booking stands must not
  // move until the quotation is actually sent.

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "quotation", action: "draft" });

  res.status(200).json(draft);
});

// Admin discards work in progress
exports.deleteQuotationDraft = asyncHandler(async (req, res) => {
  const draft = await findDraft(req.params.inquiryId);
  if (!draft) return res.status(404).json({ message: "No draft to discard" });

  await draft.deleteOne();

  const io = req.app.get("io");
  if (io) io.emit("system:refresh", { type: "quotation", action: "draft" });

  res.json({ message: "Draft discarded" });
});

// Admin generates a new quotation or new version
exports.createQuotation = asyncHandler(async (req, res) => {
  const { inquiry_id } = req.body;
  const inquiry = await Inquiry.findById(inquiry_id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  const totals = computeQuotationTotals(req.body);

  const errors = validateQuotationPayload(req.body, totals);

  // The event date lives on the inquiry, which the builder saves just before
  // sending, so it is checked here rather than against the request body. A
  // quotation for a date that has already gone cannot be accepted, paid, or
  // scheduled, so it must not be issued however the request was made.
  if (isPastEventDate(inquiry.event_date)) {
    errors.event_date =
      "This event date has already passed. Update the event date before sending the quotation.";
  }

  const firstError = Object.values(errors)[0];
  if (firstError) {
    return res.status(400).json({ message: firstError, errors });
  }

  const nextVersion = await nextVersionNumber(inquiry_id);
  const payload = buildQuotationPayload(req.body, totals);
  // Freeze the event onto this version so the customer's copy keeps showing
  // what it was issued against, whatever happens to the inquiry afterwards.
  payload.event_snapshot = buildEventSnapshot(inquiry);

  // Sending promotes the draft the admin has been working on, rather than
  // leaving an orphaned Draft sitting next to the issued version.
  const draft = await findDraft(inquiry_id);
  let quotation;
  if (draft) {
    Object.assign(draft, payload);
    // Unapplied edits belong to the draft only. By now the admin's corrections
    // have been written to the inquiry itself, so a second copy here would be
    // the stale one.
    draft.set("draft_details", undefined);
    draft.version_number = nextVersion;
    draft.status = "Sent";
    quotation = await draft.save();
  } else {
    quotation = await Quotation.create({
      ...payload,
      draft_details: undefined,
      version_number: nextVersion,
      status: "Sent",
    });
  }

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
    .sort({ createdAt: -1 })
    .lean();
  res.json(quotations);
});

// Get all quotations for an inquiry
exports.getQuotationsByInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.inquiryId);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  if (req.user?.role === "customer" && !verifyCustomerOwnership(inquiry, req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to this quotation" });
  }

  // A draft is unfinished admin work. The customer portal reads the newest
  // version straight off this list and lets the customer accept it, so a draft
  // reaching here would be an unfinished quotation they could agree to.
  const filter = { inquiry_id: req.params.inquiryId };
  if (req.user?.role === "customer") filter.status = { $ne: "Draft" };

  const quotations = await Quotation.find(filter).sort({ version_number: -1 }).lean();
  res.json(quotations);
});

// Get specific quotation
exports.getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id).populate("inquiry_id");
  if (!quotation) return res.status(404).json({ message: "Quotation not found" });

  if (req.user?.role === "customer" && !verifyCustomerOwnership(quotation.inquiry_id, req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to this quotation" });
  }

  if (req.user?.role === "customer" && quotation.status === "Draft") {
    return res.status(404).json({ message: "Quotation not found" });
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

  // A draft was never issued, so there is nothing here to respond to.
  if (quotation.status === "Draft") {
    return res.status(400).json({ message: "This quotation has not been sent yet." });
  }

  const inquiryId = quotation.inquiry_id?._id || quotation.inquiry_id;
  const existingApprovedPayment = await Payment.findOne({ inquiry_id: inquiryId, status: "approved" });
  if (existingApprovedPayment) {
    return res.status(400).json({ message: "This quotation/inquiry has already been paid and accepted." });
  }

  // Accepting reserves the date, and the deposit is what secures it. Quotations
  // issued before the deposit became required can still carry a zero, so the
  // rule is enforced here as well as at creation.
  if (!Number(quotation.deposit_amount) || Number(quotation.deposit_amount) <= 0) {
    return res.status(400).json({
      message:
        "This quotation has no deposit set, so it cannot be accepted yet. Message our team and we will send you an updated quotation.",
    });
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

  // A draft was never issued, so there is nothing here to respond to.
  if (quotation.status === "Draft") {
    return res.status(400).json({ message: "This quotation has not been sent yet." });
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

  // A draft was never issued, so there is nothing here to respond to.
  if (quotation.status === "Draft") {
    return res.status(400).json({ message: "This quotation has not been sent yet." });
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
