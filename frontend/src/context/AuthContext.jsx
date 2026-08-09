import { createContext, useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { getSocket, resetSocket } from "../api/socket";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
      } catch (err) {
        localStorage.removeItem("user");
      }
    }

    api.get("/users/me")
      .then(({ data }) => {
        if (data) {
          const { token, ...userData } = data;
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
          if (token) localStorage.setItem("token", token);
          resetSocket();
          getSocket().connect();
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setUser(null);
          resetSocket();
        } else if (localStorage.getItem("user")) {
          getSocket().connect();
        }
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("user", JSON.stringify(data.user));
    // Save returned token (fallback for socket auth) when present
    if (data.token) localStorage.setItem("token", data.token);
    setUser(data.user);
    setSessionExpired(false);
    resetSocket();
    getSocket().connect();
    return data.user;
  };

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("booking_wizard_form");
    localStorage.removeItem("booking_wizard_step");
    sessionStorage.removeItem("booking_wizard_form");
    sessionStorage.removeItem("booking_wizard_step");
    setUser(null);
    resetSocket();
  }, []);

  // Listen for the session-expired event fired by the axios interceptor or socket handler
  useEffect(() => {
    const handleSessionExpired = () => {
      // Only act if a user is currently logged in (based on our UI state)
      if (localStorage.getItem("user")) {
        logout();
        setSessionExpired(true);
      }
    };

    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, [logout]);

  const clearSessionExpired = () => setSessionExpired(false);

  return (
    <AuthContext.Provider value={{ user, login, logout, isReady, sessionExpired, clearSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}
