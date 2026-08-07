import api from "./axios";

export const listConversations = async () => {
  const { data } = await api.get("/messages/conversations");
  return data;
};

export const getConversation = async (id) => {
  const { data } = await api.get(`/messages/conversations/${id}`);
  return data;
};

export const getMessages = async (id) => {
  const { data } = await api.get(`/messages/conversations/${id}/messages`);
  return data;
};

export const sendMessage = async (id, bodyOrPayload) => {
  const payload = typeof bodyOrPayload === "string" ? { body: bodyOrPayload } : bodyOrPayload;
  const { data } = await api.post(`/messages/conversations/${id}/messages`, payload);
  return data;
};

export const markConversationAsRead = async (id) => {
  const { data } = await api.patch(`/messages/conversations/${id}/read`);
  return data;
};

export const createConversation = async (payload) => {
  const { data } = await api.post("/messages/conversations", payload);
  return data;
};
