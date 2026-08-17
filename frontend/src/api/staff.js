import api from "./axios";

export const StaffAPI = {
  getBookings: (status) => api.get("/staff/me/bookings", { params: status ? { status } : {} }),
  getBooking: (id) => api.get(`/staff/me/bookings/${id}`),
  getAvailability: (month) => api.get("/staff/me/availability", { params: { month } }),
  setAvailability: (month, dates) => api.put("/staff/me/availability", { month, dates }),
  submitReport: (id, data) => api.put(`/staff/me/bookings/${id}/report`, data),
  submitEquipmentReturns: (id, data) => api.put(`/staff/me/bookings/${id}/equipment-returns`, data),
  completeEvent: (id, data) => api.put(`/staff/me/bookings/${id}/complete`, data)
};
