import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { ROUTES } from "@/utils/constants.js";

export function RequirePassenger() {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (auth.isAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  if (auth.isDriver) {
    return <Navigate to={ROUTES.DRIVER_DASHBOARD} replace />;
  }
  if (auth.isStaff) {
    return <Navigate to={ROUTES.STAFF_DASHBOARD} replace />;
  }
  if (!auth.isPassenger) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
