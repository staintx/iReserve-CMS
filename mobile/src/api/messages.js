import client from "./client";

export const messagesApi = {
  listConversations: async () => {
    const response = await client.get("/messages/conversations");
    return response.data;
  },

  getConversation: async (id) => {
    const response = await client.get(`/messages/conversations/${id}`);
    return response.data;
  },

  getMessages: async (id) => {
    const response = await client.get(`/messages/conversations/${id}/messages`);
    return response.data;
  },

  sendMessage: async (id, bodyOrPayload) => {
    const payload = typeof bodyOrPayload === "string" ? { body: bodyOrPayload } : bodyOrPayload;
    const response = await client.post(`/messages/conversations/${id}/messages`, payload);
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await client.patch(`/messages/conversations/${id}/read`);
    return response.data;
  },

  createConversation: async (payload) => {
    const response = await client.post("/messages/conversations", payload);
    return response.data;
  },
};

export default messagesApi;
