const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");

const asyncHandler = require("../utils/asyncHandler");
const { canAccessConversation } = require("../utils/chatAccess");
const { createNotification, notifyAdmins } = require("../utils/notify");

const ensureBookingConversations = async (bookings) => {
  const tasks = bookings
    .filter((booking) => booking.event_manager_id || booking.customer_id)
    .map((booking) => Conversation.findOneAndUpdate(
      { booking_id: booking._id },
      {
        $set: {
          type: "event",
          customer_id: booking.customer_id,
          ...(booking.event_manager_id ? { event_manager_id: booking.event_manager_id } : {})
        },
        $setOnInsert: { booking_id: booking._id }
      },
      { new: true, upsert: true }
    ));
  await Promise.all(tasks);
};

const ensureInquiryConversations = async (inquiries) => {
  const tasks = inquiries
    .filter((inquiry) => inquiry.customer_id)
    .map((inquiry) => Conversation.findOneAndUpdate(
      { inquiry_id: inquiry._id },
      {
        $set: {
          type: "inquiry",
          customer_id: inquiry.customer_id
        },
        $setOnInsert: { inquiry_id: inquiry._id }
      },
      { new: true, upsert: true }
    ));
  await Promise.all(tasks);
};

const ensureCustomerSupportConversation = async (customerId) => {
  await Conversation.findOneAndUpdate(
    {
      customer_id: customerId,
      type: "support",
      inquiry_id: { $exists: false },
      booking_id: { $exists: false }
    },
    {
      $set: { type: "support", customer_id: customerId }
    },
    { new: true, upsert: true }
  );
};

exports.listConversations = asyncHandler(async (req, res) => {
  if (req.user.role === "admin") {
    const [bookings, inquiries] = await Promise.all([
      Booking.find({}),
      Inquiry.find({})
    ]);
    await Promise.all([
      ensureBookingConversations(bookings),
      ensureInquiryConversations(inquiries)
    ]);
  }

  if (req.user.role === "customer") {
    const [bookings, inquiries] = await Promise.all([
      Booking.find({ customer_id: req.user._id }),
      Inquiry.find({ customer_id: req.user._id })
    ]);
    await Promise.all([
      ensureBookingConversations(bookings),
      ensureInquiryConversations(inquiries),
      ensureCustomerSupportConversation(req.user._id)
    ]);
  }

  if (req.user.role === "staff" || req.user.role === "manager") {
    const bookings = await Booking.find({ event_manager_id: req.user._id });
    await ensureBookingConversations(bookings);
  }

  const query = {};
  if (req.user.role === "customer") query.customer_id = req.user._id;
  if (req.user.role === "staff" || req.user.role === "manager") {
    query.$or = [
      { event_manager_id: req.user._id },
      { type: "support" }
    ];
  }

  const conversations = await Conversation.find(query)
    .populate("customer_id", "full_name email phone")
    .populate("event_manager_id", "full_name email")
    .populate("booking_id", "booking_number event_type event_date venue guests total_amount status")
    .populate("inquiry_id", "inquiry_number event_type event_date status")
    .sort({ last_message_at: -1, updatedAt: -1 });

  res.json(conversations);
});

exports.getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate("customer_id", "full_name email phone")
    .populate("event_manager_id", "full_name email")
    .populate("booking_id", "booking_number event_type event_date venue guests total_amount status package_id setup_equipment")
    .populate("inquiry_id", "inquiry_number event_type event_date status estimated_budget");

  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (!canAccessConversation(req.user, conversation)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  res.json(conversation);
});

