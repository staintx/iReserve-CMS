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

    // Selected dishes snapshot: if sent by customer, keep customer's chosen dishes; else fallback to combo's defaults
    if (Array.isArray(payload.offer_food_snapshot) && payload.offer_food_snapshot.length > 0) {
      payload.offer_food_snapshot = payload.offer_food_snapshot
        .map((item) => ({
          menu_category: String(item.menu_category || "").trim(),
          item_name: String(item.item_name || "").trim(),
        }))
        .filter((item) => item.item_name);
    } else {
      payload.offer_food_snapshot = offerFoodSnapshot(pkg);
    }

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
