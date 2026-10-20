const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const StaffAvailability = require("../models/StaffAvailability");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const { checkStaffConflicts, APPROVED_AVAILABILITY_QUERY } = require("../utils/availabilityConflicts");
const logAction = require("../utils/logAction");
const { notifyAdmins, createNotification, getIo } = require("../utils/notify");

const parseMonth = (month) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthIndex] = month.split("-").map((value) => Number(value));
  return {
    start: new Date(year, monthIndex - 1, 1),
    end: new Date(year, monthIndex, 0, 23, 59, 59, 999)
  };
};

const parseDateKey = (value) => {
  const [year, monthIndex, day] = String(value).split("-").map((v) => Number(v));
  if (!year || !monthIndex || !day) return null;
  return new Date(Date.UTC(year, monthIndex - 1, day, 12, 0, 0));
};

const toDateKey = (date) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRangeList = (startDateStr, endDateStr) => {
  const dates = [];
  const start = parseDateKey(startDateStr);
  const end = parseDateKey(endDateStr);
  if (!start || !end) return dates;
  const curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

exports.getSummary = asyncHandler(async (req, res) => {
  const managerId = req.user._id;

  const bookings = await Booking.find({ event_manager_id: managerId })
    .populate("customer_id", "full_name first_name last_name email phone")
    .sort({ event_date: 1 })
    .lean();

  let assignedCount = 0;
  let completedCount = 0;

  const upcomingList = [];
  const calendarEvents = [];

  bookings.forEach((b) => {
    const isCompleted = ["Completed", "completed"].includes(b.status);
    const isCancelled = ["Cancelled", "cancelled", "refunded"].includes(b.status);

    const customerName = b.customer_id?.full_name 
      || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() 
      || "Customer";

    if (!isCancelled) {
      calendarEvents.push({
        id: b._id,
        customer: customerName,
        event_type: b.event_type,
        date: b.event_date,
        status: b.status,
        venue: b.venue_type || b.municipality || "Venue"
      });
    }

    const eventDate = b.event_date ? new Date(b.event_date) : null;
    const isPast = eventDate && !Number.isNaN(eventDate.getTime()) && (() => {
      const endOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);
      return new Date() > endOfDay;
    })();

    if (isCompleted || isPast) {
      completedCount += 1;
    } else if (!isCancelled) {
      assignedCount += 1;
      upcomingList.push(b);
    }
  });

  res.json({
    counts: {
      assigned: assignedCount,
      upcoming: upcomingList.length,
      completed: completedCount,
      pending: 0
    },
    quickActions: {
      pending: [],
      upcoming: upcomingList.slice(0, 10)
    },
    calendarEvents
  });
});

exports.getAvailability = asyncHandler(async (req, res) => {
  const month = String(req.query.month || "").trim();
  const range = month ? parseMonth(month) : null;

  const dateFilter = { user_id: req.user._id };
  if (range) {
    dateFilter.date = { $gte: range.start, $lte: range.end };
  } else if (req.query.upcoming === "true") {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    dateFilter.date = { $gte: today };
  }

  const [availability, assignments] = await Promise.all([
    StaffAvailability.find(dateFilter)
      .sort({ date: 1 })
      .populate("reviewed_by", "full_name role"),
    Booking.find({
      event_manager_id: req.user._id,
      ...(range ? { event_date: { $gte: range.start, $lte: range.end } } : {}),
      status: { $nin: ["Cancelled", "cancelled", "refunded"] }
    }).select("event_date status")
  ]);

  const approvedAvailability = availability.filter(
    (item) => !item.status || item.status === "approved"
  );
  const pendingAvailability = availability.filter(
    (item) => item.status === "pending"
  );

  res.json({
    month: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    unavailable: approvedAvailability.map((item) => toDateKey(item.date)),
    pending: pendingAvailability.map((item) => toDateKey(item.date)),
    records: availability.map((item) => ({
      _id: item._id,
      date: toDateKey(item.date),
      reason: item.reason || "",
      status: item.status || "approved",
      reviewed_by: item.reviewed_by?.full_name || null,
      reviewed_at: item.reviewed_at || null,
      rejection_reason: item.rejection_reason || "",
      request_id: item.request_id || null,
      created_at: item.createdAt
    })),
    assignments: assignments.map((booking) => ({
      date: booking.event_date,
      status: booking.status
    }))
  });
});

exports.setAvailability = asyncHandler(async (req, res) => {
  const { date, startDate, endDate, dates, reason, month } = req.body;
  const reasonText = typeof reason === "string" ? reason.trim() : "";

  if ((date || (startDate && endDate)) && !reasonText) {
    return res.status(400).json({ message: "Reason / Notes is required for recording unavailability." });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const notifyAdminReviewers = async (dateDesc) => {
    try {
      const managerName = req.user.full_name || "Event Manager";
      await notifyAdmins({
        title: "New Manager Availability Request",
        body: `${managerName} (Event Manager) requested unavailable status for ${dateDesc}.`,
        type: "info",
        link: "/admin/staff/schedule",
        meta: { request_id: requestId, user_id: req.user._id }
      });
      const io = getIo();
      if (io) {
        io.emit("system:refresh", { type: "staff", action: "availability_request_created", user_id: req.user._id });
      }
    } catch (e) {
      console.error("Failed to dispatch manager availability notifications:", e.message);
    }
  };

  // 1. Single Day mode
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = parseDateKey(date);
    if (!parsed) return res.status(400).json({ message: "Invalid date format" });

    const dayStart = new Date(parsed);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(parsed);
    dayEnd.setUTCHours(23, 59, 59, 999);

    await StaffAvailability.deleteMany({
      user_id: req.user._id,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    const created = await StaffAvailability.create({
      user_id: req.user._id,
      date: parsed,
      reason: reasonText,
      status: "pending",
      request_id: requestId
    });

    notifyAdminReviewers(date);

    return res.status(201).json({
      message: "Availability request submitted for approval",
      status: "pending",
      record: {
        _id: created._id,
        date: toDateKey(created.date),
        reason: created.reason,
        status: created.status
      }
    });
  }

  // 2. Date Range mode
  if (startDate && endDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ message: "Start Date and End Date must be in YYYY-MM-DD format" });
    }
    if (startDate >= endDate) {
      return res.status(400).json({ message: "Start Date and End Date must be different, and End Date cannot be earlier than Start Date." });
    }

    const rangeDates = getDateRangeList(startDate, endDate);
    if (rangeDates.length === 0) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const startBoundary = new Date(rangeDates[0]);
    startBoundary.setUTCHours(0, 0, 0, 0);
    const endBoundary = new Date(rangeDates[rangeDates.length - 1]);
    endBoundary.setUTCHours(23, 59, 59, 999);

    await StaffAvailability.deleteMany({
      user_id: req.user._id,
      date: { $gte: startBoundary, $lte: endBoundary }
    });

    await StaffAvailability.insertMany(
      rangeDates.map((d) => {
        const yr = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
        return {
          user_id: req.user._id,
          date: d,
          month: `${yr}-${mo}`,
          reason: reasonText,
          status: "pending",
          request_id: requestId
        };
      })
    );

    notifyAdminReviewers(`${startDate} to ${endDate}`);

    return res.status(201).json({
      message: `Submitted ${rangeDates.length} unavailable date request(s) for approval`,
      status: "pending",
      pending: rangeDates.map(toDateKey),
      dates: rangeDates.map(toDateKey)
    });
  }

  // 3. Array of dates or Month-based replacement (legacy support)
  if (Array.isArray(dates)) {
    const parsedDates = dates.map(parseDateKey).filter(Boolean);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const range = parseMonth(month);
      if (range) {
        await StaffAvailability.deleteMany({
          user_id: req.user._id,
          date: { $gte: range.start, $lte: range.end }
        });
      }
    }

    if (parsedDates.length > 0) {
      for (const d of parsedDates) {
        const dayStart = new Date(d);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setUTCHours(23, 59, 59, 999);
        await StaffAvailability.deleteMany({
          user_id: req.user._id,
          date: { $gte: dayStart, $lte: dayEnd }
        });
      }

      await StaffAvailability.insertMany(
        parsedDates.map((d) => {
          const yr = d.getUTCFullYear();
          const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
          return {
            user_id: req.user._id,
            date: d,
            month: month || `${yr}-${mo}`,
            reason: reasonText,
            status: "pending",
            request_id: requestId
          };
        })
      );

      notifyAdminReviewers(`${parsedDates.length} date(s)`);
    }

    return res.json({
      message: "Availability request(s) submitted for approval",
      status: "pending",
      unavailable: [],
      pending: parsedDates.map(toDateKey)
    });
  }

  return res.status(400).json({ message: "Please provide a valid date or date range" });
});

