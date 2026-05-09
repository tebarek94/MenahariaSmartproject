import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { AdminLayout } from "@/components/admin/AdminLayout.jsx";
import { DriverLayout } from "@/components/driver/DriverLayout.jsx";
import { StaffLayout } from "@/components/staff/StaffLayout.jsx";
import { RequireAdmin } from "@/components/RequireAdmin.jsx";
import { RequireDriver } from "@/components/RequireDriver.jsx";
import { RequireStaff } from "@/components/RequireStaff.jsx";
import { RequirePassenger } from "@/components/passenger/RequirePassenger.jsx";
import { PublicShell } from "@/components/PublicShell.jsx";
import { PassengerLayout } from "@/components/passenger/PassengerLayout.jsx";
import {
  LoginPage,
  AdminLoginPage,
  DriverLoginPage,
  StaffLoginPage,
  AdminRegisterPage,
  DashboardPage,
  DriverDashboardPage,
  DriverProfilePage,
  DriverTripsPage,
  DriverPassengersPage,
  DriverCargoPage,
  DriverNotificationsPage,
  DriverLiveGpsPage,
  UserTicketsPage,
  PassengerLandingPage,
  PassengerRegisterPage,
  PassengerDashboardPage,
  PassengerAssignedDriverPage,
  PassengerBookPage,
  PassengerProfilePage,
  PassengerCargoTrackPage,
  PassengerRefundRequestsPage,
  PassengerSupportChatPage,
  QRScanPage,
  AdminUsersPage,
  AdminDriverAssignmentsPage,
  AdminRolesPage,
  AdminPermissionsPage,
  AdminRolePermissionsPage,
  AdminTicketsPage,
  AdminRefundRequestsPage,
  AdminVehiclesPage,
  AdminRoutesPage,
  AdminTripsPage,
  AdminCargoPage,
  AdminSeatsPage,
  AdminPaymentsPage,
  AdminLoginHistoryPage,
  AdminNotificationsPage,
  AdminSupportChatPage,
  AdminReportsPage,
  AdminProfilePage,
  AdminLiveGpsPage,
  StaffDashboardPage,
  StaffOperationsPage,
  StaffCargoPage,
  StaffProfilePage,
} from "@/pages/index.js";
import { ROUTES } from "@/utils/constants.js";
import { ThemeProvider } from "@/contexts/ThemeContext.jsx";
import { RealtimeBridge } from "@/components/RealtimeBridge.jsx";

