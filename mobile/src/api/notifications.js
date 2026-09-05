import client from "./client";

export const notificationsApi = {
  getMine: async (params = {}) => {
    const response = await client.get("/notifications/me", { params });
    return response.data;
  },

  markRead: async (id) => {
    const response = await client.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await client.patch("/notifications/read-all");
    return response.data;
  },
};

export default notificationsApi;
