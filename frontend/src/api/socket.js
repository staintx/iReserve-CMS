import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (!socket) {
    // Derive socket server URL: prefer explicit VITE_SOCKET_URL, then VITE_API_BASE_URL,
    // otherwise fall back to current origin. Strip any trailing /api.
    const rawUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");
    const baseUrl = rawUrl.replace(/\/api\/?$/, "");

    socket = io(baseUrl, {
      autoConnect: false,
      withCredentials: true,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Auto-logout when the server rejects the socket due to an expired JWT
    socket.on("connect_error", (err) => {
      if (err.message === "TOKEN_EXPIRED") {
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
    });

    // Helpful debug logs for connection lifecycle in production troubleshooting
    socket.on("connect", () => console.debug("Socket connected"));
    socket.on("reconnect", (attempt) => console.debug("Socket reconnected", attempt));
    socket.on("disconnect", (reason) => console.debug("Socket disconnected", reason));
  } else {
    socket.auth = token ? { token } : undefined;
  }

  return socket;
};

export const resetSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
