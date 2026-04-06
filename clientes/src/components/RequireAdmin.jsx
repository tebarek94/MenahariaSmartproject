import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { ROUTES } from "@/utils/constants.js";

/** Nested admin routes render in `<Outlet />` after role check. */
export function RequireAdmin() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      logout();
    }
  }, [isAuthenticated, isAdmin, logout]);

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.ADMIN_LOGIN}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!isAdmin) {
    return (
      <Navigate
        to={ROUTES.ADMIN_LOGIN}
        replace
        state={{
          message: "Administrator access is required for the admin console.",
        }}
      />
    );
  }

  return <Outlet />;
}
