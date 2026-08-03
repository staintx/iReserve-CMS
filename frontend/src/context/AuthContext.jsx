import { createContext, useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { resetSocket } from "../api/socket";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (err) {
        localStorage.removeItem("user");
      }
    }
    setIsReady(true);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    setSessionExpired(false);
    resetSocket();
    return data.user;
  };

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    }
    localStorage.removeItem("user");
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