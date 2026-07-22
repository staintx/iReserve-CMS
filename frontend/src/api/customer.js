import api from "./axios";

export const CustomerAPI = {
  // public content
  getPackages: () => api.get("/packages"),
  getPackageById: (id) => api.get(`/packages/${id}`),
  getMenu: () => api.get("/menu"),
  getInventory: () => api.get("/inventory/public"),
  getGallery: () => api.get("/gallery"),
  getRatings: () => api.get("/ratings/public"),
  getBusinessInfo: () => api.get("/business-info/public"),

  // auth
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  verifyOtp: (data) => api.post("/auth/verify-otp", data),
  resendOtp: (data) => api.post("/auth/resend-otp", data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),

  // inquiry + bookings
  submitInquiry: (data) => api.post("/inquiries", data),
  checkAvailability: (params) => api.get("/bookings/availability", { params }),
  getInquiries: () => api.get("/inquiries/me"),
  cancelInquiry: (id) => api.patch(`/inquiries/me/${id}/status`, { status: "cancelled" }),
  acceptInquiry: (id) => api.patch(`/inquiries/me/${id}/status`, { status: "confirmed" }),
  updateInquiryDate: (id, data) => api.patch(`/inquiries/me/${id}/date`, data),
  getBookings: () => api.get("/bookings/me"),
  createBooking: (data) => api.post("/bookings", data),
  requestBookingChange: (id, data) => api.post(`/bookings/${id}/change-request`, data),

  // profile
  getProfile: () => api.get("/users/me"),
  updateProfile: (data) => api.put("/users/me", data),
  changePassword: (data) => api.put("/users/me/password", data),

  // payments
  getPayments: () => api.get("/payments/me"),
  createPaymentCheckout: (data) => api.post("/payments/checkout", data),

  // custom quote
  submitQuote: (data) => api.post("/quotes", data) // ensure this exists in backend
};