exports.removeAvailability = asyncHandler(async (req, res) => {
  const rawId = req.params?.id || req.body?.id;
  const rawDate = req.query?.date || req.body?.date;
  const isDateStr = (str) => typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);

  const date = isDateStr(rawDate) ? rawDate : (isDateStr(rawId) ? rawId : null);
  const id = (!isDateStr(rawId) && mongoose.Types.ObjectId.isValid(rawId)) ? rawId : null;

  if (id) {
    const deleted = await StaffAvailability.findOneAndDelete({
      _id: id,
      user_id: req.user._id
    });
    if (!deleted) {
      return res.status(404).json({ message: "Availability record not found" });
    }
    const io = getIo();
    if (io) {
      io.emit("system:refresh", { type: "staff", action: "availability_removed", user_id: req.user._id });
    }
    return res.json({ message: "Availability record removed successfully" });
  }

  if (date) {
    const parsed = parseDateKey(date);
    if (parsed) {
      const dayStart = new Date(parsed);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(parsed);
      dayEnd.setUTCHours(23, 59, 59, 999);

      await StaffAvailability.deleteMany({
        user_id: req.user._id,
        date: { $gte: dayStart, $lte: dayEnd }
      });
      const io = getIo();
      if (io) {
        io.emit("system:refresh", { type: "staff", action: "availability_removed", user_id: req.user._id });
      }
      return res.json({ message: "Availability date removed successfully" });
    }
  }

  return res.status(400).json({ message: "Please provide a valid record ID or date to remove" });
});

exports.getAvailabilityRequests = asyncHandler(async (req, res) => {
  const { status, role, month, user_id } = req.query;
  const reviewerRole = req.user.role; // "admin" or "manager"

  // Base user query depending on reviewer role
  let userQuery = {};
  if (reviewerRole === "manager") {
    // Managers can only review Staff requests
    userQuery.role = "staff";
  } else if (role && ["staff", "manager"].includes(role)) {
    userQuery.role = role;
  }

  if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
    userQuery._id = user_id;
  }

  const eligibleUsers = await User.find(userQuery).select("_id role full_name email phone position is_active").lean();
  const eligibleUserIds = eligibleUsers.map((u) => u._id);

  if (eligibleUserIds.length === 0) {
    return res.json([]);
  }

  const filter = {
    user_id: { $in: eligibleUserIds }
  };

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const range = parseMonth(month);
    if (range) {
      filter.date = { $gte: range.start, $lte: range.end };
    }
  }

  const requests = await StaffAvailability.find(filter)
    .sort({ date: 1, createdAt: -1 })
    .populate("user_id", "full_name email phone role position is_active")
    .populate("reviewed_by", "full_name role email")
    .lean();

  const requestsWithConflicts = await Promise.all(
    requests.map(async (item) => {
      const conflicts = await checkStaffConflicts(item.user_id?._id, item.date);
      return {
        _id: item._id,
        user_id: item.user_id,
        requester_role: item.user_id?.role || "staff",
        date: toDateKey(item.date),
        raw_date: item.date,
        reason: item.reason || "",
        status: item.status || "approved",
        reviewed_by: item.reviewed_by ? {
          _id: item.reviewed_by._id,
          full_name: item.reviewed_by.full_name,
          role: item.reviewed_by.role
        } : null,
        reviewed_at: item.reviewed_at || null,
        rejection_reason: item.rejection_reason || "",
        request_id: item.request_id || null,
        created_at: item.createdAt,
        conflicts
      };
    })
  );

  res.json(requestsWithConflicts);
});

exports.approveAvailabilityRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid availability request ID" });
  }

  const record = await StaffAvailability.findById(id).populate("user_id", "full_name role email");
  if (!record) {
    return res.status(404).json({ message: "Availability request not found" });
  }

  const requester = record.user_id;
  const reviewer = req.user;

  // 1. Staff and managers must not approve their own requests
  if (String(reviewer._id) === String(requester._id)) {
    return res.status(403).json({ message: "You cannot approve your own availability request." });
  }

  // 2. Role permission check:
  // - Staff requests: Only Admin or Manager may approve
  // - Manager requests: Only Admin may approve (Managers cannot approve Manager requests)
  if (requester.role === "manager") {
    if (reviewer.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can approve Manager availability requests." });
    }
  } else if (requester.role === "staff") {
    if (!["admin", "manager"].includes(reviewer.role)) {
      return res.status(403).json({ message: "Unauthorized to approve staff availability requests." });
    }
  } else {
    if (reviewer.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can approve availability requests." });
    }
  }

  // 3. Scheduling conflict check:
  // Prevent approval while unresolved conflicting assignments exist
  const conflicts = await checkStaffConflicts(requester._id, record.date);
  if (conflicts.length > 0) {
    const dateStr = toDateKey(record.date);
    return res.status(409).json({
      message: `Cannot approve request: ${requester.full_name} is assigned to ${conflicts.length} event(s) on ${dateStr}. Please resolve or reassign conflicting booking(s) before approving.`,
      conflicts
    });
  }

  // 4. Update status and audit metadata
  record.status = "approved";
  record.reviewed_by = reviewer._id;
  record.reviewed_at = new Date();
  record.rejection_reason = "";
  await record.save();

  const dateStr = toDateKey(record.date);

  // 5. System audit log
  await logAction({
    user_id: reviewer._id,
    action: "availability_approved",
    entity_type: "staff_availability",
    entity_id: record._id,
    details: `${reviewer.full_name} (${reviewer.role}) approved availability request for ${requester.full_name} on ${dateStr}`,
    changes: { status: "approved" },
    ip_address: req.ip
  });

  // 6. Notify requester
  await createNotification({
    userId: requester._id,
    title: "Availability Request Approved",
    body: `Your request for unavailable status on ${dateStr} has been approved.`,
    type: "success",
    link: requester.role === "manager" ? "/manager/dashboard" : "/staff/dashboard",
    meta: { request_id: record.request_id, availability_id: record._id }
  }).catch(() => {});

  // 7. Socket refresh
  const io = getIo();
  if (io) {
    io.emit("system:refresh", { type: "staff", action: "availability_approved", user_id: requester._id });
  }

  res.json({
    message: "Availability request approved successfully",
    record: {
      _id: record._id,
      date: dateStr,
      status: record.status,
      reviewed_by: reviewer.full_name,
      reviewed_at: record.reviewed_at
    }
  });
});

exports.rejectAvailabilityRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rejectionReason = (req.body?.rejection_reason || req.body?.reason || "").trim();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid availability request ID" });
  }

  const record = await StaffAvailability.findById(id).populate("user_id", "full_name role email");
  if (!record) {
    return res.status(404).json({ message: "Availability request not found" });
  }

  const requester = record.user_id;
  const reviewer = req.user;

  // 1. Staff and managers must not reject their own requests
  if (String(reviewer._id) === String(requester._id)) {
    return res.status(403).json({ message: "You cannot reject your own availability request." });
  }

  // 2. Role permission check:
  // - Staff requests: Only Admin or Manager may reject
  // - Manager requests: Only Admin may reject
  if (requester.role === "manager") {
    if (reviewer.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can reject Manager availability requests." });
    }
  } else if (requester.role === "staff") {
    if (!["admin", "manager"].includes(reviewer.role)) {
      return res.status(403).json({ message: "Unauthorized to reject staff availability requests." });
    }
  } else {
    if (reviewer.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can reject availability requests." });
    }
  }

  // 3. Update status and audit metadata
  record.status = "rejected";
  record.reviewed_by = reviewer._id;
  record.reviewed_at = new Date();
  record.rejection_reason = rejectionReason;
  await record.save();

  const dateStr = toDateKey(record.date);

  // 4. System audit log
  await logAction({
    user_id: reviewer._id,
    action: "availability_rejected",
    entity_type: "staff_availability",
    entity_id: record._id,
    details: `${reviewer.full_name} (${reviewer.role}) rejected availability request for ${requester.full_name} on ${dateStr}${rejectionReason ? `: ${rejectionReason}` : ""}`,
    changes: { status: "rejected", rejection_reason: rejectionReason },
    ip_address: req.ip
  });

  // 5. Notify requester
  await createNotification({
    userId: requester._id,
    title: "Availability Request Rejected",
    body: `Your request for unavailable status on ${dateStr} was rejected${rejectionReason ? `: ${rejectionReason}` : ""}.`,
    type: "error",
    link: requester.role === "manager" ? "/manager/dashboard" : "/staff/dashboard",
    meta: { request_id: record.request_id, availability_id: record._id }
  }).catch(() => {});

  // 6. Socket refresh
  const io = getIo();
  if (io) {
    io.emit("system:refresh", { type: "staff", action: "availability_rejected", user_id: requester._id });
  }

  res.json({
    message: "Availability request rejected",
    record: {
      _id: record._id,
      date: dateStr,
      status: record.status,
      reviewed_by: reviewer.full_name,
      reviewed_at: record.reviewed_at,
      rejection_reason: record.rejection_reason
    }
  });
});