exports.getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (!canAccessConversation(req.user, conversation)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const messages = await Message.find({ conversation_id: conversation._id })
    .populate("sender_id", "full_name role email")
    .sort({ createdAt: 1 });

  res.json(messages);
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (!canAccessConversation(req.user, conversation)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const body = String(req.body.body || "").trim();
  const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];

  if (!body && attachments.length === 0) {
    return res.status(400).json({ message: "Message body or attachment is required" });
  }

  const message = await Message.create({
    conversation_id: conversation._id,
    sender_id: req.user._id,
    body,
    attachments,
    read_by: [{ user_id: req.user._id, read_at: new Date() }]
  });

  const snippet = body || (attachments.length ? `[${attachments.length} attachment(s)]` : "New message");
  conversation.last_message = snippet.slice(0, 200);
  conversation.last_message_at = new Date();

  if (req.user.role === "customer") {
    conversation.unread_admin_count = (conversation.unread_admin_count || 0) + 1;
  } else {
    conversation.unread_customer_count = (conversation.unread_customer_count || 0) + 1;
  }
  await conversation.save();

  const populated = await message.populate("sender_id", "full_name role email");
  const io = req.app.get("io");
  if (io) {
    io.to(`conversation:${conversation._id}`).emit("message:new", populated);

    const senderId = String(req.user._id);
    const customerId = conversation.customer_id ? String(conversation.customer_id) : null;
    const managerId = conversation.event_manager_id ? String(conversation.event_manager_id) : null;
    const senderName = req.user.full_name || req.user.email || "Someone";

    if (customerId && senderId !== customerId) {
      await createNotification({
        userId: customerId,
        title: "New message",
        body: `${senderName}: "${snippet.slice(0, 60)}"`,
        type: "info",
        link: `/customer/messages/${conversation._id}`,
        meta: { conversation_id: conversation._id }
      }, io);
    }

    if (req.user.role === "customer") {
      if (managerId && senderId !== managerId) {
        await createNotification({
          userId: managerId,
          title: "New customer message",
          body: `${senderName}: "${snippet.slice(0, 60)}"`,
          type: "info",
          link: `/manager/messages/${conversation._id}`,
          meta: { conversation_id: conversation._id }
        }, io);
      }
      await notifyAdmins({
        title: "New customer message",
        body: `${senderName}: "${snippet.slice(0, 60)}"`,
        type: "info",
        link: `/admin/messages/${conversation._id}`,
        meta: { conversation_id: conversation._id }
      }, io);
    }
  }

  res.status(201).json(populated);
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (!canAccessConversation(req.user, conversation)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (req.user.role === "customer") {
    conversation.unread_customer_count = 0;
  } else {
    conversation.unread_admin_count = 0;
  }
  await conversation.save();

  await Message.updateMany(
    { conversation_id: conversation._id, "read_by.user_id": { $ne: req.user._id } },
    { $push: { read_by: { user_id: req.user._id, read_at: new Date() } } }
  );

  res.json({ ok: true, conversation_id: conversation._id });
});

exports.createConversation = asyncHandler(async (req, res) => {
  const { booking_id, inquiry_id, customer_id } = req.body;

  if (booking_id) {
    const booking = await Booking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const isCustomer = String(booking.customer_id) === String(req.user._id);
    const isManager = booking.event_manager_id && String(booking.event_manager_id) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isManager && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { booking_id: booking._id },
      {
        $set: {
          type: "event",
          customer_id: booking.customer_id,
          ...(booking.event_manager_id ? { event_manager_id: booking.event_manager_id } : {})
        },
        $setOnInsert: { booking_id: booking._id }
      },
      { new: true, upsert: true }
    );

    return res.status(201).json(conversation);
  }

  if (inquiry_id) {
    const inquiry = await Inquiry.findById(inquiry_id);
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

    const isCustomer = String(inquiry.customer_id) === String(req.user._id);
    const isAdmin = req.user.role === "admin" || req.user.role === "manager";

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { inquiry_id: inquiry._id },
      {
        $set: {
          type: "inquiry",
          customer_id: inquiry.customer_id
        },
        $setOnInsert: { inquiry_id: inquiry._id }
      },
      { new: true, upsert: true }
    );

    return res.status(201).json(conversation);
  }

  const targetCustomerId = customer_id || (req.user.role === "customer" ? req.user._id : null);
  if (targetCustomerId) {
    let conversation = await Conversation.findOne({
      customer_id: targetCustomerId,
      type: "support",
      inquiry_id: { $exists: false },
      booking_id: { $exists: false }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: "support",
        customer_id: targetCustomerId
      });
    }
    return res.status(201).json(conversation);
  }

  return res.status(400).json({ message: "Invalid conversation payload" });
});

