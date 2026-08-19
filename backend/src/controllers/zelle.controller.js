const asyncHandler = require("../utils/asyncHandler");
const ZelleConversation = require("../models/ZelleConversation");
const { chatWithZelle, analyzeFeedbackInsights } = require("../services/zelleService");
const { executeTool } = require("../services/zelleToolExecutor");

// Customer AI Concierge Chat
exports.customerChat = asyncHandler(async (req, res) => {
  const { message, conversation_id, session_id } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: "Message text is required." });
  }

  const io = req.app.get("io");
  const result = await chatWithZelle({
    message: String(message).trim(),
    conversationId: conversation_id || null,
    sessionId: session_id || null,
    user: req.user || null,
    context: "customer",
    io,
  });

  res.json(result);
});

// Get Active Customer Conversation
exports.getCustomerHistory = asyncHandler(async (req, res) => {
  let conversation = null;

  if (req.user) {
    conversation = await ZelleConversation.findOne({
      user_id: req.user._id,
      context: "customer",
      status: "active",
    }).sort({ updatedAt: -1 });
  } else if (req.query.session_id) {
    conversation = await ZelleConversation.findOne({
      session_id: req.query.session_id,
      context: "customer",
      status: "active",
    }).sort({ updatedAt: -1 });
  }

  if (!conversation) {
    return res.json({ messages: [], conversation_id: null });
  }

  res.json({
    conversation_id: conversation._id,
    messages: conversation.messages.map((m) => ({
      role: m.role,
      text: typeof m.parts === "string" ? m.parts : m.parts?.[0]?.text || m.parts?.text || "",
      ui_cards: m.ui_cards || [],
      timestamp: m.timestamp,
    })),
  });
});

// Get All Customer Conversation Sessions
exports.getCustomerConversations = asyncHandler(async (req, res) => {
  let query = { context: "customer" };
  if (req.user) {
    query.user_id = req.user._id;
  } else if (req.query.session_id) {
    query.session_id = req.query.session_id;
  } else {
    return res.json({ conversations: [] });
  }

  const convs = await ZelleConversation.find(query)
    .sort({ updatedAt: -1 })
    .limit(25)
    .lean();

  const list = convs.map((c) => {
    const firstUserMsg = c.messages.find((m) => m.role === "user");
    const text = typeof firstUserMsg?.parts === "string"
      ? firstUserMsg.parts
      : Array.isArray(firstUserMsg?.parts)
      ? firstUserMsg.parts.map((p) => p?.text || "").join(" ")
      : firstUserMsg?.parts?.text || "";
    
    const title = text ? text.slice(0, 45) : "New Catering Consultation";

    return {
      id: c._id,
      title,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
      message_count: c.messages.length,
      status: c.status,
    };
  });

  res.json({ conversations: list });
});

// Get Specific Customer Conversation by ID
exports.getCustomerConversationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversation = await ZelleConversation.findById(id).lean();
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found." });
  }

  if (req.user && conversation.user_id && String(conversation.user_id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Access denied." });
  }

  res.json({
    conversation_id: conversation._id,
    messages: conversation.messages.map((m) => ({
      role: m.role,
      text: typeof m.parts === "string" ? m.parts : m.parts?.[0]?.text || m.parts?.text || "",
      ui_cards: m.ui_cards || [],
      timestamp: m.timestamp,
    })),
    updatedAt: conversation.updatedAt,
  });
});

// Delete a Specific Conversation Session
exports.deleteCustomerConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversation = await ZelleConversation.findById(id);
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found." });
  }

  if (req.user && conversation.user_id && String(conversation.user_id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Access denied." });
  }

  await ZelleConversation.findByIdAndDelete(id);
  res.json({ success: true, message: "Conversation deleted successfully." });
});

// Clear / Reset Customer Conversation
exports.clearCustomerHistory = asyncHandler(async (req, res) => {
  const { conversation_id } = req.body;

  if (conversation_id) {
    await ZelleConversation.findByIdAndUpdate(conversation_id, { status: "archived" });
  } else if (req.user) {
    await ZelleConversation.updateMany(
      { user_id: req.user._id, context: "customer" },
      { status: "archived" }
    );
  }

  res.json({ success: true, message: "Zelle AI conversation reset." });
});

// Admin AI Copilot Chat
exports.adminChat = asyncHandler(async (req, res) => {
  const { message, conversation_id } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: "Message text is required." });
  }

  const io = req.app.get("io");
  const result = await chatWithZelle({
    message: String(message).trim(),
    conversationId: conversation_id || null,
    user: req.user,
    context: "admin",
    io,
  });

  res.json(result);
});

// Admin: AI Quotation Recommendation Draft
exports.adminDraftQuotation = asyncHandler(async (req, res) => {
  const { inquiry_id, package_id, addon_names } = req.body;

  if (!inquiry_id) {
    return res.status(400).json({ message: "inquiry_id is required." });
  }

  const draft = await executeTool("draft_quotation", {
    inquiry_id,
    package_id,
    addon_names,
  }, { user: req.user });

  res.json(draft);
});

// Admin: AI Response Draft
exports.adminDraftResponse = asyncHandler(async (req, res) => {
  const { conversation_id, intent_notes } = req.body;

  if (!conversation_id) {
    return res.status(400).json({ message: "conversation_id is required." });
  }

  const io = req.app.get("io");
  const prompt = `Draft a polite and professional catering response for conversation ID '${conversation_id}'. Intent notes: ${intent_notes || "Answer customer inquiry and propose next steps"}.`;

  const result = await chatWithZelle({
    message: prompt,
    user: req.user,
    context: "admin",
    io,
  });

  res.json({
    draft: result.text,
  });
});

// Admin: Feedback Summarization
exports.adminFeedbackSummary = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 90;
  const summary = await analyzeFeedbackInsights({ days });
  res.json(summary);
});
