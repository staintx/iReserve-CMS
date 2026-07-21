import api from "./axios";

export const AdminAPI = {
  // Profile
  getProfile: () => api.get("/users/me"),
  updateProfile: (data) => api.put("/users/me", data),
  changePassword: (data) => api.put("/users/me/password", data),

  // Dashboard
  getSummary: () => api.get("/reports/summary"),
  getMetrics: () => api.get("/reports/metrics"),

  // Inquiries
  getInquiries: () => api.get("/inquiries"),
  getInquiry: (id) => api.get(`/inquiries/${id}`),
  updateInquiry: (id, data) => api.put(`/inquiries/${id}`, data),
  reviewInquiry: (id) => api.patch(`/inquiries/${id}/review`),

  // Bookings
  getBookings: () => api.get("/bookings"),
  getBooking: (id) => api.get(`/bookings/${id}`),
  createBooking: (data) => api.post("/bookings", data),
  createBookingFromInquiry: (id, data) => api.post(`/bookings/from-inquiry/${id}`, data),
  updateBooking: (id, data) => api.put(`/bookings/${id}`, data),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),

  // Payments
  getPayments: () => api.get("/payments"),
  createPayment: (data) => api.post("/payments", data),
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
  createGalleryBulk: (data) => api.post("/gallery/bulk", data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateGallery: (id, data) => api.put(`/gallery/${id}`, data),
  deleteGallery: (id) => api.delete(`/gallery/${id}`),

  // Staff
  getStaff: () => api.get("/staff"),
  createStaff: (data) => api.post("/staff", data),
  updateStaff: (id, data) => api.put(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),

  // Customers
  getCustomers: () => api.get("/users/customers"),
  updateCustomerStatus: (id, data) => api.put(`/users/${id}/status`, data),

  // Ratings
  getRatings: () => api.get("/ratings"),

  // Business Info
  getBusinessInfo: () => api.get("/business-info"),
  updateBusinessInfo: (data) => api.put("/business-info", data),

  // Logs
  getLogs: (params = {}) => api.get("/systemlogs", { params })
};