/**
 * Chat formatting and deduplication helpers for mobile messaging.
 * Aligned with web InboxHub logic.
 */

export const getConversationTitle = (conv, currentUser) => {
  if (!conv) return "Conversation";
  if (conv.booking_id?.event_type) {
    const d = conv.booking_id.event_date
      ? new Date(conv.booking_id.event_date).toLocaleDateString(undefined, {
          month: "short",
          day: "2-digit",
        })
      : "";
    return `${conv.booking_id.event_type} ${d ? `(${d})` : ""}`.trim();
  }
  if (conv.inquiry_id?.event_type) {
    const d = conv.inquiry_id.event_date
      ? new Date(conv.inquiry_id.event_date).toLocaleDateString(undefined, {
          month: "short",
          day: "2-digit",
        })
      : "";
    return `Inquiry: ${conv.inquiry_id.event_type} ${d ? `(${d})` : ""}`.trim();
  }
  if (currentUser?.role === "customer") {
    return conv.event_manager_id?.full_name || "Caezelle's Event Support";
  }
  return (
    conv.customer_id?.full_name ||
    conv.customer_id?.email ||
    "Caezelle's Event Support"
  );
};

export const getThreadSubtitle = (conv, currentUser) => {
  if (currentUser?.role === "customer") {
    if (conv.event_manager_id?.full_name) {
      return `Manager: ${conv.event_manager_id.full_name}`;
    }
    return "Support Team";
  }
  return conv.customer_id?.full_name || conv.customer_id?.email || "Customer";
};

export const getCodeBadge = (conv) => {
  if (conv?.booking_id?._id || conv?.booking_id?.booking_number) {
    const idStr =
      conv.booking_id.booking_number ||
      String(conv.booking_id._id).slice(-6).toUpperCase();
    return { text: `EVT-${idStr}`, type: "event" };
  }
  if (conv?.inquiry_id?._id || conv?.inquiry_id?.inquiry_number) {
    const idStr =
      conv.inquiry_id.inquiry_number ||
      String(conv.inquiry_id._id).slice(-6).toUpperCase();
    return { text: `INQ-${idStr}`, type: "inquiry" };
  }
  return { text: "SUPPORT", type: "support" };
};

const getMessageConversationId = (msg) => {
  if (!msg?.conversation_id) return null;
  return typeof msg.conversation_id === "object"
    ? String(msg.conversation_id?._id || "")
    : String(msg.conversation_id);
};

/**
 * Robust message deduplication & merging.
 * Handles optimistic messages, socket events, and HTTP response race conditions.
 */
export const mergeMessageIntoList = (list, message) => {
  if (!message || typeof message !== "object") {
    return Array.isArray(list) ? list : [];
  }

  const safeList = Array.isArray(list) ? list.filter(Boolean) : [];

  const targetConvId = getMessageConversationId(message);
  const cleanList = targetConvId
    ? safeList.filter((item) => {
        const itemConvId = getMessageConversationId(item);
        return !itemConvId || itemConvId === targetConvId;
      })
    : safeList;

  const clientMessageId = message.client_message_id;
  const messageId = message._id ? String(message._id) : null;
  const msgBody = String(message.body || "").trim();
  const senderId = message.sender_id?._id || message.sender_id;

  const matchIndex = cleanList.findIndex((item) => {
    if (!item || typeof item !== "object") return false;
    const itemClientMsgId = item.client_message_id;
    const itemId = item._id ? String(item._id) : null;

    // 1. Direct client_message_id match
    if (
      clientMessageId &&
      (itemClientMsgId === clientMessageId || itemId === clientMessageId)
    ) {
      return true;
    }

    // 2. Direct _id match
    if (
      messageId &&
      (itemId === messageId || itemClientMsgId === messageId)
    ) {
      return true;
    }

    // 3. Fallback: match an optimistic message from same sender with identical body
    // within 30 seconds of creation
    if (
      item.isOptimistic &&
      msgBody &&
      item.body === msgBody &&
      String(item.sender_id?._id || item.sender_id || "") === String(senderId || "")
    ) {
      const timeDiff = Math.abs(
        new Date(item.createdAt || Date.now()).getTime() -
          new Date(message.createdAt || Date.now()).getTime()
      );
      if (timeDiff < 30000) {
        return true;
      }
    }

    return false;
  });

  let next;
  if (matchIndex === -1) {
    next = [...cleanList, message];
  } else {
    next = [...cleanList];
    next[matchIndex] = {
      ...next[matchIndex],
      ...message,
      isOptimistic: message.isOptimistic ?? false,
    };
  }

  // Deduplicate completely using seen Set
  const seenKeys = new Set();
  const result = [];
  for (const m of next) {
    if (!m || typeof m !== "object") continue;
    const key = m._id
      ? String(m._id)
      : m.client_message_id
      ? String(m.client_message_id)
      : null;

    if (key) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
    }
    result.push(m);
  }

  return result.sort((a, b) => {
    const timeA = new Date(a?.createdAt || 0).getTime() || 0;
    const timeB = new Date(b?.createdAt || 0).getTime() || 0;
    return timeA - timeB;
  });
};
