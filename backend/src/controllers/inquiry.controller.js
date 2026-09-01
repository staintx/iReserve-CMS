const Inquiry = require("../models/Inquiry");
const Quotation = require("../models/Quotation");
const Package = require("../models/Package");
const BlockedDate = require("../models/BlockedDate");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");
const { checkInventoryAvailability } = require("./booking.controller");
const uploadToCloudinary = require("../utils/cloudinaryUpload");
const {
  SERVICE_TYPES,
  cateringRequested,
  serviceTypeForRequest,
} = require("../utils/catering");
const BusinessInfo = require("../models/BusinessInfo");
const {
  resolveMenuSelection,
  resolveServiceItems,
  resolveScaffold,
  resolveInventoryItems,
  estimatedTotalForRequest,
} = require("../utils/requestSelections");
const {
  BOOKING_TYPES,
  isSpecialOffer,
  bookingTypeForPackage,
  offerGuestCount,
  offerBaseFoodPrice,
  normalizeOfferSelection,
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
    const requestedGuests = Math.max(1, Number(payload.guest_count) || offerGuestCount(pkg) || 1);
    const problem = offerBookingProblem(pkg, requestedGuests);
    if (problem) {
      return res.status(400).json({ message: problem });
    }

    payload.guest_count = requestedGuests;
    payload.include_food = true;

    // Service type and delivery method
    if (payload.service_type === SERVICE_TYPES.FULL_SERVICE || payload.delivery_method === "setup") {
      payload.service_type = SERVICE_TYPES.FULL_SERVICE;
      payload.delivery_method = "setup";
    } else if (payload.delivery_method === "pickup") {
      payload.service_type = SERVICE_TYPES.FOOD_ONLY;
      payload.delivery_method = "pickup";
    } else {
      payload.service_type = SERVICE_TYPES.FOOD_ONLY;
      payload.delivery_method = "delivery";
    }

    // The dishes this combo is sold with, settled course by course against the
    // combo itself: the customer's pick where they made one, the course's own
    // dishes where it includes them automatically. Never the raw list the
    // browser sent — see normalizeOfferSelection.
    payload.offer_food_snapshot = normalizeOfferSelection(
      pkg,
      payload.offer_food_snapshot,
    );

    payload.selected_menu = [];
    payload.offer_base_price = offerBaseFoodPrice(pkg, requestedGuests);

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

  // Validate minimum lead time: require at least 3 full buffer days between today and event date
  if (payload.event_date) {
    const parsedDate = new Date(payload.event_date);
    if (!isNaN(parsedDate.getTime())) {
      const eventStart = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
      const now = new Date();
      const minAllowed = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4);
      if (eventStart < minAllowed) {
        return res.status(400).json({
          message: "Event date must be at least 3 full days in advance to allow for catering and event preparation."
        });
      }
    }
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

  const inqIds = inquiries.map(i => i._id);
  const convertedBookingIds = inquiries.map(i => i.converted_booking_id).filter(Boolean);

  const [approvedPayments, bookings, quotations] = await Promise.all([
    Payment.find({
      $or: [
        { inquiry_id: { $in: inqIds }, status: "approved" },
        ...(convertedBookingIds.length > 0 ? [{ booking_id: { $in: convertedBookingIds }, status: "approved" }] : [])
      ]
    }).lean(),
    convertedBookingIds.length > 0 ? Booking.find({ _id: { $in: convertedBookingIds } }).lean() : [],
    Quotation.find({ inquiry_id: { $in: inqIds }, status: { $ne: "Draft" } }).sort({ version_number: -1 }).lean(),
  ]);

  const approvedInquiryMap = new Map();
  approvedPayments.forEach(p => {
    if (p.inquiry_id) approvedInquiryMap.set(String(p.inquiry_id), p);
    if (p.booking_id) approvedInquiryMap.set(String(p.booking_id), p);
  });

  const quotationMap = new Map();
  quotations.forEach(q => {
    const inqIdStr = String(q.inquiry_id);
    if (!quotationMap.has(inqIdStr)) {
      quotationMap.set(inqIdStr, q);
    }
  });

  const bookingMap = new Map(bookings.map(b => [String(b._id), b]));
  const inqIdsToUpdate = [];

  // Requests submitted before booking_type existed still have to identify
  // themselves. Resolved from the same relation, never from the name.
  inquiries.forEach((inquiry) => {
    if (!inquiry.booking_type) {
      inquiry.booking_type = inquiry.package_id
        ? bookingTypeForPackage(inquiry.package_id)
        : BOOKING_TYPES.CUSTOM;
    }

    const latestQuote = quotationMap.get(String(inquiry._id));
    if (latestQuote) {
      inquiry.total_price = Number(latestQuote.total_cost) || inquiry.total_price || 0;
      inquiry.deposit_amount = Number(latestQuote.deposit_amount) || 0;
      inquiry.quotation_expiration_date = latestQuote.expiration_date || null;
      inquiry.quotation_status = latestQuote.status || null;
    }

    const booking = inquiry.converted_booking_id ? bookingMap.get(String(inquiry.converted_booking_id)) : null;
    const hasApprovedPayment = approvedInquiryMap.has(String(inquiry._id)) || (booking && approvedInquiryMap.has(String(booking._id)));
    const bookingIsPaid = booking && ["deposit_paid", "fully_paid"].includes(booking.payment_status);

    if (hasApprovedPayment || bookingIsPaid || inquiry.payment_status === "deposit_paid" || inquiry.payment_status === "fully_paid") {
      inquiry.payment_status = (booking && booking.payment_status === "fully_paid") ? "fully_paid" : (inquiry.payment_status === "fully_paid" ? "fully_paid" : "deposit_paid");
      inquiry.is_deposit_paid = true;
      inqIdsToUpdate.push(inquiry._id);
    }
  });

  if (inqIdsToUpdate.length > 0) {
    Inquiry.updateMany(
      { _id: { $in: inqIdsToUpdate }, payment_status: { $in: ["unpaid", "pending", null] } },
      { payment_status: "deposit_paid" }
    ).catch(() => {});
  }

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

  // Only transition status to "Under Review" when an admin/staff actually opens/views an ACTIVE (unarchived) inquiry details
  if (
    ["admin", "staff", "manager"].includes(req.user?.role) &&
    rawInquiry.status === "Pending Review" &&
    !rawInquiry.archived
  ) {
    rawInquiry.status = "Under Review";
    await rawInquiry.save();
    inquiry.status = "Under Review";

    const io = req.app.get("io");
    if (io) io.emit("system:refresh", { type: "inquiry", action: "update", id: rawInquiry._id });
  }
  
  const inquiryObj = inquiry.toObject();
  inquiryObj.had_package_selection = hadPackageSelection;

  const [approvedPayment, latestQuote] = await Promise.all([
    Payment.findOne({
      $or: [
        { inquiry_id: inquiry._id, status: "approved" },
        ...(inquiry.converted_booking_id ? [{ booking_id: inquiry.converted_booking_id, status: "approved" }] : [])
      ]
    }).lean(),
    Quotation.findOne({ inquiry_id: inquiry._id, status: { $ne: "Draft" } }).sort({ version_number: -1 }).lean()
  ]);

  if (latestQuote) {
    inquiryObj.total_price = Number(latestQuote.total_cost) || inquiryObj.total_price || 0;
    inquiryObj.deposit_amount = Number(latestQuote.deposit_amount) || 0;
    inquiryObj.quotation_expiration_date = latestQuote.expiration_date || null;
    inquiryObj.quotation_status = latestQuote.status || null;
  }

  if (approvedPayment || inquiry.payment_status === "deposit_paid" || inquiry.payment_status === "fully_paid") {
    inquiryObj.payment_status = inquiry.payment_status === "fully_paid" ? "fully_paid" : "deposit_paid";
    inquiryObj.is_deposit_paid = true;
    if (rawInquiry.payment_status !== "deposit_paid" && rawInquiry.payment_status !== "fully_paid") {
      rawInquiry.payment_status = "deposit_paid";
      await rawInquiry.save();
    }
  }

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

/**
 * What a customer may change on their own request while it is still a draft.
 *
 * Two kinds of field appear below. Most are plain answers stored as sent —
 * a date, an address, a phone number. The selections at the end name things
 * from a catalogue, and none of them is stored as sent: each is re-derived
 * against the package or catalogue it came from, further down, so choosing
 * *which* dish or add-on is the customer's decision while *what it is and what
 * it costs* stays the server's (see utils/requestSelections.js).
 *
 * Everything absent is absent on purpose and is not read from the body no
 * matter what is sent: the package the request was made against, the equipment
 * its setup reserves, every price, the status, the archive flag, and the
 * `is_custom_setup` decision — switching a request between a package build and
 * a bespoke one is a different request, not an edit to this one.
 */
const CUSTOMER_EDITABLE_FIELDS = [
  "event_type",
  "booking_for",
  "celebrant_name",
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

  // Selections. Re-derived, never stored as sent.
  "selected_menu",
  "service_items",
  "offer_food_snapshot",
  "selected_scaffold_option_id",
  "custom_setup_scope",
  "custom_setup_notes",
  "budget_range",
  "inspiration_images",
];

/**
 * Selections that only mean something on a request that already has the thing
 * they describe. A customer cannot acquire a bespoke setup by sending notes
 * for one, so these are read only when the request is already bespoke.
 */
const CUSTOM_SETUP_FIELDS = ["custom_setup_scope", "custom_setup_notes", "inspiration_images"];

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

  // Bespoke-setup answers belong to a bespoke request. On any other request
  // they are not an edit, they are an attempt to become one.
  if (!inquiry.is_custom_setup) {
    CUSTOM_SETUP_FIELDS.forEach((field) => delete updates[field]);
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

  /**
   * Selections are settled against the catalogue they came from, so an edit
   * goes through every guardrail submission does. What the customer chose is
   * honoured; what they claimed it is, is not.
   *
   * The package is loaded once, because everything below is derived from it:
   * which dishes and add-ons were on offer, what a scaffold size measures and
   * costs, what equipment the setup reserves, and what a combo's food is.
   */
  const pkg = inquiry.package_id ? await Package.findById(inquiry.package_id) : null;

  /**
   * A package that has been taken down since the request was made.
   *
   * Everything derived from a package derives to *nothing* when the package is
   * gone — an empty combo menu, a cleared footprint, no equipment — so
   * re-deriving here would quietly erase what the customer was actually sold,
   * on an edit as innocent as correcting a phone number. What the request
   * recorded is the record of the sale and stays exactly as it is; the admin
   * already sees the "no longer available" warning on the details page.
   */
  const packageGone = Boolean(inquiry.package_id) && !pkg;

  if (Object.prototype.hasOwnProperty.call(updates, "selected_menu")) {
    updates.selected_menu = await resolveMenuSelection(updates.selected_menu);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "service_items")) {
    updates.service_items = await resolveServiceItems(
      updates.service_items,
      pkg,
      inquiry.service_items,
    );
  }

  // Service type is derived from the catering answer, never trusted raw — the
  // same helper createInquiry uses. Re-run whenever the answer *or* the dishes
  // move, because emptying the menu is the customer withdrawing catering just
  // as much as changing the service type is.
  if (
    Object.prototype.hasOwnProperty.call(updates, "service_type") ||
    Object.prototype.hasOwnProperty.call(updates, "selected_menu")
  ) {
    const merged = { ...inquiry.toObject(), ...updates };
    updates.include_food = cateringRequested(merged);
    updates.service_type = serviceTypeForRequest(merged);
    if (!updates.include_food) updates.selected_menu = [];
  }

  // The footprint is the package option's, not the request's: the request
  // records only which size was chosen.
  if (!packageGone && Object.prototype.hasOwnProperty.call(updates, "selected_scaffold_option_id")) {
    Object.assign(updates, resolveScaffold(updates.selected_scaffold_option_id, pkg));
  } else {
    delete updates.selected_scaffold_option_id;
  }

  // Equipment follows the setup rather than being chosen, so it is re-derived
  // whenever the setup it belongs to moves.
  const setupChanged =
    Object.prototype.hasOwnProperty.call(updates, "selected_scaffold_option_id") ||
    Object.prototype.hasOwnProperty.call(updates, "service_type");
  if (!packageGone && setupChanged) {
    updates.inventory_items = resolveInventoryItems(pkg, {
      ...inquiry.toObject(),
      ...updates,
    });
  }

  /**
   * A combo's food and price. The dishes are settled course by course against
   * the combo itself — the same call `createInquiry` makes — so an edit cannot
   * put food on a combo that the combo does not offer, and the price follows
   * from the combo rather than from the request.
   *
   * The boundary is re-applied last: a combo sells food, so it carries no
   * scaffold and no equipment however this edit arrived.
   */
  if (inquiry.booking_type === "special") {
    if (packageGone) {
      // Nothing to settle the food against. What was sold stands.
      delete updates.offer_food_snapshot;
    } else {
      if (Object.prototype.hasOwnProperty.call(updates, "offer_food_snapshot")) {
        updates.offer_food_snapshot = normalizeOfferSelection(
          pkg,
          updates.offer_food_snapshot,
        );
      }
      updates.offer_base_price = offerBaseFoodPrice(pkg, inquiry.guest_count);
    }
    updates.selected_menu = [];
    applyComboRequestBoundary(updates);
  } else {
    delete updates.offer_food_snapshot;
  }

  /**
   * What the customer is now looking at. Recomputed from the server's own
   * figures rather than accepted from the browser, so the estimate the admin
   * reads always matches the selections printed beside it.
   */
  if (!packageGone) {
    const businessInfo = await BusinessInfo.findOne().lean();
    updates.estimated_total = estimatedTotalForRequest({
      request: { ...inquiry.toObject(), ...updates },
      pkg,
      offerBasePrice: updates.offer_base_price || inquiry.offer_base_price || 0,
      businessInfoPrice: businessInfo?.custom_event_setup_price,
    });
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
