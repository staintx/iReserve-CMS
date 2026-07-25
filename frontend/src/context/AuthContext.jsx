import { createContext, useEffect, useState } from "react";
import api from "../api/axios";
import { resetSocket } from "../api/socket";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

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
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    resetSocket();
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("booking_wizard_form");
    localStorage.removeItem("booking_wizard_step");
    sessionStorage.removeItem("booking_wizard_form");
    sessionStorage.removeItem("booking_wizard_step");
    setUser(null);
    resetSocket();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}