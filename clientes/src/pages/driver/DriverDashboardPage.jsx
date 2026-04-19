import { viewsService } from "@/services/views.service.js";
import { DashboardView } from "../DashboardPage.jsx";

export function DriverDashboardPage() {
  return (
    <DashboardView
      load={() => viewsService.driverDashboard()}
      title="Driver dashboard"
      errorTitle="Could not load driver view"
      errorMessage="Request failed - check token and driver role."
      statusMixOnly
    />
  );
}
