import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setStoredToken, removeStoredToken, getStoredToken, setOnSessionExpired } from "../api/client";
import authApi from "../api/auth";

import { ROLES } from "../constants/config";

const ALLOWED_MOBILE_ROLES = [ROLES.CUSTOMER, ROLES.MANAGER, ROLES.STAFF];

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Restore existing session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await getStoredToken();
        if (savedToken) {
          setToken(savedToken);
          const userData = await authApi.getMe();
          if (userData && ALLOWED_MOBILE_ROLES.includes(userData.role)) {
            setUser(userData);
          } else {
            await removeStoredToken();
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        // If 401 or invalid, clean up
        if (err.response?.status === 401) {
          await removeStoredToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Wire up global 401 session expiration handler
  useEffect(() => {
    setOnSessionExpired(async () => {
      await removeStoredToken();
      setToken(null);
      setUser(null);
      setSessionExpired(true);
    });
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (data?.user && !ALLOWED_MOBILE_ROLES.includes(data.user.role)) {
      throw new Error(
        "Mobile access is reserved for Customers, Managers, and Staff only. Please use the Web Admin Portal."
      );
    }
    if (data?.token) {
      await setStoredToken(data.token);
      setToken(data.token);
    }
    if (data?.user) {
      setUser(data.user);
    }
    setSessionExpired(false);
    return data.user;
  };

  const register = async (formData) => {
    return await authApi.register(formData);
  };

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore
    }
    await removeStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    if (!updatedUserData) return;
    setUser((prev) => ({ ...prev, ...updatedUserData }));
  }, []);

  const clearSessionExpired = () => setSessionExpired(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        sessionExpired,
        login,
        register,
        logout,
        updateUser,
        clearSessionExpired,
        isAuthenticated: Boolean(user && token),
        role: user?.role || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
