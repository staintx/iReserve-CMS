const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");
const asyncHandler = require("../utils/asyncHandler");
const { canAccessConversation } = require("../utils/chatAccess");
const { createNotification } = require("../utils/notify");

const ensureBookingConversations = async (bookings) => {
  const tasks = bookings
    .filter((booking) => booking.manager_id)
    .map((booking) => Conversation.findOneAndUpdate(
      { booking_id: booking._id },
      {
        $set: {
          type: "event",
          customer_id: booking.customer_id,
          manager_id: booking.manager_id
        },
        $setOnInsert: { booking_id: booking._id }
      },
      { new: true, upsert: true }
    ));
  await Promise.all(tasks);
};

const ensureInquiryConversations = async (inquiries) => {
  const tasks = inquiries.map((inquiry) => Conversation.findOneAndUpdate(
    { inquiry_id: inquiry._id },
    {
      $set: {
        type: "support",
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
    const bookings = await Booking.find({ manager_id: { $ne: null } });
    const inquiries = await Inquiry.find();
    await ensureBookingConversations(bookings);
    await ensureInquiryConversations(inquiries);
  }

  if (req.user.role === "customer") {
    const bookings = await Booking.find({ customer_id: req.user._id });
    const inquiries = await Inquiry.find({ customer_id: req.user._id });
    await ensureBookingConversations(bookings);
    await ensureInquiryConversations(inquiries);
    await ensureCustomerSupportConversation(req.user._id);
  }

  if (req.user.role === "manager") {
    const bookings = await Booking.find({ manager_id: req.user._id });
    await ensureBookingConversations(bookings);
  }

  const query = {};
  if (req.user.role === "customer") query.customer_id = req.user._id;
  if (req.user.role === "manager") query.manager_id = req.user._id;

  const conversations = await Conversation.find(query)
    .populate("customer_id", "full_name email")
    .populate("manager_id", "full_name email")
    .populate("booking_id", "event_type event_date")
    .populate("inquiry_id", "event_type event_date")
    .sort({ last_message_at: -1, updatedAt: -1 });

  res.json(conversations);
});

exports.getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate("customer_id", "full_name email")
    .populate("manager_id", "full_name email")
    .populate("booking_id", "event_type event_date")
    .populate("inquiry_id", "event_type event_date");

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
    .populate("sender_id", "full_name role")
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
  if (!body) return res.status(400).json({ message: "Message body is required" });

  const message = await Message.create({
    conversation_id: conversation._id,
    sender_id: req.user._id,
    body
  });

  conversation.last_message = body.slice(0, 200);
  conversation.last_message_at = new Date();
  await conversation.save();

  const populated = await message.populate("sender_id", "full_name role");
  const io = req.app.get("io");
  if (io) {
    io.to(`conversation:${conversation._id}`).emit("message:new", populated);

    const senderId = String(req.user._id);
    const customerId = conversation.customer_id ? String(conversation.customer_id) : null;
    const managerId = conversation.manager_id ? String(conversation.manager_id) : null;
    const senderName = req.user.full_name || req.user.email || "Someone";

    if (customerId && senderId !== customerId) {
      await createNotification({
        userId: customerId,
        title: "New message",
        body: `${senderName} sent you a message.`,
        type: "info",
        link: `/customer/messages/${conversation._id}`,
        meta: { conversation_id: conversation._id }
      }, io);
    }

    if (managerId && senderId !== managerId) {
      await createNotification({
        userId: managerId,
        title: "New message",
        body: `${senderName} sent you a message.`,
        type: "info",
        link: `/manager/messages/${conversation._id}`,
        meta: { conversation_id: conversation._id }
      }, io);
    }
  }

  res.status(201).json(populated);
});

exports.createConversation = asyncHandler(async (req, res) => {
  const { booking_id, inquiry_id, customer_id } = req.body;

  if (booking_id) {
    const booking = await Booking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const isCustomer = String(booking.customer_id) === String(req.user._id);
    const isManager = booking.manager_id && String(booking.manager_id) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isManager && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!booking.manager_id) {
      return res.status(400).json({ message: "Booking has no assigned manager" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { booking_id: booking._id },
      {
        $set: {
          type: "event",
          customer_id: booking.customer_id,
          manager_id: booking.manager_id
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
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { inquiry_id: inquiry._id },
      {
        $set: {
          type: "support",
          customer_id: inquiry.customer_id
        },
        $setOnInsert: { inquiry_id: inquiry._id }
      },
      { new: true, upsert: true }
    );

    return res.status(201).json(conversation);
  }

  if (customer_id && req.user.role === "admin") {
    const conversation = await Conversation.create({
      type: "support",
      customer_id
    });
    return res.status(201).json(conversation);
  }

  return res.status(400).json({ message: "Invalid conversation payload" });
});
