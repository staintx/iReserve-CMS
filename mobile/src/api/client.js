import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/config";

const TOKEN_KEY = "ireserve_mobile_jwt_token";

export const getStoredToken = async () => {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn("Error reading token from storage", error);
    return null;
  }
};

export const setStoredToken = async (token) => {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      return;
    }
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.warn("Error saving token to storage", error);
  }
};

export const removeStoredToken = async () => {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn("Error deleting token from storage", error);
  }
};

// Global session expiration handler (set by AuthContext)
let onSessionExpiredCallback = null;
export const setOnSessionExpired = (callback) => {
  onSessionExpiredCallback = callback;
};

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-client-platform": "mobile",
  },
});

// Request Interceptor: inject Bearer token
client.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle 401 token expiration and formatting
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      if (data?.code === "TOKEN_EXPIRED" || data?.message === "Token expired" || data?.message === "No token") {
        if (typeof onSessionExpiredCallback === "function") {
          onSessionExpiredCallback();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default client;
