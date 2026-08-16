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
  getAddons: () => api.get("/addons"),

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
  uploadInspirationImages: (formData) =>
    api.post("/inquiries/upload-inspiration", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  checkAvailability: (params) => api.get("/bookings/availability", { params }),
  getAvailableTimes: (params) => api.get("/bookings/available-times", { params }),
  suggestDates: (params) => api.get("/bookings/availability/suggestions", { params }),
  getBookedDates: (month, year) => api.get(`/bookings/booked-dates?month=${month}&year=${year}`),
  getBlockedDates: () => api.get("/blocked-dates"),
  getInquiries: () => api.get("/inquiries"),
  cancelInquiry: (id) => api.patch(`/inquiries/me/${id}/status`, { status: "cancelled" }),
  acceptInquiry: (id) => api.patch(`/inquiries/me/${id}/status`, { status: "confirmed" }),
  updateInquiryDate: (id, data) => api.patch(`/inquiries/me/${id}/date`, data),
  requestInquiryQuoteChange: (id, data) => api.patch(`/inquiries/me/${id}/quote-change`, data),
  getQuotationsForInquiry: (inquiryId) => api.get(`/quotations/inquiry/${inquiryId}`),
  getQuotationById: (id) => api.get(`/quotations/${id}`),
  acceptQuotation: (id) => api.post(`/quotations/${id}/accept`),
  requestQuotationRevision: (id, customer_response) => api.post(`/quotations/${id}/revision`, { customer_response }),
  rejectQuotation: (id) => api.post(`/quotations/${id}/reject`),
  getBookings: () => api.get("/bookings/me"),
  createBooking: (data) => api.post("/bookings", data),
  requestBookingChange: (id, data) => api.post(`/bookings/${id}/change-request`, data),
  requestOcular: (id, data) => api.post(`/bookings/${id}/ocular/request`, data),
  requestCancellation: (id) => api.post(`/bookings/${id}/request-cancellation`),
  addGuests: (id, data) => api.post(`/bookings/${id}/add-guests`, data),
  upgradeBooking: (id, data) => api.post(`/bookings/${id}/upgrade-booking`, data),
  acceptQuote: (id, data) => api.put(`/bookings/${id}/accept-quote`, data),
  proposeRevision: (id, data) => api.post(`/bookings/${id}/propose-revision`, data),
  acceptRevision: (id) => api.post(`/bookings/${id}/accept-revision`),
  rejectRevision: (id, data) => api.post(`/bookings/${id}/reject-revision`, data),

  // profile
  getProfile: () => api.get("/users/me"),
  updateProfile: (data) => api.put("/users/me", data),
  changePassword: (data) => api.put("/users/me/password", data),

  // payments
  getPayments: () => api.get("/payments/me"),
  createPaymentCheckout: (data) => api.post("/payments/checkout", data),
  createPaymentIntent: (data) => api.post("/payments/intent", data),
  processPaymentIntent: (data) => api.post("/payments/intent/process", data),
  verifyPayment: (id) => api.post(`/payments/${id}/verify`),

  // messages
  getConversations: () => api.get("/messages/conversations"),

  // custom quote
  submitQuote: (data) => api.post("/quotes", data) // ensure this exists in backend
};