import { useState, useEffect, useCallback, useMemo } from "react";
import { authService } from "@/services/auth.service.js";
import { STORAGE_KEYS } from "@/utils/constants.js";
import { isAdminRole } from "@/utils/roles.js";

export function useAuth() {
  const [token, setToken] = useState(() => authService.getToken());
  const [user, setUser] = useState(() => authService.getStoredUser());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.TOKEN) setToken(e.newValue);
      if (e.key === STORAGE_KEYS.USER) {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback(async (phone, password) => {
    const data = await authService.login(phone, password);
    setToken(authService.getToken());
    setUser(authService.getStoredUser());
    return data;
  }, []);

  const loginAsAdmin = useCallback(async (phone, password) => {
    const data = await authService.loginAsAdmin(phone, password);
    setToken(authService.getToken());
    setUser(authService.getStoredUser());
    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isAdmin: isAdminRole(user?.role_name),
      login,
      loginAsAdmin,
      logout,
    }),
    [token, user, login, loginAsAdmin, logout]
  );

  return value;
}
