import api from "./axios";

export const StaffAPI = {
  getBookings: (status) => api.get("/staff/me/bookings", { params: status ? { status } : {} }),
  getAvailability: (month) => api.get("/staff/me/availability", { params: { month } }),
  setAvailability: (month, dates) => api.put("/staff/me/availability", { month, dates })
};
