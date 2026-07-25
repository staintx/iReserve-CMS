const canAccessConversation = (user, conversation) => {
  if (!user || !conversation) return false;
  if (user.role === "admin") return true;
  if (String(conversation.customer_id) === String(user._id)) return true;
  if (conversation.event_manager_id && String(conversation.event_manager_id) === String(user._id)) return true;
  return false;
};

module.exports = { canAccessConversation };
