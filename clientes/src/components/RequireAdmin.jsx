import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { ROUTES } from "@/utils/constants.js";

/** Nested admin routes render in `<Outlet />` after role check. */
export function RequireAdmin() {
  const { isAuthenticated, isAdmin, isDriver, isPassenger } = useAuth();
  const location = useLocation();

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
    if (isDriver) {
      return <Navigate to={ROUTES.DRIVER_DASHBOARD} replace />;
    }
    if (isPassenger) {
      return <Navigate to={ROUTES.PASSENGER_DASHBOARD} replace />;
    }
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
