import api from "./axios";

export const AdminAPI = {
  // Profile
  getProfile: () => api.get("/users/me"),
  updateProfile: (data) => api.put("/users/me", data),
  changePassword: (data) => api.put("/users/me/password", data),

  // Dashboard
  getSummary: () => api.get("/reports/summary"),
  getMetrics: () => api.get("/reports/metrics"),

  // Blocked Dates
  getBlockedDates: () => api.get("/blocked-dates"),
  blockDate: (data) => api.post("/blocked-dates", data),
  unblockDate: (id) => api.delete(`/blocked-dates/${id}`),

  // Inquiries
  getInquiries: () => api.get("/inquiries"),
  getInquiry: (id) => api.get(`/inquiries/${id}`),
  updateInquiry: (id, data) => api.put(`/inquiries/${id}`, data),
  reviewInquiry: (id) => api.patch(`/inquiries/${id}/review`),

  // Bookings
  getBookings: () => api.get("/bookings"),
  getBooking: (id) => api.get(`/bookings/${id}`),
  createBooking: (data) => api.post("/bookings", data),
  createBookingFromInquiry: (id, data) => api.post(`/bookings/convert-inquiry/${id}`, data),
  updateBooking: (id, data) => api.put(`/bookings/${id}`, data),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
  processRefund: (id, data) => api.post(`/bookings/${id}/refund`, data),
  assignStaff: (id, data) => api.put(`/manager/bookings/${id}/assign-staff`, data),
  verifyEquipmentReturns: (id, data) => api.post(`/bookings/${id}/verify-returns`, data),
  scheduleOcular: (id, data) => api.post(`/bookings/${id}/ocular/schedule`, data),
  completeOcular: (id, data) => api.post(`/bookings/${id}/ocular/complete`, data),
  resolveChangeRequest: (id, data) => api.post(`/bookings/${id}/change-request/resolve`, data),
  sendQuote: (id, data) => api.put(`/bookings/${id}/send-quote`, data),

  // Payments
  getPayments: () => api.get("/payments"),
  createPayment: (data) => api.post("/payments", data),
  updatePayment: (id, data) => api.put(`/payments/${id}`, data),
  verifyPayment: (id) => api.post(`/payments/${id}/verify`),

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
  getInventoryAvailability: (date) => api.get(`/inventory/availability${date ? `?date=${date}` : ''}`),
  createInventory: (data) => api.post("/inventory", data),
  updateInventory: (id, data) => api.put(`/inventory/${id}`, data),
  deleteInventory: (id) => api.delete(`/inventory/${id}`),
  getInventoryLogs: (id) => api.get(`/inventory/${id}/logs`),

  // Addons
  getAddons: () => api.get("/addons"),
  createAddon: (data) => api.post("/addons", data),
  updateAddon: (id, data) => api.put(`/addons/${id}`, data),
  deleteAddon: (id) => api.delete(`/addons/${id}`),

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
  getLogs: (params = {}) => api.get("/systemlogs", { params }),

  // Quotes (Legacy)
  getQuotes: () => api.get("/quotes"),
  getQuote: (id) => api.get(`/quotes/${id}`),
  updateQuote: (id, data) => api.put(`/quotes/${id}`, data),
  deleteQuote: (id) => api.delete(`/quotes/${id}`),
  convertToBooking: (id, data) => api.post(`/quotes/${id}/convert`, data),

  // Quotations (New Inquiry Workflow)
  getAllQuotations: () => api.get("/quotations"),
  getQuotationsByInquiry: (inquiryId) => api.get(`/quotations/inquiry/${inquiryId}`),
  createQuotation: (data) => api.post("/quotations", data),
};