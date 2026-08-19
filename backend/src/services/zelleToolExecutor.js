const mongoose = require("mongoose");
const Package = require("../models/Package");
const MenuItem = require("../models/MenuItem");
const Addon = require("../models/Addon");
const BlockedDate = require("../models/BlockedDate");
const BusinessInfo = require("../models/BusinessInfo");
const Inquiry = require("../models/Inquiry");
const Quotation = require("../models/Quotation");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Inventory = require("../models/Inventory");
const Rating = require("../models/Rating");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { notifyAdmins } = require("../utils/notify");

/**
 * Execute approved tool call by name
 */
async function executeTool(toolName, params = {}, { user, io } = {}) {
  try {
    switch (toolName) {
      // -------------------------------------------------------------
      // CUSTOMER & SHARED TOOLS
      // -------------------------------------------------------------
      case "get_packages": {
        const query = { available: true };
        if (params.event_type) {
          query.event_type = new RegExp(params.event_type, "i");
        }
        if (params.offer_type) {
          query.offer_type = params.offer_type;
        }
        if (params.service_type) {
          query.package_type = new RegExp(params.service_type, "i");
        }

        const packages = await Package.find(query)
          .select(
            "name description price_per_guest guest_min guest_max price_label setup_price features inclusions offer_type package_type service_type image_url"
          )
          .limit(10)
          .lean();

        return {
          count: packages.length,
          packages: packages.map((p) => ({
            id: p._id,
            name: p.name,
            offer_type: p.offer_type,
            package_type: p.package_type || p.service_type,
            price_per_guest: p.price_per_guest ? `₱${p.price_per_guest.toLocaleString()}/person` : null,
            setup_price: p.setup_price ? `₱${p.setup_price.toLocaleString()}` : null,
            guest_capacity: `${p.guest_min || 50} - ${p.guest_max || 200} guests`,
            description: p.description,
            inclusions: (p.inclusions || []).slice(0, 5),
            features: (p.features || []).slice(0, 5),
          })),
        };
      }

      case "get_package_details": {
        let pkg = null;
        if (mongoose.Types.ObjectId.isValid(params.package_name_or_id)) {
          pkg = await Package.findById(params.package_name_or_id)
            .populate("menu_items", "name category price")
            .populate("offer_menu_rules.menu_items", "name category")
            .lean();
        }
        if (!pkg && params.package_name_or_id) {
          pkg = await Package.findOne({
            name: new RegExp(params.package_name_or_id, "i"),
          })
            .populate("menu_items", "name category price")
            .populate("offer_menu_rules.menu_items", "name category")
            .lean();
        }

        if (!pkg) {
          return { error: `Package '${params.package_name_or_id}' was not found.` };
        }

        return {
          id: pkg._id,
          name: pkg.name,
          offer_type: pkg.offer_type,
          package_type: pkg.package_type,
          price_per_guest: pkg.price_per_guest ? `₱${pkg.price_per_guest.toLocaleString()}` : null,
          setup_price: pkg.setup_price ? `₱${pkg.setup_price.toLocaleString()}` : null,
          guest_range: `${pkg.guest_min || 0} - ${pkg.guest_max || 0} guests`,
          description: pkg.fullDescription || pkg.description,
          inclusions: pkg.inclusions,
          features: pkg.features,
          available_scaffold_sizes: (pkg.scaffold_size_options || []).map((s) => ({
            label: s.label,
            dimensions: `${s.width_ft}x${s.length_ft} ft (${s.area_ft2} sq ft)`,
            free_setup: s.free_setup,
          })),
        };
      }

      case "get_menu_items": {
        const query = { available: true };
        if (params.category) {
          query.category = new RegExp(params.category, "i");
        }
        if (params.search) {
          query.name = new RegExp(params.search, "i");
        }

        const items = await MenuItem.find(query)
          .select("name category description price")
          .limit(20)
          .lean();

        return {
          count: items.length,
          items: items.map((i) => ({
            id: i._id,
            name: i.name,
            category: i.category,
            description: i.description,
            price: i.price ? `₱${i.price.toLocaleString()}` : "Included in package",
          })),
        };
      }

      case "get_available_addons": {
        const query = { available: true };
        if (params.search) {
          query.name = new RegExp(params.search, "i");
        }
        const addons = await Addon.find(query).limit(15).lean();
        return {
          count: addons.length,
          addons: addons.map((a) => ({
            id: a._id,
            name: a.name,
            price: a.price ? `₱${a.price.toLocaleString()}` : "Upon Request",
            pricing_type: a.pricing_type,
            description: a.description,
          })),
        };
      }

      case "check_date_availability": {
        const targetDate = new Date(params.date);
        if (isNaN(targetDate.getTime())) {
          return { error: "Invalid date format. Please use YYYY-MM-DD." };
        }

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Check blocked dates
        const blocked = await BlockedDate.findOne({
          date: { $gte: startOfDay, $lte: endOfDay },
        }).lean();

        if (blocked) {
          return {
            date: params.date,
            is_available: false,
            reason: blocked.reason || "Blocked by catering management for private operations or full booking.",
            can_accept_inquiry: false,
          };
        }

        // 2. Check existing bookings
        const activeBookingsCount = await Booking.countDocuments({
          event_date: { $gte: startOfDay, $lte: endOfDay },
          status: { $nin: ["Cancelled", "cancelled", "refunded"] },
        });

        const bizInfo = await BusinessInfo.findOne().lean();
        const maxPerDay = bizInfo?.max_bookings_per_day || 2;

        const isFull = activeBookingsCount >= maxPerDay;

        return {
          date: params.date,
          is_available: !isFull,
          active_bookings: activeBookingsCount,
          max_capacity: maxPerDay,
          can_accept_inquiry: !isFull,
          message: isFull
            ? `We have reached maximum booking capacity (${maxPerDay} events) for this date.`
            : `The date ${params.date} is OPEN! We currently have ${activeBookingsCount} booked out of ${maxPerDay} allowed events.`,
        };
      }

      case "get_business_info": {
        const info = await BusinessInfo.findOne().lean();
        return {
          business_name: info?.business_name || "Caezelle's Catering Services",
          contact_number: info?.contact_number || "0917-XXX-XXXX",
          email: info?.email || "info@caezelles.com",
          address: info?.address || "Calamba, Laguna",
          operating_hours: info?.hours || "Mon - Sat: 8:00 AM - 6:00 PM",
          deposit_policy: `A ${info?.deposit_percentage || 20}% initial deposit is required upon quotation approval to lock in the reservation.`,
        };
      }

      case "get_my_inquiries": {
        if (!user) {
          return { error: "Authentication required to view your inquiries. Please log in." };
        }
        const inquiries = await Inquiry.find({ customer_id: user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("package_id", "name")
          .lean();

        return {
          count: inquiries.length,
          inquiries: inquiries.map((inq) => ({
            reference: inq.reference,
            event_type: inq.event_type,
            event_date: inq.event_date ? new Date(inq.event_date).toLocaleDateString() : "TBD",
            guest_count: inq.guest_count,
            package_name: inq.package_id?.name || inq.package_name_snapshot || "Custom Request",
            status: inq.status,
            created_at: inq.createdAt,
          })),
        };
      }

      case "get_my_quotations": {
        if (!user) {
          return { error: "Authentication required to view your quotations. Please log in." };
        }
        const userInquiries = await Inquiry.find({ customer_id: user._id }).select("_id").lean();
        const inqIds = userInquiries.map((i) => i._id);

        const quotations = await Quotation.find({ inquiry_id: { $in: inqIds } })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        return {
          count: quotations.length,
          quotations: quotations.map((q) => ({
            quotation_number: q.quotation_number,
            package_name: q.package_name,
            guest_count: q.guest_count,
            total_cost: `₱${(q.total_cost || 0).toLocaleString()}`,
            deposit_amount: `₱${(q.deposit_amount || 0).toLocaleString()}`,
            remaining_balance: `₱${(q.remaining_balance || 0).toLocaleString()}`,
            status: q.status,
            expiration_date: q.expiration_date,
          })),
        };
      }

      case "get_my_bookings": {
        if (!user) {
          return { error: "Authentication required to view your bookings. Please log in." };
        }
        const bookings = await Booking.find({ customer_id: user._id })
          .sort({ event_date: -1 })
          .limit(5)
          .lean();

        return {
          count: bookings.length,
          bookings: bookings.map((b) => ({
            reference: b.reference,
            event_type: b.event_type,
            event_date: new Date(b.event_date).toLocaleDateString(),
            guest_count: b.guest_count,
            status: b.status,
            total_price: b.total_price ? `₱${b.total_price.toLocaleString()}` : "N/A",
            payment_status: b.payment_status,
          })),
        };
      }

      case "get_my_payment_status": {
        if (!user) {
          return { error: "Authentication required. Please log in." };
        }
        let bookingQuery = { customer_id: user._id };
        if (params.booking_reference_or_id) {
          if (mongoose.Types.ObjectId.isValid(params.booking_reference_or_id)) {
            bookingQuery._id = params.booking_reference_or_id;
          } else {
            bookingQuery.reference = params.booking_reference_or_id;
          }
        }

        const booking = await Booking.findOne(bookingQuery).sort({ createdAt: -1 }).lean();
        
        if (!booking) {
          // Check if there is an inquiry/quotation awaiting deposit
          const quotation = await Quotation.findOne({ customer_id: user._id, status: { $in: ["sent", "accepted"] } })
            .sort({ createdAt: -1 })
            .lean();

          if (quotation) {
            const depositDue = quotation.deposit_amount || Math.round((quotation.total_cost || 0) * 0.2);
            return {
              booking_id: null,
              quotation_id: quotation._id,
              booking_reference: quotation.quotation_number || "QUOTATION",
              event_type: quotation.package_name || "Catering Event",
              event_date: quotation.expiration_date ? new Date(quotation.expiration_date).toLocaleDateString() : "Upcoming",
              status_badge: "DEPOSIT REQUIRED",
              is_up_to_date: false,
              total_price: quotation.total_cost || 0,
              deposit_amount: depositDue,
              amount_due: depositDue,
              total_paid: 0,
              remaining_balance: quotation.total_cost || 0,
              payment_status: "Pending Deposit",
              pay_label: "Pay Deposit with iReserve Pay",
              pay_url: `/customer/payments?quote_id=${quotation._id}`,
              statement_doc: {
                title: `Quotation_${quotation.quotation_number || "Draft"}.pdf`,
                type: "pdf",
              },
              breakdown: [
                { label: "Package Base Fee", amount: quotation.starting_price || quotation.total_cost || 0 },
                { label: "Add-ons & Enhancements", amount: (quotation.total_cost || 0) - (quotation.starting_price || quotation.total_cost || 0) },
                { label: "Deposit Required (20%)", amount: depositDue, is_highlight: true },
              ],
              payment_history: [],
            };
          }

          return { message: "No active bookings or pending quotation deposits found for your account." };
        }

        const payments = await Payment.find({ booking_id: booking._id }).sort({ createdAt: -1 }).lean();
        const paidAmount = payments
          .filter((p) => p.status === "completed" || p.status === "paid" || p.status === "approved")
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const totalPrice = booking.total_price || 0;
        const remainingBalance = Math.max(0, totalPrice - paidAmount);
        const isUpToDate = remainingBalance <= 0;

        const paymentHistory = payments.map((p) => ({
          date: new Date(p.createdAt || Date.now()).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          amount: `₱${Number(p.amount || 0).toLocaleString()}`,
          status: (p.status || "completed").toUpperCase(),
          reference: p.reference_number || `PM-${String(p._id).slice(-6).toUpperCase()}`,
        }));

        return {
          booking_id: booking._id,
          booking_reference: booking.reference,
          event_type: booking.event_type,
          event_date: new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          status_badge: isUpToDate ? "UP TO DATE" : "PAYMENT DUE",
          is_up_to_date: isUpToDate,
          total_price: totalPrice,
          total_paid: paidAmount,
          remaining_balance: remainingBalance,
          amount_due: remainingBalance > 0 ? remainingBalance : 0,
          payment_status: booking.payment_status || (isUpToDate ? "Paid in Full" : "Pending Balance"),
          pay_label: "Continue with iReserve Pay",
          pay_url: `/customer/payments?booking_id=${booking._id}`,
          statement_doc: {
            title: `Statement_EVT_${booking.reference}.pdf`,
            type: "pdf",
          },
          breakdown: [
            { label: "Total Event Contract", amount: totalPrice },
            { label: "Total Amount Settled", amount: paidAmount },
            { label: "Remaining Balance Due", amount: remainingBalance, is_highlight: true },
          ],
          payment_history: paymentHistory,
        };
      }

      case "create_inquiry_draft": {
        if (!user) {
          return {
            success: false,
            requires_login: true,
            message: "To save and submit your inquiry draft, please log in or sign up. Your drafted details will be linked to your account!",
          };
        }

        const parsedDate = new Date(params.event_date);
        if (isNaN(parsedDate.getTime())) {
          return { success: false, message: "Invalid event date." };
        }

        let pkg = null;
        if (params.package_id && mongoose.Types.ObjectId.isValid(params.package_id)) {
          pkg = await Package.findById(params.package_id);
        }

        const inquiryData = {
          customer_id: user._id,
          package_id: pkg?._id || null,
          package_name_snapshot: pkg?.name || "Custom Draft",
          booking_type: pkg?.offer_type === "special" ? "special" : pkg ? "regular" : "custom",
          event_type: params.event_type,
          event_date: parsedDate,
          start_time: params.start_time || "12:00 PM",
          guest_count: Number(params.guest_count) || 50,
          service_type: params.service_type || "Food and Event Setup",
          include_food: params.service_type !== "Event Setup Only",
          budget_range: params.budget_range || "",
          province: params.province || "",
          municipality: params.municipality || "",
          street: params.street || "",
          special_requests: params.special_requests || "",
          contact_first_name: user.first_name || user.full_name?.split(" ")[0] || "Customer",
          contact_last_name: user.last_name || user.full_name?.split(" ").slice(1).join(" ") || "User",
          contact_email: user.email,
          contact_phone: user.phone || "09XXXXXXXXX",
          status: "Pending Review",
        };

        const inquiry = await Inquiry.create(inquiryData);

        await notifyAdmins({
          title: "New AI Guided Inquiry Draft",
          body: `A new inquiry draft (${inquiry.reference}) for ${inquiry.event_type} (${inquiry.guest_count} guests) was submitted via Zelle AI.`,
          type: "new_inquiry",
          link: "/admin/bookings/inquiries",
        });

        if (io) {
          io.emit("system:refresh", { type: "inquiry", action: "create", id: inquiry._id });
        }

        return {
          success: true,
          inquiry_id: inquiry._id,
          reference: inquiry.reference,
          message: `Inquiry draft ${inquiry.reference} has been successfully submitted! Our team will review your requirements and prepare an official quotation.`,
          details: {
            reference: inquiry.reference,
            event_type: inquiry.event_type,
            guest_count: inquiry.guest_count,
            event_date: inquiry.event_date.toLocaleDateString(),
            status: "Pending Review",
          },
        };
      }

      // -------------------------------------------------------------
      // ADMIN-ONLY TOOLS
      // -------------------------------------------------------------
      case "get_inquiry": {
        let query = {};
        if (mongoose.Types.ObjectId.isValid(params.inquiry_id_or_reference)) {
          query._id = params.inquiry_id_or_reference;
        } else {
          query.reference = params.inquiry_id_or_reference;
        }

        const inq = await Inquiry.findOne(query)
          .populate("customer_id", "full_name email phone")
          .populate("package_id")
          .populate("selected_menu", "name category")
          .lean();

        if (!inq) return { error: "Inquiry not found." };
        return inq;
      }

      case "search_inquiries": {
        let query = {};
        if (params.status) query.status = params.status;
        if (params.search) {
          query.$or = [
            { reference: new RegExp(params.search, "i") },
            { contact_first_name: new RegExp(params.search, "i") },
            { contact_last_name: new RegExp(params.search, "i") },
            { event_type: new RegExp(params.search, "i") },
          ];
        }
        const inquiries = await Inquiry.find(query).sort({ createdAt: -1 }).limit(10).lean();
        return {
          count: inquiries.length,
          inquiries: inquiries.map((i) => ({
            id: i._id,
            reference: i.reference,
            customer: `${i.contact_first_name} ${i.contact_last_name}`,
            event: `${i.event_type} (${i.guest_count} pax)`,
            date: i.event_date ? new Date(i.event_date).toLocaleDateString() : "TBD",
            status: i.status,
          })),
        };
      }

      case "check_inventory_levels": {
        let query = {};
        if (params.search) {
          query.name = new RegExp(params.search, "i");
        }
        const items = await Inventory.find(query).limit(15).lean();
        return {
          count: items.length,
          items: items.map((i) => ({
            id: i._id,
            name: i.name,
            category: i.category,
            quantity_total: i.quantity,
            available_stock: i.quantity,
          })),
        };
      }

      case "draft_quotation": {
        const inq = await Inquiry.findById(params.inquiry_id).lean();
        if (!inq) return { error: "Inquiry not found." };

        let pkg = null;
        if (params.package_id && mongoose.Types.ObjectId.isValid(params.package_id)) {
          pkg = await Package.findById(params.package_id).lean();
        } else if (inq.package_id) {
          pkg = await Package.findById(inq.package_id).lean();
        }

        if (!pkg && inq.event_type) {
          pkg = await Package.findOne({
            available: true,
            event_type: new RegExp(inq.event_type, "i"),
          }).lean();
        }

        if (!pkg) {
          pkg = await Package.findOne({ available: true }).lean();
        }

        const guestCount = inq.guest_count || 50;
        let basePackagePrice = 0;

        if (pkg) {
          if (pkg.price_per_guest) {
            basePackagePrice = pkg.price_per_guest * guestCount;
          } else if (pkg.setup_price) {
            basePackagePrice = pkg.setup_price;
          }
        }

        // Fetch real addons from DB
        const availableAddons = await Addon.find({ available: true }).limit(4).lean();
        const recommendedAddons = availableAddons.slice(0, 2).map((a) => ({
          name: a.name,
          price: a.price || 2500,
          pricing_type: a.pricing_type || "fixed",
        }));

        const addonsTotal = recommendedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
        const estimatedTotal = basePackagePrice + addonsTotal;
        const depositPercentage = 0.2; // 20% default

        return {
          inquiry_id: inq._id,
          customer_name: `${inq.contact_first_name} ${inq.contact_last_name}`,
          recommended_package: pkg?.name || "Full Package",
          package_id: pkg?._id || null,
          starting_price: basePackagePrice,
          inclusions: pkg?.inclusions || ["Complete Buffet Setup", "Service Crew", "Chafing Dishes"],
          guest_count: guestCount,
          estimated_package_cost: basePackagePrice,
          recommended_addons: recommendedAddons,
          addons_total: addonsTotal,
          estimated_total: estimatedTotal,
          deposit_amount: Math.round(estimatedTotal * depositPercentage),
          admin_notes: `AI Suggestion: Tailored for ${inq.event_type || "Event"} (${guestCount} guests)${
            inq.budget_range ? ` matching budget estimate ${inq.budget_range}` : ""
          }.${inq.special_requests ? ` Notes: ${inq.special_requests}` : ""}`,
        };
      }

      case "draft_response": {
        const conv = await Conversation.findById(params.conversation_id)
          .populate("customer_id", "first_name full_name")
          .lean();
        if (!conv) return { error: "Conversation not found." };

        const recentMessages = await Message.find({ conversation_id: conv._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        return {
          customer_name: conv.customer_id?.first_name || "Customer",
          last_customer_message: recentMessages[0]?.body || "",
          context: params.intent_notes || "Polite status update",
        };
      }

      case "summarize_feedback": {
        const days = params.days || 90;
        const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const ratings = await Rating.find({ createdAt: { $gte: sinceDate } })
          .populate("customer_id", "full_name")
          .lean();

        const totalReviews = ratings.length;
        const avgRating = totalReviews
          ? ratings.reduce((sum, r) => sum + (r.stars || 5), 0) / totalReviews
          : 5.0;

        const reviews = ratings.map((r) => r.review).filter(Boolean);

        return {
          total_reviews: totalReviews,
          average_rating: Number(avgRating.toFixed(1)),
          sample_reviews: reviews.slice(0, 10),
          summary_period: `Last ${days} days`,
        };
      }

      default:
        return { error: `Tool '${toolName}' is not supported.` };
    }
  } catch (err) {
    console.error(`Tool execution error for '${toolName}':`, err);
    return { error: err.message || "Failed to execute tool." };
  }
}

module.exports = {
  executeTool,
};
