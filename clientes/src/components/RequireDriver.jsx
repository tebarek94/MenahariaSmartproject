import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { ROUTES } from "@/utils/constants.js";

/** Nested driver routes render in `<Outlet />` after role check. */
export function RequireDriver() {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.DRIVER_LOGIN}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!auth.isDriver) {
    if (auth.isAdmin) {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
    if (auth.isPassenger) {
      return <Navigate to={ROUTES.PASSENGER_DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
