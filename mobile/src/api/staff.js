import client from "./client";

export const staffApi = {
  getBookings: async (status = null) => {
    const params = status ? { status } : {};
    const response = await client.get("/staff/me/bookings", { params });
    return response.data;
  },
  getMyBookings: async (status = null) => {
    const params = status ? { status } : {};
    const response = await client.get("/staff/me/bookings", { params });
    return response.data;
  },

  getBooking: async (id) => {
    const response = await client.get(`/staff/me/bookings/${id}`);
    return response.data;
  },
  getMyBooking: async (id) => {
    const response = await client.get(`/staff/me/bookings/${id}`);
    return response.data;
  },

  getAvailability: async (month = "", params = {}) => {
    const response = await client.get("/staff/me/availability", {
      params: { month, ...params },
    });
    return response.data;
  },
  getMyAvailability: async (month = "", params = {}) => {
    const response = await client.get("/staff/me/availability", {
      params: { month, ...params },
    });
    return response.data;
  },

  setAvailability: async (payload, dates) => {
    const body =
      typeof payload === "string" && Array.isArray(dates)
        ? { month: payload, dates }
        : payload;
    const response = await client.put("/staff/me/availability", body);
    return response.data;
  },
  setMyAvailability: async (payload, dates) => {
    const body =
      typeof payload === "string" && Array.isArray(dates)
        ? { month: payload, dates }
        : payload;
    const response = await client.put("/staff/me/availability", body);
    return response.data;
  },

  removeAvailability: async (id, config = {}) => {
    let url = "/staff/me/availability";
    if (id && !String(id).startsWith("temp-") && !String(id).startsWith("init-")) {
      url = `/staff/me/availability/${id}`;
    }
    const response = await client.delete(url, config);
    return response.data;
  },
};

export default staffApi;