exports.batchApproveAvailabilityRequests = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Please provide an array of request IDs to approve." });
  }

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const records = await StaffAvailability.find({ _id: { $in: validIds } }).populate("user_id", "full_name role email");

  const results = { approved: [], conflicts: [], unauthorized: [], notFound: [] };

  for (const record of records) {
    const requester = record.user_id;
    const reviewer = req.user;

    // Self-approval
    if (String(reviewer._id) === String(requester._id)) {
      results.unauthorized.push({ id: record._id, reason: "Self-approval forbidden" });
      continue;
    }

    // Role check
    if (requester.role === "manager" && reviewer.role !== "admin") {
      results.unauthorized.push({ id: record._id, reason: "Only admin can approve manager requests" });
      continue;
    }
    if (requester.role === "staff" && !["admin", "manager"].includes(reviewer.role)) {
      results.unauthorized.push({ id: record._id, reason: "Unauthorized" });
      continue;
    }

    // Conflicts check
    const conflicts = await checkStaffConflicts(requester._id, record.date);
    if (conflicts.length > 0) {
      results.conflicts.push({
        id: record._id,
        date: toDateKey(record.date),
        requester: requester.full_name,
        conflicts
      });
      continue;
    }

    // Approve
    record.status = "approved";
    record.reviewed_by = reviewer._id;
    record.reviewed_at = new Date();
    record.rejection_reason = "";
    await record.save();

    const dateStr = toDateKey(record.date);

    await logAction({
      user_id: reviewer._id,
      action: "availability_approved",
      entity_type: "staff_availability",
      entity_id: record._id,
      details: `${reviewer.full_name} (${reviewer.role}) approved availability request for ${requester.full_name} on ${dateStr}`,
      changes: { status: "approved" },
      ip_address: req.ip
    });

    await createNotification({
      userId: requester._id,
      title: "Availability Request Approved",
      body: `Your request for unavailable status on ${dateStr} has been approved.`,
      type: "success",
      link: requester.role === "manager" ? "/manager/dashboard" : "/staff/dashboard"
    }).catch(() => {});

    results.approved.push({ id: record._id, date: dateStr });
  }

  const io = getIo();
  if (io && results.approved.length > 0) {
    io.emit("system:refresh", { type: "staff", action: "availability_approved_batch" });
  }

  if (results.approved.length === 0 && results.conflicts.length > 0) {
    return res.status(409).json({
      message: `Could not approve request(s) due to ${results.conflicts.length} conflicting booking assignment(s).`,
      results
    });
  }

  res.json({
    message: `Approved ${results.approved.length} request(s). ${results.conflicts.length ? `${results.conflicts.length} conflict(s) skipped.` : ""}`,
    results
  });
});

exports.batchRejectAvailabilityRequests = asyncHandler(async (req, res) => {
  const { ids, rejection_reason } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Please provide an array of request IDs to reject." });
  }

  const reasonText = (rejection_reason || "").trim();
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const records = await StaffAvailability.find({ _id: { $in: validIds } }).populate("user_id", "full_name role email");

  const results = { rejected: [], unauthorized: [] };

  for (const record of records) {
    const requester = record.user_id;
    const reviewer = req.user;

    // Self-rejection
    if (String(reviewer._id) === String(requester._id)) {
      results.unauthorized.push({ id: record._id, reason: "Self-rejection forbidden" });
      continue;
    }

    // Role check
    if (requester.role === "manager" && reviewer.role !== "admin") {
      results.unauthorized.push({ id: record._id, reason: "Only admin can reject manager requests" });
      continue;
    }
    if (requester.role === "staff" && !["admin", "manager"].includes(reviewer.role)) {
      results.unauthorized.push({ id: record._id, reason: "Unauthorized" });
      continue;
    }

    record.status = "rejected";
    record.reviewed_by = reviewer._id;
    record.reviewed_at = new Date();
    record.rejection_reason = reasonText;
    await record.save();

    const dateStr = toDateKey(record.date);

    await logAction({
      user_id: reviewer._id,
      action: "availability_rejected",
      entity_type: "staff_availability",
      entity_id: record._id,
      details: `${reviewer.full_name} (${reviewer.role}) rejected availability request for ${requester.full_name} on ${dateStr}`,
      changes: { status: "rejected", rejection_reason: reasonText },
      ip_address: req.ip
    });

    await createNotification({
      userId: requester._id,
      title: "Availability Request Rejected",
      body: `Your request for unavailable status on ${dateStr} was rejected${reasonText ? `: ${reasonText}` : ""}.`,
      type: "error",
      link: requester.role === "manager" ? "/manager/dashboard" : "/staff/dashboard"
    }).catch(() => {});

    results.rejected.push({ id: record._id, date: dateStr });
  }

  const io = getIo();
  if (io && results.rejected.length > 0) {
    io.emit("system:refresh", { type: "staff", action: "availability_rejected_batch" });
  }

  res.json({
    message: `Rejected ${results.rejected.length} request(s).`,
    results
  });
});

exports.getBookings = asyncHandler(async (req, res) => {
  const managerId = req.user._id;
  const statusTab = String(req.query.status || "").toLowerCase();

  const query = { event_manager_id: managerId };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (statusTab === "completed") {
    query.$or = [
      { status: { $in: ["Completed", "completed", "Pending Completion", "pending completion"] } },
      { event_date: { $lt: todayStart } }
    ];
  } else if (statusTab === "upcoming" || statusTab === "active" || !statusTab) {
    query.status = { $nin: ["Completed", "completed", "Pending Completion", "pending completion", "Cancelled", "cancelled", "refunded"] };
    query.event_date = { $gte: todayStart };
  }

  const bookings = await Booking.find(query)
    .populate("customer_id", "full_name first_name last_name email phone")
    .populate("package_id", "name price")
    .populate("staff_assignments.user_id", "full_name email phone position")
    .populate("inventory_items.inventory_id", "name item_name category")
    .sort({ event_date: statusTab === "completed" ? -1 : 1 })
    .lean();

  if (bookings.length > 0) {
    const bookingIds = bookings.map((b) => b._id);
    const inquiryIds = bookings.map((b) => b.inquiry_id).filter(Boolean);
    const payments = await Payment.find({
      $or: [
        { booking_id: { $in: bookingIds } },
        ...(inquiryIds.length > 0 ? [{ inquiry_id: { $in: inquiryIds } }] : [])
      ]
    }).lean();

    const paymentMap = {};
    for (const p of payments) {
      if (["approved", "paid", "completed"].includes(String(p.status || "").toLowerCase().trim())) {
        const bKey = p.booking_id ? String(p.booking_id) : "";
        const inqKey = p.inquiry_id ? String(p.inquiry_id) : "";
        const amt = Number(p.amount) || 0;
        if (bKey) {
          paymentMap[bKey] = (paymentMap[bKey] || 0) + amt;
        } else if (inqKey) {
          paymentMap[inqKey] = (paymentMap[inqKey] || 0) + amt;
        }
      }
    }

    for (const b of bookings) {
      const paid = paymentMap[String(b._id)] ?? (b.inquiry_id ? paymentMap[String(b.inquiry_id)] : 0) ?? 0;
      const totalCost = Number(b.total_price || 0);
      b.total_paid = paid;
      b.remaining_balance = Math.max(0, totalCost - paid);
    }
  }

  res.json(bookings);
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  })
    .populate("customer_id", "full_name first_name last_name email phone address")
    .populate("package_id")
    .populate("inquiry_id")
    .populate("staff_assignments.user_id", "full_name email phone position role")
    .populate("inventory_items.inventory_id")
    .populate("equipment_returns.inventory_id")
    .populate("equipment_returns.verified_by", "full_name role")
    .populate("equipment_manager_verified.confirmed_by", "full_name role")
    .populate("equipment_checklist_done_by", "full_name role");

  if (!booking) {
    return res.status(404).json({ message: "Booking not found or not assigned to you" });
  }

  const payments = await Payment.find({
    $or: [
      { booking_id: booking._id },
      ...(booking.inquiry_id ? [{ inquiry_id: booking.inquiry_id?._id || booking.inquiry_id }] : [])
    ]
  })
    .sort({ createdAt: -1 })
    .lean();

  const approvedPayments = payments.filter((p) =>
    ["approved", "paid", "completed"].includes(String(p.status || "").toLowerCase().trim())
  );
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCost = Number(booking.total_price || 0);
  const remainingBalance = Math.max(0, totalCost - totalPaid);

  let quotation = null;
  const inqId = booking.inquiry_id?._id || booking.inquiry_id;
  if (inqId) {
    try {
      const Quotation = require("../models/Quotation");
      quotation = await Quotation.findOne({ inquiry_id: inqId }).sort({ version_number: -1 }).lean();
    } catch {
      // Gracefully handle if Quotation lookup fails
    }
  }

  const bookingObj = booking.toObject ? booking.toObject() : booking;
  bookingObj.payments = payments;
  bookingObj.approved_payments = approvedPayments;
  bookingObj.total_paid = totalPaid;
  bookingObj.remaining_balance = remainingBalance;
  if (quotation) {
    bookingObj.quotation = quotation;
  }

  res.json(bookingObj);
});

