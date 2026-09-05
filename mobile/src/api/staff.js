import client from "./client";

export const staffApi = {
  getMyBookings: async (status = null) => {
    const params = status ? { status } : {};
    const response = await client.get("/staff/me/bookings", { params });
    return response.data;
  },

  getMyBooking: async (id) => {
    const response = await client.get(`/staff/me/bookings/${id}`);
    return response.data;
  },

  submitReport: async (id, { note, role }) => {
    const response = await client.put(`/staff/me/bookings/${id}/report`, {
      note,
      role,
    });
    return response.data;
  },

  submitEquipmentReturns: async (id, { returns, note }) => {
    const response = await client.put(`/staff/me/bookings/${id}/equipment-returns`, {
      returns,
      note,
    });
    return response.data;
  },

  completeEvent: async (id, { note, role, returns } = {}) => {
    const response = await client.put(`/staff/me/bookings/${id}/complete`, {
      note,
      role,
      returns,
    });
    return response.data;
  },

  getMyAvailability: async (month) => {
    const response = await client.get("/staff/me/availability", {
      params: { month },
    });
    return response.data;
  },

  setMyAvailability: async (month, dates) => {
    const response = await client.put("/staff/me/availability", {
      month,
      dates,
    });
    return response.data;
  },
};

export default staffApi;
