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

export const sendMessage = async (id, body) => {
  const { data } = await api.post(`/messages/conversations/${id}/messages`, { body });
  return data;
};

export const createConversation = async (payload) => {
  const { data } = await api.post("/messages/conversations", payload);
  return data;
};
