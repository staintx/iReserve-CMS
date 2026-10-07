import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  timeout: 45000,
});

// ── In-memory token store (primary) ──
let _accessToken = null;
let _refreshToken = null;

// ── First-party cookie helpers (persist across page refresh on Safari) ──
// These are set by the frontend on its own domain, so Safari ITP treats them
// as first-party and won't block/partition them.
const TOKEN_COOKIE = "_at";
const REFRESH_COOKIE = "_rt";

function setFrontendCookie(name, value, maxAgeSeconds) {
  const secure = location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;SameSite=Lax;max-age=${maxAgeSeconds}${secure}`;
}

function getFrontendCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearFrontendCookie(name) {
  document.cookie = `${name}=;path=/;max-age=0`;
}

// Restore tokens from first-party cookies on page load (handles Safari refresh)
_accessToken = getFrontendCookie(TOKEN_COOKIE);
_refreshToken = getFrontendCookie(REFRESH_COOKIE);

export const setTokens = (access, refresh) => {
  _accessToken = access || null;
  _refreshToken = refresh || null;
  if (access) setFrontendCookie(TOKEN_COOKIE, access, 900); // 15m (matches JWT expiry)
  else clearFrontendCookie(TOKEN_COOKIE);
  if (refresh) setFrontendCookie(REFRESH_COOKIE, refresh, 7 * 86400); // 7d
  else clearFrontendCookie(REFRESH_COOKIE);
};

export const clearTokens = () => {
  _accessToken = null;
  _refreshToken = null;
  clearFrontendCookie(TOKEN_COOKIE);
  clearFrontendCookie(REFRESH_COOKIE);
};

export const getAccessToken = () => _accessToken;

// ── Request interceptor: attach tokens as headers on every call ──
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  if (_refreshToken) {
    config.headers["x-refresh-token"] = _refreshToken;
  }
  return config;
});

// ── Response interceptor: auto-refresh on expired JWT ──
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Also handle NO_TOKEN on Safari where backend cookies were silently dropped
    const code = error.response?.data?.code;
    const isAuthFailure =
      error.response?.status === 401 &&
      (code === "TOKEN_EXPIRED" || (code === "NO_TOKEN" && _refreshToken));

    if (
      isAuthFailure &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Send refresh token via both body and header so the backend finds it
        // regardless of whether cookies survived (Safari ITP)
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken: _refreshToken },
          {
            withCredentials: true,
            headers: _refreshToken ? { "x-refresh-token": _refreshToken } : {},
          }
        );
        // Capture the new access token
        if (data.token) setTokens(data.token, _refreshToken);
        processQueue(null);
        return api(originalRequest);
      } catch (refreshErr) {
        clearTokens();
        processQueue(refreshErr);
        window.dispatchEvent(new CustomEvent("session-expired"));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;