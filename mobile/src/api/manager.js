import client from "./client";

export const managerApi = {
  getSummary: async () => {
    const response = await client.get("/manager/summary");
    return response.data;
  },

  getBookings: async (status = null) => {
    const params = status ? { status } : {};
    const response = await client.get("/manager/bookings", { params });
    return response.data;
  },

  getBooking: async (id) => {
    const response = await client.get(`/manager/bookings/${id}`);
    return response.data;
  },

  updateStaffAttendance: async (id, data) => {
    const response = await client.put(`/manager/bookings/${id}/staff-attendance`, data);
    return response.data;
  },

  updateEquipmentChecklist: async (id, data) => {
    const response = await client.put(`/manager/bookings/${id}/equipment-checklist`, data);
    return response.data;
  },

  markEquipmentChecklistDone: async (id) => {
    const response = await client.put(`/manager/bookings/${id}/equipment-checklist/done`);
    return response.data;
  },

  updateEquipmentNotes: async (id, data) => {
    const response = await client.put(`/manager/bookings/${id}/equipment-notes`, data);
    return response.data;
  },

  submitEquipmentReturns: async (id, data) => {
    const response = await client.put(`/manager/bookings/${id}/equipment-returns`, data);
    return response.data;
  },

  submitReport: async (id, data) => {
    const response = await client.put(`/manager/bookings/${id}/report`, data);
    return response.data;
  },

  addNote: async (id, note) => {
    const response = await client.put(`/manager/bookings/${id}/notes`, typeof note === "string" ? { note } : note);
    return response.data;
  },

  updateEquipment: async (id, inventory_items) => {
    const response = await client.put(`/manager/bookings/${id}/equipment`, {
      inventory_items,
    });
    return response.data;
  },

  verifyEquipment: async (id, { confirmed, additional_notes }) => {
    const response = await client.put(`/manager/bookings/${id}/verify-equipment`, {
      confirmed,
      additional_notes,
    });
    return response.data;
  },

  getStaff: async (params = {}) => {
    const response = await client.get("/manager/staff", { params });
    return response.data;
  },

  getStaffCalendar: async (id, month) => {
    const response = await client.get(`/manager/staff/${id}/calendar`, {
      params: { month },
    });
    return response.data;
  },

  getAvailability: async (month = "", params = {}) => {
    const response = await client.get("/manager/me/availability", {
      params: { month, ...params },
    });
    return response.data;
  },

  setAvailability: async (payload, dates) => {
    const body =
      typeof payload === "string" && Array.isArray(dates)
        ? { month: payload, dates }
        : payload;
    const response = await client.put("/manager/me/availability", body);
    return response.data;
  },

  removeAvailability: async (id) => {
    const url = id ? `/manager/me/availability/${id}` : "/manager/me/availability";
    const response = await client.delete(url);
    return response.data;
  },
};

export default managerApi;
