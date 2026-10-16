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
  if (access !== undefined) {
    _accessToken = access || null;
    if (access) setFrontendCookie(TOKEN_COOKIE, access, 900); // 15m (matches JWT expiry)
    else clearFrontendCookie(TOKEN_COOKIE);
  }
  if (refresh !== undefined) {
    _refreshToken = refresh || null;
    if (refresh) setFrontendCookie(REFRESH_COOKIE, refresh, 7 * 86400); // 7d
    else clearFrontendCookie(REFRESH_COOKIE);
  }
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

export const refreshAuth = async () => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  const tokenToRefresh = _refreshToken || getFrontendCookie(REFRESH_COOKIE);

  try {
    const { data } = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      { refreshToken: tokenToRefresh },
      {
        withCredentials: true,
        headers: tokenToRefresh ? { "x-refresh-token": tokenToRefresh } : {},
      }
    );
    if (data.token) setTokens(data.token, data.refreshToken);
    processQueue(null);
    return data;
  } catch (refreshErr) {
    clearTokens();
    processQueue(refreshErr);
    window.dispatchEvent(new CustomEvent("session-expired"));
    throw refreshErr;
  } finally {
    isRefreshing = false;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Also handle NO_TOKEN on Safari where backend cookies were silently dropped
    const code = error.response?.data?.code;
    const currentRefresh = _refreshToken || getFrontendCookie(REFRESH_COOKIE);
    const isAuthFailure =
      error.response?.status === 401 &&
      (code === "TOKEN_EXPIRED" || (code === "NO_TOKEN" && currentRefresh));

    if (
      isAuthFailure &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;

      try {
        await refreshAuth();
        return api(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;