import api from "./axios";

export const AdminAPI = {
  // Dashboard
  getSummary: () => api.get("/reports/summary"),

  // Inquiries
  getInquiries: () => api.get("/inquiries"),
  updateInquiry: (id, data) => api.put(`/inquiries/${id}`, data),

  // Bookings
  getBookings: () => api.get("/bookings"),
  createBookingFromInquiry: (id, data) => api.post(`/bookings/from-inquiry/${id}`, data),
  updateBooking: (id, data) => api.put(`/bookings/${id}`, data),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),

  // Payments
  getPayments: () => api.get("/payments"),
  updatePayment: (id, data) => api.put(`/payments/${id}`, data),

  // Packages
  getPackages: () => api.get("/packages"),
  createPackage: (data) => api.post("/packages", data),
  updatePackage: (id, data) => api.put(`/packages/${id}`, data),
  deletePackage: (id) => api.delete(`/packages/${id}`),

  // Menu
  getMenu: () => api.get("/menu"),
  createMenu: (data) => api.post("/menu", data),
  updateMenu: (id, data) => api.put(`/menu/${id}`, data),
  deleteMenu: (id) => api.delete(`/menu/${id}`),

  // Inventory
  getInventory: () => api.get("/inventory"),
  createInventory: (data) => api.post("/inventory", data),
  updateInventory: (id, data) => api.put(`/inventory/${id}`, data),
  deleteInventory: (id) => api.delete(`/inventory/${id}`),

  // Gallery
  getGallery: () => api.get("/gallery"),
  createGallery: (data) => api.post("/gallery", data),
  updateGallery: (id, data) => api.put(`/gallery/${id}`, data),
  deleteGallery: (id) => api.delete(`/gallery/${id}`),

  // Staff
  getStaff: () => api.get("/staff"),
  createStaff: (data) => api.post("/staff", data),
  updateStaff: (id, data) => api.put(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),

  // Ratings
  getRatings: () => api.get("/ratings"),

  // Logs
  getLogs: () => api.get("/systemlogs")
};