export default function App() {
  const auth = useAuth();

  return (
    <ThemeProvider>
      <RealtimeBridge />
      <Routes>
        {/* Universal Login Route */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<PassengerRegisterPage />} />

        {/* QR Scan Page - Public route for scanning */}
        <Route path="/qr-scan/:token" element={<QRScanPage />} />
        <Route path="/qr-scan" element={<QRScanPage />} />

        <Route path="/" element={<PublicShell />}>
          <Route index element={<PassengerLandingPage />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path={ROUTES.ADMIN_LOGIN}
          element={
            auth.isAuthenticated && auth.isAdmin ? (
              <Navigate to={ROUTES.DASHBOARD} replace />
            ) : (
              <AdminLoginPage />
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

        {/* Driver Login Route */}
        <Route
          path={ROUTES.DRIVER_LOGIN}
          element={
            auth.isAuthenticated && auth.isDriver ? (
              <Navigate to={ROUTES.DRIVER_DASHBOARD} replace />
            ) : (
              <DriverLoginPage />
            )
          }
        />
        <Route
          path={ROUTES.STAFF_LOGIN}
          element={
            auth.isAuthenticated && auth.isStaff ? (
              <Navigate to={ROUTES.STAFF_DASHBOARD} replace />
            ) : (
              <StaffLoginPage />
            )
          }
        />

        <Route element={<RequireStaff />}>
          <Route element={<StaffLayout />}>
            <Route path={ROUTES.STAFF_DASHBOARD} element={<StaffDashboardPage />} />
            <Route path={ROUTES.STAFF_OPERATIONS} element={<StaffOperationsPage />} />
            <Route path={ROUTES.STAFF_CARGO} element={<StaffCargoPage />} />
            <Route path={ROUTES.STAFF_PROFILE} element={<StaffProfilePage />} />
          </Route>
        </Route>

        {/* Driver routes (same layout pattern as admin) */}
        <Route element={<RequireDriver />}>
          <Route element={<DriverLayout />}>
            <Route
              path={ROUTES.DRIVER_DASHBOARD}
              element={<DriverDashboardPage />}
            />
            <Route path={ROUTES.DRIVER_TRIPS} element={<DriverTripsPage />} />
            <Route
              path={ROUTES.DRIVER_PASSENGERS}
              element={<DriverPassengersPage />}
            />
            <Route path={ROUTES.DRIVER_CARGO} element={<DriverCargoPage />} />
            <Route
              path={ROUTES.DRIVER_NOTIFICATIONS}
              element={<DriverNotificationsPage />}
            />
            <Route path={ROUTES.DRIVER_LIVE_GPS} element={<DriverLiveGpsPage />} />
            <Route path={ROUTES.DRIVER_PROFILE} element={<DriverProfilePage />} />
          </Route>
        </Route>
        <Route
          path="/my-tickets"
          element={<Navigate to={ROUTES.PASSENGER_TICKETS} replace />}
        />

        <Route element={<RequirePassenger />}>
          <Route element={<PassengerLayout />}>
            <Route
              path="/passenger/dashboard"
              element={<PassengerDashboardPage />}
            />
            <Route
              path={ROUTES.PASSENGER_ASSIGNED_DRIVER}
              element={<PassengerAssignedDriverPage />}
            />
            <Route path="/passenger/book" element={<PassengerBookPage />} />
            <Route path="/passenger/tickets" element={<UserTicketsPage />} />
            <Route
              path={ROUTES.PASSENGER_REFUNDS}
              element={<PassengerRefundRequestsPage />}
            />
            <Route
              path={ROUTES.PASSENGER_PROFILE}
              element={<PassengerProfilePage />}
            />
            <Route
              path={ROUTES.PASSENGER_CARGO_TRACK}
              element={<PassengerCargoTrackPage />}
            />
            <Route
              path={ROUTES.PASSENGER_SUPPORT}
              element={<PassengerSupportChatPage />}
            />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.ADMIN_LIVE_GPS} element={<AdminLiveGpsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route
              path={ROUTES.ADMIN_DRIVER_ASSIGNMENTS}
              element={<AdminDriverAssignmentsPage />}
            />
            <Route path="/admin/roles" element={<AdminRolesPage />} />
            <Route
              path="/admin/permissions"
              element={<AdminPermissionsPage />}
            />
            <Route
              path="/admin/role-permissions"
              element={<AdminRolePermissionsPage />}
            />
            <Route path="/admin/routes" element={<AdminRoutesPage />} />
            <Route path="/admin/vehicles" element={<AdminVehiclesPage />} />
            <Route path="/admin/trips" element={<AdminTripsPage />} />
            <Route path="/admin/seats" element={<AdminSeatsPage />} />
            <Route path="/admin/tickets" element={<AdminTicketsPage />} />
            <Route
              path={ROUTES.ADMIN_REFUND_REQUESTS}
              element={<AdminRefundRequestsPage />}
            />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/cargo" element={<AdminCargoPage />} />
            <Route
              path="/admin/login-history"
              element={<AdminLoginHistoryPage />}
            />
            <Route
              path={ROUTES.ADMIN_AUDIT_LOG}
              element={<AdminLoginHistoryPage />}
            />
            <Route
              path="/admin/notifications"
              element={<AdminNotificationsPage />}
            />
            <Route
              path={ROUTES.ADMIN_SUPPORT_CHAT}
              element={<AdminSupportChatPage />}
            />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
          </Route>
        </Route>

      </Routes>
    </ThemeProvider>
  );
}
