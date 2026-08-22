const Inquiry = require("../models/Inquiry");
const Package = require("../models/Package");
const BlockedDate = require("../models/BlockedDate");
const asyncHandler = require("../utils/asyncHandler");
const { checkInventoryAvailability } = require("./booking.controller");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const {
  SERVICE_TYPES,
  cateringRequested,
  serviceTypeForRequest,
} = require("../utils/catering");
const {
  BOOKING_TYPES,
  isSpecialOffer,
  bookingTypeForPackage,
  offerGuestCount,
  offerBaseFoodPrice,
  offerFoodSnapshot,
  offerBookingProblem,
  applyComboRequestBoundary,
} = require("../utils/specialOffers");

// Customer submits a new inquiry
exports.createInquiry = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    customer_id: req.user?._id || req.body.customer_id,
    status: "Pending Review",
  };

  /**
   * What kind of request this is, decided from the package relation rather
   * than from anything the browser asserted. The admin Inquiries list reads
   * this, so it has to be the server's own answer.
   */
  const pkg = payload.package_id
    ? await Package.findById(payload.package_id)
    : null;

  if (payload.package_id && !pkg) {
    return res.status(400).json({
      message: "The package for this request no longer exists. Please choose another.",
    });
  }

  payload.booking_type = bookingTypeForPackage(pkg);
  payload.package_name_snapshot = pkg?.name || "";

  // The catering answer decides the service type, not the package the customer
  // started from. Derived here as well as in the wizard so what is stored says
  // the same thing whatever the client sent: a request that includes food is
  // "Food and Event Setup" even if it began life on an Event Setup Only
  // package, and one without food carries no menu.
  payload.include_food = cateringRequested(payload);
  payload.service_type = serviceTypeForRequest(payload);
  if (!payload.include_food) payload.selected_menu = [];

  /**
   * Special Offers. A combo is a fixed meal for a fixed number of guests at a
   * fixed price per pax, so the server settles all three from the combo itself
   * rather than from anything the browser sent: the guest count is the combo's,
   * the food is the combo's, and the price follows from the two.
   *
   * A combo is food and nothing else, so the event-space answers a setup
   * booking carries — which scaffold size, how big, what it cost — are dropped
   * rather than stored against a request that never had a setup to size.
   */
  if (isSpecialOffer(pkg)) {
    const problem = offerBookingProblem(pkg, payload.guest_count);
    if (problem) {
      return res.status(400).json({ message: problem });
    }

    // The combo's own count, not the browser's. A request that arrived with a
    // different one was already rejected above; this is what makes the stored
    // count and the stored price impossible to disagree.
    payload.guest_count = offerGuestCount(pkg);

    // Food comes with the combo, so the catering question does not apply, and
    // there are no chosen dishes: the combo decides them.
    //
    // The service type says what is being sold, and a combo sells food — not an
    // event set-up it does not include. Whether our team stands in the venue is
    // a separate question, answered by `delivery_method` and read by
    // utils/venue.js, so calling this Food Only costs the booking nothing on
    // the conflict calendar.
    payload.include_food = true;
    payload.service_type = SERVICE_TYPES.FOOD_ONLY;
    payload.selected_menu = [];
    payload.offer_food_snapshot = offerFoodSnapshot(pkg);

    payload.offer_base_price = offerBaseFoodPrice(pkg);

    // Everything an event-space build would have answered, dropped in one
    // place — the boundary between the two kinds of request, defined once.
    applyComboRequestBoundary(payload);
  } else {
    // Only a Special Offer carries these. A regular or custom request that
    // sent them anyway must not have them stored.
    delete payload.offer_base_price;
    delete payload.offer_setup_price;
    delete payload.offer_food_snapshot;
  }

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
  
  const io = req.app.get("io");

  const { notifyAdmins } = require("../utils/notify");
  await notifyAdmins({
    title: "New Inquiry Submitted",
    body: `A new inquiry (${inquiry.reference}) has been submitted by ${inquiry.contact_first_name} ${inquiry.contact_last_name}.`,
    type: "new_inquiry",
    link: "/admin/bookings/inquiries"
  }, io);

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
    // The Booking Type column names the package or offer the request came
    // from, so the list has to carry the relation, not just its id.
    .populate("package_id", "name offer_type package_type")
    .lean();

  // Requests submitted before booking_type existed still have to identify
  // themselves. Resolved from the same relation, never from the name.
  inquiries.forEach((inquiry) => {
    if (!inquiry.booking_type) {
      inquiry.booking_type = inquiry.package_id
        ? bookingTypeForPackage(inquiry.package_id)
        : BOOKING_TYPES.CUSTOM;
    }
  });
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

