import client from "./client";

export const customerApi = {
  // Packages & Menu
  getPackages: async () => {
    const response = await client.get("/packages");
    return response.data;
  },

  getPackageById: async (id) => {
    const response = await client.get(`/packages/${id}`);
    return response.data;
  },

  getMenu: async () => {
    const response = await client.get("/menu");
    return response.data;
  },

  getAddons: async () => {
    const response = await client.get("/addons");
    return response.data;
  },

  getBusinessInfo: async () => {
    const response = await client.get("/business-info/public");
    return response.data;
  },

  // Availability & Scheduling
  getBlockedDates: async () => {
    const response = await client.get("/blocked-dates");
    return response.data;
  },

  getBookedDates: async (month, year) => {
    const response = await client.get(`/bookings/booked-dates?month=${month}&year=${year}`);
    return response.data;
  },

  getAvailableTimes: async (params) => {
    const response = await client.get("/bookings/available-times", { params });
    return response.data;
  },

  suggestDates: async (params) => {
    const response = await client.get("/bookings/availability/suggestions", { params });
    return response.data;
  },

  // Inquiries
  submitInquiry: async (payload) => {
    const response = await client.post("/inquiries", payload);
    return response.data;
  },

  getInquiries: async () => {
    const response = await client.get("/inquiries");
    return response.data;
  },

  getInquiryById: async (id) => {
    const response = await client.get(`/inquiries/${id}`);
    return response.data;
  },

  updateInquiry: async (id, data) => {
    const response = await client.patch(`/inquiries/${id}`, data);
    return response.data;
  },

  cancelInquiry: async (id) => {
    const response = await client.delete(`/inquiries/${id}`);
    return response.data;
  },

  // Quotations
  getQuotationsForInquiry: async (inquiryId) => {
    const response = await client.get(`/quotations/inquiry/${inquiryId}`);
    return response.data;
  },

  getQuotationById: async (id) => {
    const response = await client.get(`/quotations/${id}`);
    return response.data;
  },

  acceptQuotation: async (id) => {
    const response = await client.post(`/quotations/${id}/accept`);
    return response.data;
  },

  requestQuotationRevision: async (id, customer_response) => {
    const response = await client.post(`/quotations/${id}/revision`, { customer_response });
    return response.data;
  },

  rejectQuotation: async (id) => {
    const response = await client.post(`/quotations/${id}/reject`);
    return response.data;
  },

  // Bookings
  getBookings: async () => {
    const response = await client.get("/bookings/me");
    return response.data;
  },

  getBookingById: async (id) => {
    const response = await client.get(`/bookings/${id}`);
    return response.data;
  },

  requestBookingChange: async (id, data) => {
    const response = await client.post(`/bookings/${id}/change-request`, data);
    return response.data;
  },

  requestCancellation: async (id) => {
    const response = await client.post(`/bookings/${id}/request-cancellation`);
    return response.data;
  },

  requestOcular: async (id, data) => {
    const response = await client.post(`/bookings/${id}/ocular/request`, data);
    return response.data;
  },

  skipOcular: async (id) => {
    const response = await client.post(`/bookings/${id}/ocular/skip`);
    return response.data;
  },

  // Payments & Checkout
  getPayments: async () => {
    const response = await client.get("/payments/me");
    return response.data;
  },

  createCheckoutSession: async (data) => {
    const response = await client.post("/payments/checkout", data);
    return response.data;
  },

  verifyPayment: async (id) => {
    const response = await client.post(`/payments/${id}/verify`);
    return response.data;
  },
};

export default customerApi;
