import api from "./axios";

export const StaffAPI = {
  getBookings: (status) => api.get("/staff/me/bookings", { params: status ? { status } : {} }),
  getBooking: (id) => api.get(`/staff/me/bookings/${id}`),
  getAvailability: (month, params = {}) => api.get("/staff/me/availability", { params: { month, ...params } }),
  setAvailability: (payload, dates) => {
    if (typeof payload === "string" && Array.isArray(dates)) {
      return api.put("/staff/me/availability", { month: payload, dates });
    }
    return api.put("/staff/me/availability", payload);
  },
  removeAvailability: (id) => api.delete(`/staff/me/availability/${id}`),
  submitReport: (id, data) => api.put(`/staff/me/bookings/${id}/report`, data),
  submitEquipmentReturns: (id, data) => api.put(`/staff/me/bookings/${id}/equipment-returns`, data),
  completeEvent: (id, data) => api.put(`/staff/me/bookings/${id}/complete`, data)
};