exports.assignStaff = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Only Administrators are authorized to assign staff to events. Managers no longer manage staff assignments."
    });
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only. Staff assignments cannot be modified." });
  }

  const { staff_assignments } = req.body;
  if (!Array.isArray(staff_assignments)) {
    return res.status(400).json({ message: "staff_assignments must be an array" });
  }

  // Prevent duplicate staff assignments within the same event
  const seenUserIds = new Set();
  for (const sa of staff_assignments) {
    const uId = String(sa.user_id?._id || sa.user_id || "");
    if (!uId) continue;
    if (seenUserIds.has(uId)) {
      const userDoc = await User.findById(uId).select("full_name");
      const name = userDoc?.full_name || "A crew member";
      return res.status(400).json({
        message: `${name} cannot be assigned to multiple roles on the same event.`
      });
    }
    seenUserIds.add(uId);
  }

  // Prevent event coordinator from occupying multiple roles on the same event
  const coordinatorId = String(booking.event_manager_id?._id || booking.event_manager_id || "");
  if (coordinatorId && seenUserIds.has(coordinatorId)) {
    const userDoc = await User.findById(coordinatorId).select("full_name");
    const name = userDoc?.full_name || "The Event Coordinator";
    return res.status(400).json({
      message: `${name} is already assigned as Event Coordinator for this event and cannot occupy multiple roles.`
    });
  }

  // Prevent invalid role assignments: An Event Coordinator must not be assignable as Head Cook
  const headCookAssignment = staff_assignments.find((sa) => sa.role === "Head Cook" && sa.user_id);
  if (headCookAssignment) {
    const cookId = headCookAssignment.user_id?._id || headCookAssignment.user_id;
    const cookUser = await User.findById(cookId).select("role position full_name");
    if (cookUser) {
      const userRole = String(cookUser.role || "").toLowerCase();
      const userPos = String(cookUser.position || "").toLowerCase();
      if (userRole === "manager" || userPos.includes("coordinator") || userPos.includes("event manager")) {
        return res.status(400).json({
          message: `${cookUser.full_name} is an Event Coordinator and cannot be assigned as Head Cook.`
        });
      }
    }
  }

  // Validate Staff Availability on event date
  const assignedUserIds = staff_assignments
    .map((a) => a.user_id?._id || a.user_id)
    .filter(Boolean);

  if (assignedUserIds.length > 0 && booking.event_date) {
    const eventDate = new Date(booking.event_date);
    const dayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const dayEnd = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);

    const unavailabilities = await StaffAvailability.find({
      user_id: { $in: assignedUserIds },
      date: { $gte: dayStart, $lte: dayEnd },
      $or: [{ status: "approved" }, { status: { $exists: false } }, { status: null }]
    }).populate("user_id", "full_name");

    if (unavailabilities.length > 0 && !req.body.override_unavailability) {
      const names = unavailabilities.map((u) => u.user_id?.full_name || "A selected staff member").join(", ");
      return res.status(409).json({
        message: `Cannot assign: ${names} is marked as unavailable/off-duty on this event date.`
      });
    }
  }

  booking.staff_assignments = staff_assignments;

  // Only advance to Ready for Event if the booking is already confirmed and deposit has been paid
  const isPastEvent = booking.event_date && new Date(booking.event_date) < new Date();
  const hasPaidDeposit = ["deposit_paid", "fully_paid"].includes(booking.payment_status);
  if (!isPastEvent && hasPaidDeposit && ["Confirmed", "confirmed"].includes(booking.status)) {
    booking.status = "Ready for Event";
  }

  await booking.save();

  const populated = await Booking.findById(booking._id)
    .populate("customer_id", "full_name email phone")
    .populate("staff_assignments.user_id", "full_name email phone position");

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "booking", action: "assign_staff", booking_id: booking._id });
  }

  // Notify each assigned registered staff member
  try {
    const { createNotification } = require("../utils/notify");
    const eventDateFormatted = booking.event_date
      ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Upcoming Event";

    const notifyPromises = staff_assignments
      .filter((a) => a.user_id)
      .map((a) => {
        const staffUserId = a.user_id?._id || a.user_id;
        return createNotification(
          {
            userId: staffUserId,
            title: "New Event Crew Assignment",
            body: `You have been assigned as ${a.role || "Staff"} for ${booking.event_type || "Catering Event"} on ${eventDateFormatted}.`,
            type: "info",
            link: `/staff/events/${booking._id}`,
            meta: { booking_id: booking._id, role: a.role }
          },
          io
        ).catch((err) => console.error("Staff notification error:", err));
      });
    await Promise.allSettled(notifyPromises);
  } catch (notifErr) {
    console.error("Error creating staff assignment notifications:", notifErr);
  }

  res.json({ message: "Staff assigned successfully", booking: populated });
});

exports.addNote = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only. Notes cannot be added." });
  }

  const { note } = req.body;
  if (!note || !note.trim()) {
    return res.status(400).json({ message: "Note is required" });
  }

  if (!Array.isArray(booking.event_manager_notes)) {
    booking.event_manager_notes = [];
  }

  booking.event_manager_notes.push({
    note: note.trim(),
    created_at: new Date()
  });

  await booking.save();
  res.json(booking.event_manager_notes);
});

exports.submitReport = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is completed and read-only. Shift reports cannot be submitted or altered." });
  }

  const { note, role } = req.body;
  if (!note || !note.trim()) {
    return res.status(400).json({ message: "Report note is required" });
  }

  if (!Array.isArray(booking.staff_reports)) {
    booking.staff_reports = [];
  }

  booking.staff_reports.push({
    staff_id: req.user._id,
    role: role || (req.user.role === "admin" ? "Administrator" : "Lead Manager"),
    note: note.trim(),
    created_at: new Date()
  });

  await booking.save();
  res.json({ message: "Report submitted successfully", staff_reports: booking.staff_reports });
});

const isBookingStartedOrFinished = (booking) => {
  if (!booking) return false;
  const status = String(booking.status || "").toLowerCase();
  if (["completed", "ongoing", "pending completion"].includes(status)) {
    return true;
  }

  if (!booking.event_date) return true;

  const dateObj = new Date(booking.event_date);
  if (Number.isNaN(dateObj.getTime())) return true;

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  let hours = 0;
  let minutes = 0;
  if (booking.start_time) {
    const match = String(booking.start_time).trim().match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    }
  }

  const startDateTime = new Date(year, month, day, hours, minutes, 0, 0);
  const now = new Date();

  return now >= startDateTime;
};

const formatBookingEventSchedule = (eventDate, startTime) => {
  if (!eventDate) return "the scheduled event time";
  const d = new Date(eventDate);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return startTime ? `${dateStr} at ${startTime}` : dateStr;
};

