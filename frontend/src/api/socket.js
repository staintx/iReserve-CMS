import { io } from "socket.io-client";
import api from "./axios";

let socket;

export const getSocket = () => {
  if (!socket) {
    // Derive socket server URL: prefer explicit VITE_SOCKET_URL, then VITE_API_BASE_URL,
    // otherwise fall back to current origin. Strip any trailing /api.
    const rawUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");
    const baseUrl = rawUrl.replace(/\/api\/?$/, "");

    socket = io(baseUrl, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Handle expired JWT by attempting silent refresh before giving up
    socket.on("connect_error", async (err) => {
      console.error("[Socket] connect_error:", err.message);
      if (err.message === "TOKEN_EXPIRED") {
        try {
          await api.post("/auth/refresh");
          socket.connect();
        } catch {
          window.dispatchEvent(new CustomEvent("session-expired"));
        }
      }
    });

    // Helpful debug logs for connection lifecycle in production troubleshooting
    socket.on("connect", () => {
      console.debug("[Socket] connected");
    });
    socket.on("reconnect", (attempt) => console.debug("[Socket] reconnected", attempt));
    socket.on("disconnect", (reason) => console.debug("[Socket] disconnected", reason));
  }

  return socket;
};

export const resetSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
