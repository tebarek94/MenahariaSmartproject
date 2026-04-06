import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { MainLayout } from "@/components/layout/MainLayout.jsx";
import { AdminLayout } from "@/components/admin/AdminLayout.jsx";
import { RequireAdmin } from "@/components/RequireAdmin.jsx";
import {
  AdminLoginPage,
  AdminRegisterPage,
  DashboardPage,
  NotFoundPage,
  AdminUsersPage,
  AdminRolesPage,
  AdminPermissionsPage,
  AdminRolePermissionsPage,
  AdminTicketsPage,
  AdminVehiclesPage,
  AdminRoutesPage,
  AdminTripsPage,
  AdminCargoPage,
  AdminSeatsPage,
  AdminPaymentsPage,
  AdminCargoReceiptsPage,
  AdminLoginHistoryPage,
  AdminNotificationsPage,
  AdminReportsPage,
  AdminRelationsOverviewPage,
} from "@/pages/index.js";
import { ROUTES } from "@/utils/constants.js";

function App() {
  const auth = useAuth();

  const layoutProps = {
    isAuthenticated: auth.isAuthenticated,
    isAdmin: auth.isAdmin,
    user: auth.user,
    onLogout: auth.logout,
  };

  return (
    <Routes>
      <Route
        path={ROUTES.ROOT}
        element={
          auth.isAuthenticated && auth.isAdmin ? (
            <Navigate to={ROUTES.DASHBOARD} replace />
          ) : (
            <Navigate to={ROUTES.ADMIN_LOGIN} replace />
          )
        }
      />

      <Route element={<MainLayout {...layoutProps} />}>
        <Route
          path={ROUTES.LOGIN}
          element={<Navigate to={ROUTES.ADMIN_LOGIN} replace />}
        />
        <Route
          path={ROUTES.ADMIN_LOGIN}
          element={
            auth.isAuthenticated && auth.isAdmin ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <AdminLoginPage onLogin={auth.loginAsAdmin} />
            )
          }
        />
        <Route
          path={ROUTES.ADMIN_REGISTER}
          element={
            auth.isAuthenticated && auth.isAdmin ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <AdminRegisterPage />
            )
          }
        />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/roles" element={<AdminRolesPage />} />
          <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
          <Route
            path="/admin/role-permissions"
            element={<AdminRolePermissionsPage />}
          />
          <Route path="/admin/routes" element={<AdminRoutesPage />} />
          <Route path="/admin/vehicles" element={<AdminVehiclesPage />} />
          <Route path="/admin/trips" element={<AdminTripsPage />} />
          <Route path="/admin/seats" element={<AdminSeatsPage />} />
          <Route path="/admin/tickets" element={<AdminTicketsPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/cargo" element={<AdminCargoPage />} />
          <Route path="/admin/cargo-receipts" element={<AdminCargoReceiptsPage />} />
          <Route path="/admin/login-history" element={<AdminLoginHistoryPage />} />
          <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route
            path="/admin/relations"
            element={<AdminRelationsOverviewPage />}
          />
        </Route>
      </Route>

      <Route element={<MainLayout {...layoutProps} />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
