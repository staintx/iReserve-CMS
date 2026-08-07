const canAccessConversation = (user, conversation) => {
  if (!user || !conversation) return false;
  if (user.role === "admin") return true;

  const userId = String(user._id || "");
  const customerId = conversation.customer_id?._id 
    ? String(conversation.customer_id._id) 
    : String(conversation.customer_id || "");
  const managerId = conversation.event_manager_id?._id 
    ? String(conversation.event_manager_id._id) 
    : String(conversation.event_manager_id || "");

  if (customerId && customerId === userId) return true;
  if (managerId && managerId === userId) return true;
  if (user.role === "manager" || user.role === "staff") return true;

  return false;
};

module.exports = { canAccessConversation };
