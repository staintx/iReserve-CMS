import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
  if (socket) return socket;
  const rawUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const baseUrl = rawUrl.replace(/\/api\/?$/, "");
  socket = io(baseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    withCredentials: true,
  });

  // Auto-logout when the server rejects the socket due to an expired JWT
  socket.on("connect_error", (err) => {
    if (err.message === "TOKEN_EXPIRED") {
      window.dispatchEvent(new CustomEvent("session-expired"));
    }
  });

  return socket;
};

export const resetSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
