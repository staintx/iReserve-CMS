import api from "./axios";

export const CustomerAPI = {
  // public content
  getPackages: () => api.get("/packages"),
  getPackageById: (id) => api.get(`/packages/${id}`),
  getMenu: () => api.get("/menu"),
  getGallery: () => api.get("/gallery"),

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
  createBooking: (data) => api.post("/bookings", data),

  // custom quote
  submitQuote: (data) => api.post("/quotes", data) // ensure this exists in backend
};