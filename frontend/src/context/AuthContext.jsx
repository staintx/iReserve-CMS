import { createContext, useCallback, useEffect, useState } from "react";
import api, { setTokens, clearTokens } from "../api/axios";
import { getSocket, resetSocket } from "../api/socket";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    api.get("/users/me")
      .then(({ data }) => {
        if (data) {
          const { token, refreshToken, ...userData } = data;
          // Capture tokens if the /me endpoint returns them (it doesn't normally,
          // but the login response does — this is just defensive)
          if (token) setTokens(token, refreshToken);
          setUser(userData);
          resetSocket();
          getSocket().connect();
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setUser(null);
          resetSocket();
        }
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  const login = async (email, password, turnstileToken) => {
    const { data } = await api.post("/auth/login", { 
      email, 
      password,
      "cf-turnstile-response": turnstileToken 
    });
    // Store tokens in memory so all subsequent API calls use headers
    if (data.token) setTokens(data.token, data.refreshToken);
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
    clearTokens();
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
      setUser((currentUser) => {
        if (currentUser) {
          logout();
          setSessionExpired(true);
        }
        return null;
      });
    };

    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, [logout]);

  const updateUser = useCallback((updatedUserData) => {
    if (!updatedUserData) return;
    setUser((prev) => (prev ? { ...prev, ...updatedUserData } : prev));
  }, []);

  const clearSessionExpired = () => setSessionExpired(false);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isReady, sessionExpired, clearSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}