exports.submitEquipmentReturns = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  if (booking.equipment_admin_verified?.confirmed) {
    return res.status(400).json({ message: "This equipment inspection has already been finalized and verified by the administrator and is read-only." });
  }

  if (!isBookingStartedOrFinished(booking)) {
    return res.status(400).json({
      message: `Equipment check is locked until the event starts (${formatBookingEventSchedule(booking.event_date, booking.start_time)}).`
    });
  }

  const returns = req.body.returns || req.body.equipment_returns;
  const noteText = (req.body.note || req.body.notes || req.body.equipment_notes || "").trim();

  if (!Array.isArray(booking.equipment_returns) || booking.equipment_returns.length === 0) {
    const fromInventory = (booking.inventory_items || []).map((item) => ({
      inventory_id: item.inventory_id,
      name: item.name,
      quantity_booked: item.quantity || 1,
      quantity_returned: item.quantity || 1,
      verified_at: new Date(),
      verified_by: req.user._id
    }));
    const fromChecklist = (booking.equipment_checklist || []).map((c) => ({
      name: c.name,
      quantity_booked: typeof c.quantity === "number" ? c.quantity : 1,
      quantity_returned: typeof c.quantity === "number" ? c.quantity : 1,
      verified_at: new Date(),
      verified_by: req.user._id
    }));
    booking.equipment_returns = fromInventory.length > 0 ? fromInventory : fromChecklist;
  }

  if (Array.isArray(returns)) {
    for (const ret of returns) {
      const item = booking.equipment_returns.find(
        (eq) => String(eq.inventory_id) === String(ret.inventory_id) || String(eq._id) === String(ret._id)
      );
      const bookedQty = item ? item.quantity_booked : Number(ret.quantity_booked || 0);
      const returnedVal = Number(ret.quantity_returned !== undefined ? ret.quantity_returned : bookedQty);
      const damagedVal = Number(ret.quantity_damaged !== undefined ? ret.quantity_damaged : 0);
      const missingVal = Number(ret.quantity_missing !== undefined ? ret.quantity_missing : 0);

      if (!Number.isInteger(returnedVal) || returnedVal < 0) {
        return res.status(400).json({
          message: `Returned quantity for ${ret.name || item?.name || 'equipment'} must be a valid non-negative whole number.`
        });
      }
      if (!Number.isInteger(damagedVal) || damagedVal < 0) {
        return res.status(400).json({
          message: `Damaged quantity for ${ret.name || item?.name || 'equipment'} must be a valid non-negative whole number.`
        });
      }
      if (!Number.isInteger(missingVal) || missingVal < 0) {
        return res.status(400).json({
          message: `Missing quantity for ${ret.name || item?.name || 'equipment'} must be a valid non-negative whole number.`
        });
      }
      if (bookedQty > 0 && returnedVal + damagedVal > bookedQty) {
        return res.status(400).json({
          message: `Invalid return amount for ${item?.name || ret.name || 'equipment'}. Returned (${returnedVal}) + Damaged (${damagedVal}) cannot exceed dispatched amount (${bookedQty}).`
        });
      }
    }

    const { reconcileEquipmentTurnover } = require("../utils/reconcileInventory");
    await reconcileEquipmentTurnover({
      booking,
      returns,
      actorId: req.user._id,
      notes: noteText,
      isManagerVerification: true,
    });
  }

  if (noteText) {
    booking.equipment_notes = noteText;
    if (!Array.isArray(booking.staff_reports)) booking.staff_reports = [];
    booking.staff_reports.push({
      staff_id: req.user._id,
      role: "Lead Manager - Equipment Check",
      note: noteText,
      created_at: new Date()
    });
  }

  await booking.save();

  const updated = await Booking.findById(booking._id).populate("equipment_returns.inventory_id");
  res.json({ message: "Equipment returns saved successfully", equipment_returns: updated.equipment_returns });
});

exports.updateStaffAttendance = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is completed and read-only. Staff attendance cannot be modified." });
  }

  const { attendance } = req.body;
  if (!Array.isArray(attendance)) {
    return res.status(400).json({ message: "attendance must be an array" });
  }

  if (!Array.isArray(booking.staff_assignments)) {
    booking.staff_assignments = [];
  }

  for (const item of attendance) {
    const targetUserId = item.user_id?._id || item.user_id;
    const staffEntry = booking.staff_assignments.find(
      (sa) => (targetUserId && String(sa.user_id) === String(targetUserId)) ||
              (item._id && String(sa._id) === String(item._id)) ||
              (item.name && sa.name && sa.name.toLowerCase() === item.name.toLowerCase())
    );

    if (staffEntry) {
      if (item.attendance_status) {
        staffEntry.attendance_status = item.attendance_status;
      }
      if (item.check_in_time !== undefined) {
        staffEntry.check_in_time = item.check_in_time;
      }
      if (item.attendance_notes !== undefined) {
        staffEntry.attendance_notes = item.attendance_notes;
      }
      if (item.attendance_status === "not_recorded" || item.attendance_status === "unmarked") {
        staffEntry.marked_at = null;
        staffEntry.marked_by = null;
      } else {
        staffEntry.marked_at = new Date();
        staffEntry.marked_by = req.user._id;
      }
    }
  }

  await booking.save();

  const populated = await Booking.findById(booking._id)
    .populate("staff_assignments.user_id", "full_name email phone position role");

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "booking", action: "update_staff_attendance", booking_id: booking._id });
  }

  res.json({
    message: "Staff attendance updated successfully",
    staff_assignments: populated.staff_assignments
  });
});

const syncChecklistToReturns = (booking, actorId) => {
  if (!Array.isArray(booking.equipment_checklist) || booking.equipment_checklist.length === 0) return;
  if (!Array.isArray(booking.equipment_returns)) booking.equipment_returns = [];

  const inventoryItems = Array.isArray(booking.inventory_items) ? booking.inventory_items : [];

  booking.equipment_checklist.forEach((c) => {
    const cName = String(c.name || "").trim().toLowerCase();
    if (!cName) return;

    let ret = booking.equipment_returns.find(
      (r) => (r.name && r.name.trim().toLowerCase() === cName) ||
             (r._id && c._id && String(r._id) === String(c._id))
    );

    const bookedQty = typeof c.quantity === "number" && c.quantity > 0 ? c.quantity : 1;

    const matchedInv = inventoryItems.find(
      (inv) => inv.name && inv.name.trim().toLowerCase() === cName
    );
    const invId = matchedInv?.inventory_id?._id || matchedInv?.inventory_id || null;

    if (!ret) {
      ret = {
        name: c.name,
        inventory_id: invId,
        quantity_booked: bookedQty,
        quantity_returned: 0,
        quantity_damaged: 0,
        quantity_missing: 0,
        reconciled_returned: 0,
        reconciled_damaged: 0,
        reconciled_missing: 0,
        notes: "",
        verification_status: "pending",
        issue_category: "",
      };
      booking.equipment_returns.push(ret);
    } else if (!ret.inventory_id && invId) {
      ret.inventory_id = invId;
    }

    ret.quantity_booked = bookedQty;

    const isInspected = Boolean(c.is_inspected || (c.status && c.status !== "not_inspected"));

    if (!isInspected) {
      ret.verification_status = "pending";
      ret.quantity_returned = 0;
      ret.quantity_damaged = 0;
      ret.quantity_missing = 0;
      ret.notes = c.notes || "";
      ret.issue_category = "";
      ret.verified_at = null;
      ret.verified_by = null;
    } else if (c.status === "inspected_ok" || c.status === "complete") {
      const retQty = typeof c.quantity_returned === "number" && c.quantity_returned >= 0
        ? Math.min(bookedQty, c.quantity_returned)
        : bookedQty;
      ret.verification_status = "verified_ok";
      ret.quantity_returned = retQty;
      ret.quantity_damaged = 0;
      ret.quantity_missing = Math.max(0, bookedQty - retQty);
      ret.notes = c.notes || "Inspected in good condition";
      ret.issue_category = "";
      ret.verified_at = c.completed_at || new Date();
      ret.verified_by = c.completed_by || actorId;
    } else if (c.status === "incomplete" || c.status === "issue_reported") {
      ret.verification_status = "issue_recorded";
      ret.notes = c.notes || "Issue reported during inspection";
      ret.verified_at = c.completed_at || new Date();
      ret.verified_by = c.completed_by || actorId;

      const issueQty = typeof c.issue_quantity === "number" && c.issue_quantity >= 0
        ? Math.min(bookedQty, c.issue_quantity)
        : (c.issue_type === "damaged" && typeof c.quantity_damaged === "number"
            ? Math.min(bookedQty, c.quantity_damaged)
            : (c.issue_type === "missing" && typeof c.quantity_missing === "number"
                ? Math.min(bookedQty, c.quantity_missing)
                : bookedQty));

      if (c.issue_type === "missing") {
        ret.issue_category = "missing";
        ret.quantity_missing = issueQty;
        ret.quantity_damaged = 0;
        ret.quantity_returned = typeof c.quantity_returned === "number"
          ? Math.min(bookedQty - issueQty, Math.max(0, c.quantity_returned))
          : Math.max(0, bookedQty - issueQty);
      } else if (c.issue_type === "damaged") {
        ret.issue_category = "damaged";
        ret.quantity_damaged = issueQty;
        ret.quantity_missing = 0;
        ret.quantity_returned = typeof c.quantity_returned === "number"
          ? Math.min(bookedQty - issueQty, Math.max(0, c.quantity_returned))
          : Math.max(0, bookedQty - issueQty);
      } else {
        ret.issue_category = "other";
        ret.quantity_damaged = issueQty;
        ret.quantity_missing = 0;
        ret.quantity_returned = typeof c.quantity_returned === "number"
          ? Math.min(bookedQty - issueQty, Math.max(0, c.quantity_returned))
          : Math.max(0, bookedQty - issueQty);
      }
    }
  });

  if (booking.equipment_checklist_done) {
    booking.equipment_manager_verified = {
      confirmed: true,
      confirmed_by: actorId || booking.equipment_checklist_done_by,
      confirmed_at: booking.equipment_checklist_done_at || new Date(),
      additional_notes: booking.equipment_notes || "Equipment inspection completed by manager.",
    };
  }
};

