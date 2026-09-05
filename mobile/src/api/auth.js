import client from "./client";

export const authApi = {
  login: async ({ email, password }) => {
    const response = await client.post("/auth/login", { email, password });
    return response.data;
  },

  register: async ({ first_name, last_name, email, password }) => {
    const response = await client.post("/auth/register", {
      first_name,
      last_name,
      email,
      password,
    });
    return response.data;
  },

  verifyOtp: async ({ email, otp }) => {
    const response = await client.post("/auth/verify-otp", { email, otp });
    return response.data;
  },

  resendOtp: async ({ email }) => {
    const response = await client.post("/auth/resend-otp", { email });
    return response.data;
  },

  forgotPassword: async ({ email }) => {
    const response = await client.post("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async ({ token, password }) => {
    const response = await client.post("/auth/reset-password", { token, password });
    return response.data;
  },

  logout: async () => {
    try {
      await client.post("/auth/logout");
    } catch (e) {
      // ignore network errors on logout
    }
  },

  getMe: async () => {
    const response = await client.get("/users/me");
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await client.put("/users/me", userData);
    return response.data;
  },

  changePassword: async ({ current_password, new_password }) => {
    const response = await client.put("/users/me/password", {
      current_password,
      new_password,
    });
    return response.data;
  },
};

export default authApi;
