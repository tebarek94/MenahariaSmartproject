import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service.js";
import {
  AUTH_LOCAL_SYNC_EVENT,
  ROUTES,
  STORAGE_KEYS,
} from "@/utils/constants.js";
import {
  isAdminRole,
  isDriverRole,
  isPassengerRole,
} from "@/utils/roles.js";

const AuthContext = createContext(null);

function loginRedirectPath(roleName) {
  if (isAdminRole(roleName)) return ROUTES.ADMIN_LOGIN;
  if (isDriverRole(roleName)) return ROUTES.DRIVER_LOGIN;
  return ROUTES.LOGIN;
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
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
    const onLocalSync = () => {
      setToken(authService.getToken());
      setUser(authService.getStoredUser());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_LOCAL_SYNC_EVENT, onLocalSync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_LOCAL_SYNC_EVENT, onLocalSync);
    };
  }, []);

  const logout = useCallback(() => {
    const roleName = user?.role_name;
    authService.logout();
    setToken(null);
    setUser(null);
    navigate(loginRedirectPath(roleName), { replace: true });
  }, [user, navigate]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isAdmin: isAdminRole(user?.role_name),
      isDriver: isDriverRole(user?.role_name),
      isPassenger: isPassengerRole(user?.role_name),
      logout,
    }),
    [token, user, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