exports.updateEquipmentChecklist = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  if (booking.equipment_admin_verified?.confirmed) {
    return res.status(400).json({ message: "This equipment checklist has already been finalized and verified by the administrator and is read-only." });
  }

  const { checklist, item, notes } = req.body;

  if (Array.isArray(checklist)) {
    booking.equipment_checklist = checklist.map((c) => ({
      item_key: String(c.item_key || c.id || c.name),
      name: String(c.name || "Item"),
      category: String(c.category || ""),
      quantity: typeof c.quantity === "number" ? c.quantity : undefined,
      unit: c.unit || undefined,
      is_inspected: Boolean(c.is_inspected),
      status: ["not_inspected", "inspected_ok", "issue_reported", "incomplete", "complete"].includes(c.status) ? c.status : "not_inspected",
      issue_type: ["none", "damaged", "missing", "quantity_mismatch", "needs_repair", "other"].includes(c.issue_type) ? c.issue_type : "none",
      issue_quantity: typeof c.issue_quantity === "number" && Number.isInteger(c.issue_quantity) && c.issue_quantity >= 0 ? c.issue_quantity : undefined,
      quantity_returned: typeof c.quantity_returned === "number" && Number.isInteger(c.quantity_returned) && c.quantity_returned >= 0 ? c.quantity_returned : undefined,
      quantity_damaged: typeof c.quantity_damaged === "number" && Number.isInteger(c.quantity_damaged) && c.quantity_damaged >= 0 ? c.quantity_damaged : undefined,
      quantity_missing: typeof c.quantity_missing === "number" && Number.isInteger(c.quantity_missing) && c.quantity_missing >= 0 ? c.quantity_missing : undefined,
      notes: typeof c.notes === "string" ? c.notes : "",
      completed_at: c.completed_at || (c.status === "inspected_ok" || c.status === "complete" || c.status === "incomplete" || c.is_complete ? new Date() : null),
      completed_by: req.user._id
    }));
  } else if (item && item.item_key) {
    if (item.status === "incomplete" && (!item.notes || !String(item.notes).trim())) {
      return res.status(400).json({ message: "An issue description is required before marking an item as Incomplete." });
    }

    let issueQty = undefined;
    if (item.issue_quantity !== undefined && item.issue_quantity !== null && item.issue_quantity !== "") {
      issueQty = Number(item.issue_quantity);
      if (isNaN(issueQty) || !Number.isInteger(issueQty) || issueQty < 0) {
        return res.status(400).json({ message: "Quantity must be a valid non-negative whole number." });
      }
      if (typeof item.quantity === "number" && item.quantity > 0 && issueQty > item.quantity) {
        return res.status(400).json({ message: `Quantity (${issueQty}) cannot exceed allocated quantity (${item.quantity}).` });
      }
    }

    let retQty = undefined;
    if (item.quantity_returned !== undefined && item.quantity_returned !== null && item.quantity_returned !== "") {
      retQty = Number(item.quantity_returned);
      if (isNaN(retQty) || !Number.isInteger(retQty) || retQty < 0) {
        return res.status(400).json({ message: "Returned quantity must be a valid non-negative whole number." });
      }
      if (typeof item.quantity === "number" && item.quantity > 0 && retQty > item.quantity) {
        return res.status(400).json({ message: `Returned quantity (${retQty}) cannot exceed allocated quantity (${item.quantity}).` });
      }
    }

    let damQty = undefined;
    if (item.quantity_damaged !== undefined && item.quantity_damaged !== null && item.quantity_damaged !== "") {
      damQty = Number(item.quantity_damaged);
      if (isNaN(damQty) || !Number.isInteger(damQty) || damQty < 0) {
        return res.status(400).json({ message: "Damaged quantity must be a valid non-negative whole number." });
      }
    }

    let misQty = undefined;
    if (item.quantity_missing !== undefined && item.quantity_missing !== null && item.quantity_missing !== "") {
      misQty = Number(item.quantity_missing);
      if (isNaN(misQty) || !Number.isInteger(misQty) || misQty < 0) {
        return res.status(400).json({ message: "Missing quantity must be a valid non-negative whole number." });
      }
    }

    if (!Array.isArray(booking.equipment_checklist)) {
      booking.equipment_checklist = [];
    }
    const idx = booking.equipment_checklist.findIndex((c) => c.item_key === item.item_key);
    const isInspected = item.is_inspected !== undefined
      ? Boolean(item.is_inspected)
      : (item.status && item.status !== "not_inspected");
    const status = item.status || (isInspected ? "inspected_ok" : "not_inspected");
    const completedAt = isInspected
      ? (item.completed_at || new Date())
      : null;

    const updatedEntry = {
      item_key: item.item_key,
      name: item.name || "Item",
      category: item.category || "",
      quantity: typeof item.quantity === "number" ? item.quantity : undefined,
      unit: item.unit || "",
      is_inspected: isInspected,
      status: status,
      issue_type: item.issue_type || "none",
      issue_quantity: issueQty,
      quantity_returned: retQty,
      quantity_damaged: damQty,
      quantity_missing: misQty,
      notes: item.notes !== undefined ? String(item.notes) : "",
      completed_at: completedAt,
      completed_by: isInspected ? req.user._id : null,
    };
    if (idx >= 0) {
      booking.equipment_checklist[idx] = { ...booking.equipment_checklist[idx].toObject?.() || booking.equipment_checklist[idx], ...updatedEntry };
    } else {
      booking.equipment_checklist.push(updatedEntry);
    }
    if (!isInspected && booking.equipment_checklist_done) {
      booking.equipment_checklist_done = false;
    }
  }

  if (typeof notes === "string") {
    booking.equipment_notes = notes.trim();
  }

  syncChecklistToReturns(booking, req.user._id);

  await booking.save();

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", { type: "booking", action: "update_equipment_checklist", booking_id: booking._id });
  }

  res.json({
    message: "Equipment checklist updated successfully",
    equipment_checklist: booking.equipment_checklist,
    equipment_notes: booking.equipment_notes
  });
});

exports.updateEquipmentNotes = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Assigned event not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is completed and read-only. Notes cannot be modified." });
  }

  const notes = req.body.notes !== undefined ? req.body.notes : req.body.equipment_notes;
  booking.equipment_notes = typeof notes === "string" ? notes.trim() : "";
  if (booking.equipment_manager_verified?.confirmed) {
    booking.equipment_manager_verified.additional_notes = booking.equipment_notes;
  }
  await booking.save();

  res.json({
    message: "Equipment notes saved successfully",
    equipment_notes: booking.equipment_notes
  });
});


exports.updateEquipment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only. Equipment cannot be modified." });
  }

  const { inventory_items } = req.body;
  if (Array.isArray(inventory_items)) {
    booking.inventory_items = inventory_items;
    await booking.save();
  }

  res.json({ message: "Equipment updated", inventory_items: booking.inventory_items });
});

exports.verifyEquipment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found or not assigned to you" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only. Equipment verification cannot be modified." });
  }

  const { confirmed, additional_notes } = req.body;
  const returns = req.body.returns || req.body.equipment_returns;
  const isConfirmed = Boolean(confirmed);

  if (isConfirmed && ((Array.isArray(booking.equipment_returns) && booking.equipment_returns.length > 0) || Array.isArray(returns))) {
    const { reconcileEquipmentTurnover } = require("../utils/reconcileInventory");
    await reconcileEquipmentTurnover({
      booking,
      returns,
      actorId: req.user._id,
      notes: typeof additional_notes === "string" ? additional_notes.trim() : "",
      isManagerVerification: true,
    });
  } else {
    booking.equipment_manager_verified = {
      confirmed: isConfirmed,
      confirmed_by: req.user._id,
      confirmed_at: isConfirmed ? new Date() : null,
      additional_notes: typeof additional_notes === "string" ? additional_notes.trim() : ""
    };
    await booking.save();
  }

  const populated = await Booking.findById(booking._id)
    .populate("equipment_manager_verified.confirmed_by", "full_name role");

  res.json({
    message: isConfirmed ? "Equipment confirmed and verified by manager" : "Equipment verification updated",
    equipment_manager_verified: populated.equipment_manager_verified
  });
});

