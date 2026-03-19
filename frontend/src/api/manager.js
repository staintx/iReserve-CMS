import api from "./axios";

export const ManagerAPI = {
  getSummary: () => api.get("/manager/summary"),
  getBookings: (status) => api.get("/manager/bookings", { params: status ? { status } : {} }),
  getBooking: (id) => api.get(`/manager/bookings/${id}`),
  assignStaff: (id, data) => api.put(`/manager/bookings/${id}/assign-staff`, data),
  addNote: (id, data) => api.put(`/manager/bookings/${id}/notes`, data),
  updateEquipment: (id, data) => api.put(`/manager/bookings/${id}/equipment`, data),
  markCompleted: (id) => api.put(`/manager/bookings/${id}/complete`),
  getStaff: () => api.get("/manager/staff"),
  getStaffCalendar: (id, month) => api.get(`/manager/staff/${id}/calendar`, { params: { month } })
};
