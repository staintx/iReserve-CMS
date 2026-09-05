import client from "./client";

export const zelleApi = {
  chat: async ({ message, conversation_id, session_id }) => {
    const response = await client.post("/zelle/customer/chat", {
      message,
      conversation_id,
      session_id,
    });
    return response.data;
  },

  getHistory: async (session_id) => {
    const response = await client.get("/zelle/customer/history", {
      params: { session_id },
    });
    return response.data;
  },

  clearHistory: async (conversation_id) => {
    const response = await client.post("/zelle/customer/clear", {
      conversation_id,
    });
    return response.data;
  },
};

export default zelleApi;
