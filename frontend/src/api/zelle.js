import api from "./axios";

export const sendZelleCustomerMessage = async ({ message, conversation_id, session_id }) => {
  const { data } = await api.post("/zelle/customer/chat", {
    message,
    conversation_id,
    session_id,
  });
  return data;
};

export const getZelleCustomerHistory = async (session_id) => {
  const { data } = await api.get("/zelle/customer/history", {
    params: { session_id },
  });
  return data;
};

export const getZelleConversations = async (session_id) => {
  const { data } = await api.get("/zelle/customer/conversations", {
    params: { session_id },
  });
  return data;
};

export const getZelleConversationById = async (id) => {
  const { data } = await api.get(`/zelle/customer/conversations/${id}`);
  return data;
};

export const deleteZelleConversation = async (id) => {
  const { data } = await api.delete(`/zelle/customer/conversations/${id}`);
  return data;
};

export const clearZelleCustomerHistory = async (conversation_id) => {
  const { data } = await api.post("/zelle/customer/clear", { conversation_id });
  return data;
};

export const sendZelleAdminMessage = async ({ message, conversation_id }) => {
  const { data } = await api.post("/zelle/admin/chat", {
    message,
    conversation_id,
  });
  return data;
};

export const getZelleQuotationDraft = async ({ inquiry_id, package_id, addon_names }) => {
  const { data } = await api.post("/zelle/admin/draft-quotation", {
    inquiry_id,
    package_id,
    addon_names,
  });
  return data;
};

export const getZelleResponseDraft = async ({ conversation_id, intent_notes }) => {
  const { data } = await api.post("/zelle/admin/draft-response", {
    conversation_id,
    intent_notes,
  });
  return data;
};

export const getZelleFeedbackSummary = async (days = 90) => {
  const { data } = await api.get("/zelle/admin/feedback-summary", {
    params: { days },
  });
  return data;
};