// Requests still in this group have no quotation committed against them yet,
// so a customer correcting a detail is editing a working draft, not
// renegotiating a price. Once a quotation exists — "Revision Requested"
// included, which quotation.controller.js#requestRevision sets on the
// inquiry as a mirror of the quotation's own status — the admin is actively
// working from these details, so they stay locked and the customer goes
// through the quotation's own "Request Changes" flow instead.
const CUSTOMER_EDITABLE_STATUSES = ["Pending Review", "Under Review"];

// Event details only. Package, menu, pricing, scaffold/setup size, status, and
// every other admin-controlled field is deliberately left off this list, and
// nothing outside it is read from the request body no matter what is sent.
const CUSTOMER_EDITABLE_FIELDS = [
  "event_type",
  "event_date",
  "start_time",
  "duration_hours",
  "guest_count",
  "service_type",
  "venue_type",
  "province",
  "municipality",
  "barangay",
  "street",
  "landmark",
  "zip_code",
  "event_theme",
  "event_palette",
  "special_requests",
  "allergies",
  "dietary_restrictions",
  "delivery_method",
  "delivery_instructions",
  "contact_first_name",
  "contact_last_name",
  "contact_email",
  "contact_phone",
  "contact_alt_phone",
  "contact_method",
];

// A Special Offer's guest count, food, and service type belong to the combo,
// not the customer — the same invariant createInquiry enforces at submission
// time (see utils/specialOffers.js). Editing an inquiry must not let those
// drift out of sync with the combo it was booked against.
const OFFER_LOCKED_FIELDS = ["guest_count", "service_type"];

// Customer edits their own inquiry's event details, while it is still a
// working draft (pre-quotation). A generic passthrough like admin's
// updateInquiry would skip every guardrail createInquiry applies, so this
// re-derives/re-checks the same things: the catering-derived service type, the
// Special Offer boundary, and the blocked-date calendar.
exports.updateInquiryByCustomer = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

  const inquiryCustomerId = inquiry.customer_id?._id || inquiry.customer_id;
  if (String(inquiryCustomerId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden: You do not have access to this inquiry" });
  }

  if (!CUSTOMER_EDITABLE_STATUSES.includes(inquiry.status)) {
    return res.status(409).json({
      message: "This request can no longer be edited directly. Message us instead to request changes.",
    });
  }

  const updates = {};
  for (const field of CUSTOMER_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  if (inquiry.booking_type === "special") {
    const violated = OFFER_LOCKED_FIELDS.some(
      (field) =>
        Object.prototype.hasOwnProperty.call(updates, field) &&
        String(updates[field]) !== String(inquiry[field]),
    );
    if (violated) {
      return res.status(400).json({
        message: "The guest count and service type for a Special Offer are fixed by the combo and cannot be changed here. Cancel this request and submit a new one if you need something different.",
      });
    }
  }

  // Service type is derived from the catering answer, never trusted raw —
  // the same helper createInquiry uses.
  if (Object.prototype.hasOwnProperty.call(updates, "service_type")) {
    const merged = { ...inquiry.toObject(), ...updates };
    updates.include_food = cateringRequested(merged);
    updates.service_type = serviceTypeForRequest(merged);
  }

  const dateChanged =
    Object.prototype.hasOwnProperty.call(updates, "event_date") &&
    new Date(updates.event_date).getTime() !== new Date(inquiry.event_date).getTime();

  if (dateChanged) {
    const parsedDate = new Date(updates.event_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid event date." });
    }
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const blocked = await BlockedDate.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (blocked) {
      return res.status(400).json({
        message: `The selected date (${updates.event_date}) is blocked for inquiries and bookings (${blocked.reason || "Blocked by administration"}). Please select a different date.`,
      });
    }
  }

  updates.revision_count = (inquiry.revision_count || 0) + 1;

  Object.assign(inquiry, updates);
  await inquiry.save();

  const io = req.app.get("io");

  const { notifyAdmins } = require("../utils/notify");
  await notifyAdmins({
    title: "Inquiry Updated by Customer",
    body: `${inquiry.contact_first_name} ${inquiry.contact_last_name} updated the details on inquiry ${inquiry.reference}.`,
    type: "inquiry_updated",
    link: "/admin/bookings/inquiries",
    meta: { inquiry_id: inquiry._id },
  }, io);

  if (io) io.emit("system:refresh", { type: "inquiry", action: "update" });

  res.json(inquiry);
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
