import api from "./axios";

export const ManagerAPI = {
  getSummary: () => api.get("/manager/summary"),
  getAvailability: (month, params = {}) => api.get("/manager/me/availability", { params: { month, ...params } }),
  setAvailability: (payload, dates) => {
    if (typeof payload === "string" && Array.isArray(dates)) {
      return api.put("/manager/me/availability", { month: payload, dates });
    }
    return api.put("/manager/me/availability", payload);
  },
  removeAvailability: (id) => api.delete(`/manager/me/availability/${id}`),
  getBookings: (status) => api.get("/manager/bookings", { params: status ? { status } : {} }),
  getBooking: (id) => api.get(`/manager/bookings/${id}`),
  assignStaff: (id, data) => api.put(`/manager/bookings/${id}/assign-staff`, data),
  addNote: (id, data) => api.put(`/manager/bookings/${id}/notes`, data),
  submitReport: (id, data) => api.put(`/manager/bookings/${id}/report`, data),
  updateStaffAttendance: (id, data) => api.put(`/manager/bookings/${id}/staff-attendance`, data),
  submitEquipmentReturns: (id, data) => api.put(`/manager/bookings/${id}/equipment-returns`, data),
  updateEquipmentChecklist: (id, data) => api.put(`/manager/bookings/${id}/equipment-checklist`, data),
  markEquipmentChecklistDone: (id) => api.put(`/manager/bookings/${id}/equipment-checklist/done`),
  updateEquipmentNotes: (id, data) => api.put(`/manager/bookings/${id}/equipment-notes`, data),
  updateEquipment: (id, data) => api.put(`/manager/bookings/${id}/equipment`, data),
  verifyEquipment: (id, data) => api.put(`/manager/bookings/${id}/verify-equipment`, data),
  markCompleted: (id, data) => api.put(`/manager/bookings/${id}/complete`, data),
  getStaff: (params) => api.get("/manager/staff", { params }),
  getStaffCalendar: (id, month) => api.get(`/manager/staff/${id}/calendar`, { params: { month } }),
  getAvailabilityRequests: (params) => api.get("/manager/availability-requests", { params }),
  approveAvailabilityRequest: (id) => api.put(`/manager/availability-requests/${id}/approve`),
  rejectAvailabilityRequest: (id, data) => api.put(`/manager/availability-requests/${id}/reject`, data),
  batchApproveAvailabilityRequests: (data) => api.post("/manager/availability-requests/batch-approve", data),
  batchRejectAvailabilityRequests: (data) => api.post("/manager/availability-requests/batch-reject", data)
};