exports.markEquipmentChecklistDone = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user.role === "admin" ? {} : { event_manager_id: req.user._id })
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found or not assigned to you" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only." });
  }

  // Validate Equipment Checklist: every applicable item must have an explicitly recorded inspection
  const applicableKeys = new Set();
  const inclusions = Array.isArray(booking.package_inclusions) ? booking.package_inclusions : [];
  inclusions.forEach((inc, idx) => {
    const raw = String(inc || "").trim();
    if (!raw) return;
    let category = "";
    let cleanName = raw;
    const tagMatch = raw.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
    if (tagMatch) {
      category = tagMatch[1];
      cleanName = tagMatch[2];
    }
    const cleanLower = cleanName.toLowerCase();
    const catLower = category.toLowerCase();
    if (cleanLower === "crew" || catLower === "crew" || catLower === "staff") return;

    cleanName = cleanName.replace(/\((\d+)(?:\s*([a-zA-Z]+))?\)$/, "").trim();
    const itemKey = `inclusion_${idx}_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    applicableKeys.add(itemKey);
  });

  const inventoryItems = Array.isArray(booking.inventory_items) ? booking.inventory_items : [];
  inventoryItems.forEach((inv, idx) => {
    const name = inv.name || inv.inventory_id?.name || inv.inventory_id?.item_name || `Equipment Item #${idx + 1}`;
    const itemKey = `inv_${inv.inventory_id?._id || inv.inventory_id || idx}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    applicableKeys.add(itemKey);
  });

  if (applicableKeys.size > 0) {
    const checklistMap = new Map();
    (booking.equipment_checklist || []).forEach((c) => {
      if (c.item_key) checklistMap.set(c.item_key, c);
    });

    let uninspectedCount = 0;
    for (const key of applicableKeys) {
      const item = checklistMap.get(key);
      if (!item || !item.is_inspected || item.status === "not_inspected") {
        uninspectedCount++;
      }
    }

    if (uninspectedCount > 0) {
      return res.status(400).json({
        message: `Please inspect all equipment items before marking the checklist as done. (${uninspectedCount} item${uninspectedCount > 1 ? "s" : ""} remaining)`
      });
    }

    const invalidIncomplete = (booking.equipment_checklist || []).filter(
      (item) => applicableKeys.has(item.item_key) &&
        (item.status === "incomplete" || item.status === "issue_reported") &&
        (!item.notes || !item.notes.trim())
    );
    if (invalidIncomplete.length > 0) {
      return res.status(400).json({
        message: "Incomplete equipment items must have a saved issue report note before marking the checklist as done."
      });
    }
  }

  booking.equipment_checklist_done = true;
  booking.equipment_checklist_done_at = new Date();
  booking.equipment_checklist_done_by = req.user._id;

  syncChecklistToReturns(booking, req.user._id);

  await booking.save();

  const io = req.app.get("io");
  if (io) {
    io.emit("system:refresh", {
      type: "booking",
      action: "equipment_checklist_done",
      booking_id: booking._id
    });
  }

  const populated = await Booking.findById(booking._id)
    .populate("equipment_checklist_done_by", "full_name role");

  res.json({
    message: "Equipment inspection checklist marked as Done successfully",
    equipment_checklist_done: true,
    equipment_checklist_done_at: populated.equipment_checklist_done_at,
    equipment_checklist_done_by: populated.equipment_checklist_done_by,
    booking: populated
  });
});

exports.markCompleted = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only administrators can officially complete a booking." });
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  if (["completed", "Completed"].includes(booking.status)) {
    return res.status(400).json({ message: "This booking is already completed and read-only." });
  }

  if (booking.cancellation_request?.status === "pending") {
    return res.status(400).json({
      message: "Cannot mark booking as completed while a customer cancellation request is pending review. Please resolve or decline the cancellation request first."
    });
  }

  // Validate Equipment Checklist: all applicable items must be inspected before completion
  const applicableKeys = new Set();
  const inclusions = Array.isArray(booking.package_inclusions) ? booking.package_inclusions : [];
  inclusions.forEach((inc, idx) => {
    const raw = String(inc || "").trim();
    if (!raw) return;
    let category = "";
    let cleanName = raw;
    const tagMatch = raw.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
    if (tagMatch) {
      category = tagMatch[1];
      cleanName = tagMatch[2];
    }
    const cleanLower = cleanName.toLowerCase();
    const catLower = category.toLowerCase();
    if (cleanLower === "crew" || catLower === "crew" || catLower === "staff") return;

    cleanName = cleanName.replace(/\((\d+)(?:\s*([a-zA-Z]+))?\)$/, "").trim();
    const itemKey = `inclusion_${idx}_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    applicableKeys.add(itemKey);
  });

  const inventoryItems = Array.isArray(booking.inventory_items) ? booking.inventory_items : [];
  inventoryItems.forEach((inv, idx) => {
    const name = inv.name || inv.inventory_id?.name || inv.inventory_id?.item_name || `Equipment Item #${idx + 1}`;
    const itemKey = `inv_${inv.inventory_id?._id || inv.inventory_id || idx}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    applicableKeys.add(itemKey);
  });

  if (applicableKeys.size > 0) {
    const checklistMap = new Map();
    (booking.equipment_checklist || []).forEach((c) => {
      if (c.item_key) checklistMap.set(c.item_key, c);
    });

    let uninspectedCount = 0;
    for (const key of applicableKeys) {
      const item = checklistMap.get(key);
      if (!item || !item.is_inspected || item.status === "not_inspected") {
        uninspectedCount++;
      }
    }

    if (uninspectedCount > 0) {
      return res.status(400).json({
        message: `Please inspect all equipment items before completing this event. (${uninspectedCount} item${uninspectedCount > 1 ? "s" : ""} remaining)`
      });
    }

    const invalidIncomplete = (booking.equipment_checklist || []).filter(
      (item) => applicableKeys.has(item.item_key) &&
        (item.status === "incomplete" || item.status === "issue_reported") &&
        (!item.notes || !item.notes.trim())
    );
    if (invalidIncomplete.length > 0) {
      return res.status(400).json({
        message: "Incomplete equipment items must have a saved issue report note before completing this event."
      });
    }
  }

  if (!isBookingStartedOrFinished(booking)) {
    return res.status(400).json({
      message: `Event completion is locked until the event starts (${formatBookingEventSchedule(booking.event_date, booking.start_time)}).`
    });
  }

  // Handle balance payment and validate settlement
  const Payment = require("../models/Payment");
  const approvedPayments = await Payment.find({ booking_id: booking._id, status: "approved" });
  const totalPaid = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, Number(booking.total_price || 0) - totalPaid);

  const io = req.app.get("io");

  if (remainingBalance > 0) {
    if (req.body.collected_cash_balance === true) {
      const { syncBookingStatus } = require("./payment.controller");
      let balPayment = await Payment.findOne({
        booking_id: booking._id,
        payment_type: "balance",
        status: "pending"
      });

      if (balPayment) {
        balPayment.status = "approved";
        balPayment.method = "cash";
        balPayment.gateway = "manual";
        balPayment.amount = remainingBalance;
        balPayment.paid_at = new Date();
        balPayment.metadata = { ...(balPayment.metadata || {}), collected_by: req.user._id, on_site: true };
        await balPayment.save();
      } else {
        balPayment = await Payment.create({
          booking_id: booking._id,
          customer_id: booking.customer_id,
          amount: remainingBalance,
          currency: "PHP",
          payment_type: "balance",
          method: "cash",
          gateway: "manual",
          status: "approved",
          paid_at: new Date(),
          metadata: { collected_by: req.user._id, on_site: true }
        });
      }

      await syncBookingStatus(booking._id);
    } else {
      return res.status(400).json({
        message: `Cannot mark booking as completed. The customer still has an outstanding balance of ₱${remainingBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. Full payment is required before an event can be marked completed.`
      });
    }
  }

  booking.status = "Completed";
  booking.completed_at = new Date();
  await booking.save();

  if (io) {
    io.emit("system:refresh", { type: "booking", action: "complete_event", booking_id: booking._id });
  }

  res.json({ message: "Booking marked as completed", booking });
});

exports.getStaff = asyncHandler(async (req, res) => {
  const roleFilter = String(req.query.role || (req.user?.role === "admin" ? "all" : "staff")).toLowerCase().trim();
  const query = {};

  if (roleFilter === "manager") {
    query.role = "manager";
  } else if (roleFilter === "staff") {
    query.role = "staff";
  } else {
    query.role = { $in: ["staff", "manager"] };
  }

  if (req.query.include_inactive !== "true") {
    query.is_active = true;
  }

  const staff = await User.find(query).select("-password").lean();
  const staffIds = staff.map((s) => s._id);

  const now = new Date();
  const upcomingBookings = await Booking.find({
    $or: [
      { "staff_assignments.user_id": { $in: staffIds } },
      { event_manager_id: { $in: staffIds } }
    ],
    event_date: { $gte: now },
    status: { $nin: ["Cancelled", "cancelled", "refunded", "Completed", "completed"] }
  }).select("staff_assignments event_manager_id");

  const upcomingMap = new Map();
  upcomingBookings.forEach((b) => {
    const seen = new Set();
    if (b.event_manager_id) {
      const mId = String(b.event_manager_id);
      seen.add(mId);
      upcomingMap.set(mId, (upcomingMap.get(mId) || 0) + 1);
    }
    if (Array.isArray(b.staff_assignments)) {
      b.staff_assignments.forEach((sa) => {
        if (sa.user_id) {
          const sId = String(sa.user_id);
          if (!seen.has(sId)) {
            seen.add(sId);
            upcomingMap.set(sId, (upcomingMap.get(sId) || 0) + 1);
          }
        }
      });
    }
  });

  // If event_date query is provided, check availability on that date
  let unavailableSet = new Set();
  let unavailableReasonMap = new Map();
  let bookedMap = new Map();

  if (req.query.event_date) {
    const eventDate = new Date(req.query.event_date);
    const startOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const endOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);

    const [unavailabilities, bookedEvents] = await Promise.all([
      StaffAvailability.find({
        user_id: { $in: staffIds },
        date: { $gte: startOfDay, $lte: endOfDay },
        $or: [{ status: "approved" }, { status: { $exists: false } }, { status: null }]
      }).select("user_id reason"),
      Booking.find({
        $or: [
          { "staff_assignments.user_id": { $in: staffIds } },
          { event_manager_id: { $in: staffIds } }
        ],
        event_date: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["Cancelled", "cancelled", "refunded"] }
      })
        .populate("customer_id", "full_name first_name last_name")
        .select("staff_assignments event_manager_id event_date start_time duration_hours event_type reference status customer_id")
    ]);

    unavailabilities.forEach((u) => {
      unavailableSet.add(String(u.user_id));
      if (u.reason) unavailableReasonMap.set(String(u.user_id), u.reason);
    });
    bookedEvents.forEach((b) => {
      const custName = b.customer_id?.full_name 
        || `${b.customer_id?.first_name || ""} ${b.customer_id?.last_name || ""}`.trim() 
        || "Customer";
      const eventSummary = {
        booking_id: b._id,
        reference: b.reference || String(b._id).slice(-6).toUpperCase(),
        event_type: b.event_type,
        start_time: b.start_time || "",
        duration_hours: b.duration_hours,
        customer_name: custName,
        status: b.status
      };

      if (b.event_manager_id) {
        const mId = String(b.event_manager_id);
        if (!bookedMap.has(mId)) bookedMap.set(mId, []);
        bookedMap.get(mId).push({ ...eventSummary, assigned_as: "Event Manager" });
      }
      if (Array.isArray(b.staff_assignments)) {
        b.staff_assignments.forEach((sa) => {
          if (sa.user_id) {
            const sId = String(sa.user_id);
            if (!bookedMap.has(sId)) bookedMap.set(sId, []);
            bookedMap.get(sId).push({ ...eventSummary, assigned_as: sa.role || "Staff" });
          }
        });
      }
    });
  }

  const result = staff.map((member) => {
    const idStr = String(member._id);
    const isUnavailable = unavailableSet.has(idStr);
    const isBooked = bookedMap.has(idStr);
    const isConflict = isUnavailable && isBooked;
    const reasonText = unavailableReasonMap.get(idStr);

    let availabilityStatus = "Available";
    if (!member.is_active) {
      availabilityStatus = "Inactive";
    } else if (isConflict) {
      availabilityStatus = reasonText ? `Conflict (${reasonText})` : "Conflict";
    } else if (isUnavailable) {
      availabilityStatus = reasonText ? `Unavailable (${reasonText})` : "Unavailable";
    } else if (isBooked) {
      availabilityStatus = "Scheduled";
    }

    return {
      ...member,
      upcoming_count: upcomingMap.get(idStr) || 0,
      is_available: req.query.event_date ? (!isUnavailable && !isBooked && member.is_active) : member.is_active,
      availability_status: availabilityStatus,
      unavailability_reason: reasonText || "",
      scheduled_events: bookedMap.get(idStr) || []
    };
  });

  res.json(result);
});

exports.getStaffCalendar = asyncHandler(async (req, res) => {
  const staffId = req.params.id;
  const month = String(req.query.month || "").trim();
  const range = parseMonth(month);

  if (!range) {
    return res.status(400).json({ message: "Month must be YYYY-MM" });
  }

  const [member, availability, assignments] = await Promise.all([
    User.findById(staffId).select("full_name email phone role position is_active username").lean(),
    StaffAvailability.find({
      user_id: staffId,
      date: { $gte: range.start, $lte: range.end }
    }).populate("reviewed_by", "full_name role").lean(),
    Booking.find({
      $or: [
        { "staff_assignments.user_id": staffId },
        { event_manager_id: staffId }
      ],
      event_date: { $gte: range.start, $lte: range.end },
      status: { $nin: ["Cancelled", "cancelled", "refunded"] }
    })
      .populate("customer_id", "full_name first_name last_name")
      .select("event_date start_time duration_hours event_type reference status customer_id event_manager_id staff_assignments")
  ]);

  if (!member) {
    return res.status(404).json({ message: "Staff member or manager not found" });
  }

  const approvedAvailability = availability.filter(
    (item) => !item.status || item.status === "approved"
  );
  const pendingAvailability = availability.filter(
    (item) => item.status === "pending"
  );

  const unavailableDates = approvedAvailability.map((item) => toDateKey(item.date));
  const pendingDates = pendingAvailability.map((item) => toDateKey(item.date));
  const unavailableSet = new Set(unavailableDates);
  const pendingSet = new Set(pendingDates);

  const parsedAssignments = assignments.map((booking) => {
    const custName = booking.customer_id?.full_name 
      || `${booking.customer_id?.first_name || ""} ${booking.customer_id?.last_name || ""}`.trim() 
      || "Customer";
    const isManager = String(booking.event_manager_id) === String(staffId);
    const staffEntry = (booking.staff_assignments || []).find((sa) => String(sa.user_id) === String(staffId));
    const assignedAs = isManager ? "Event Manager" : (staffEntry?.role || member.position || "Staff");
    const dateKey = toDateKey(new Date(booking.event_date));
    const isConflict = unavailableSet.has(dateKey);
    const hasPendingRequest = pendingSet.has(dateKey);

    return {
      _id: booking._id,
      date: booking.event_date,
      date_key: dateKey,
      start_time: booking.start_time || "",
      duration_hours: booking.duration_hours,
      event_type: booking.event_type,
      reference: booking.reference || String(booking._id).slice(-6).toUpperCase(),
      customer_name: custName,
      status: booking.status,
      assigned_as: assignedAs,
      is_conflict: isConflict,
      has_pending_request: hasPendingRequest
    };
  });

  const conflictDates = Array.from(
    new Set(parsedAssignments.filter((a) => a.is_conflict).map((a) => a.date_key))
  );

  res.json({
    member,
    month,
    unavailable: unavailableDates,
    pending: pendingDates,
    records: availability.map((item) => ({
      _id: item._id,
      date: toDateKey(item.date),
      reason: item.reason || "",
      status: item.status || "approved",
      reviewed_by: item.reviewed_by ? {
        _id: item.reviewed_by._id,
        full_name: item.reviewed_by.full_name,
        role: item.reviewed_by.role
      } : null,
      reviewed_at: item.reviewed_at || null,
      rejection_reason: item.rejection_reason || "",
      request_id: item.request_id || null,
      created_at: item.createdAt
    })),
    conflicts: conflictDates,
    assignments: parsedAssignments
  });
});

