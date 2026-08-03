import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Auto-logout on expired JWT: fires a custom event that AuthContext listens for
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED"
    ) {
      window.dispatchEvent(new CustomEvent("session-expired"));
    }
    return Promise.reject(error);
  }
);

export default api;