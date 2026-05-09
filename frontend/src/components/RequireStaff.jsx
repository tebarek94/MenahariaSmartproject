import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { ROUTES } from "@/utils/constants.js";

export function RequireStaff() {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.STAFF_LOGIN}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (auth.isStaff) return <Outlet />;
  if (auth.isAdmin) return <Navigate to={ROUTES.DASHBOARD} replace />;
  if (auth.isDriver) return <Navigate to={ROUTES.DRIVER_DASHBOARD} replace />;
  if (auth.isPassenger) {
    return <Navigate to={ROUTES.PASSENGER_DASHBOARD} replace />;
  }
  return <Navigate to={ROUTES.STAFF_LOGIN} replace />;
}
