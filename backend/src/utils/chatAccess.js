const canAccessConversation = (user, conversation) => {
  if (!user || !conversation) return false;
  if (user.role === "admin") return true;

  const userId = String(user._id || "");
  const customerId = conversation.customer_id?._id 
    ? String(conversation.customer_id._id) 
    : String(conversation.customer_id || "");

  if (user.role === "customer" && customerId && customerId === userId) return true;

  return false;
};

module.exports = { canAccessConversation };

