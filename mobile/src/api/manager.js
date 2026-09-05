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

  assignStaff: async (id, staff_assignments) => {
    const response = await client.put(`/manager/bookings/${id}/assign-staff`, {
      staff_assignments,
    });
    return response.data;
  },

  addNote: async (id, note) => {
    const response = await client.put(`/manager/bookings/${id}/notes`, { note });
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

  markCompleted: async (id) => {
    const response = await client.put(`/manager/bookings/${id}/complete`);
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

  getAvailability: async (month) => {
    const response = await client.get("/manager/me/availability", {
      params: { month },
    });
    return response.data;
  },

  setAvailability: async (month, dates) => {
    const response = await client.put("/manager/me/availability", {
      month,
      dates,
    });
    return response.data;
  },

  // Quotation operations
  getAllQuotations: async () => {
    const response = await client.get("/quotations");
    return response.data;
  },

  createQuotation: async (data) => {
    const response = await client.post("/quotations", data);
    return response.data;
  },
};

export default managerApi;
