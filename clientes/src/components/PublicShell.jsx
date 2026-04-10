import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { LandingLayout } from "@/components/layout/LandingLayout.jsx";
import { ROUTES } from "@/utils/constants.js";

/** Landing area for guests; signed-in users go to their portal. */
export function PublicShell() {
  const auth = useAuth();

  if (auth.isAuthenticated && auth.isAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  if (auth.isAuthenticated && auth.isDriver) {
    return <Navigate to={ROUTES.DRIVER_DASHBOARD} replace />;
  }
  if (auth.isAuthenticated && auth.isPassenger) {
    return <Navigate to={ROUTES.PASSENGER_DASHBOARD} replace />;
  }

  return (
    <LandingLayout>
      <Outlet />
    </LandingLayout>
  );
}

