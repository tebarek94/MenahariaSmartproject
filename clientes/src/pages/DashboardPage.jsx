import { useEffect } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { viewsService } from "@/services/views.service.js";
import { Card } from "@/ui/Card.jsx";
import { DataTable } from "@/ui/DataTable.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { Button } from "@/ui/Button.jsx";
import { formatMoney } from "@/utils/format.js";

export function DashboardView({ load, title, errorTitle, errorMessage }) {
  const dashboardView = useAsync(load);

  useEffect(() => {
    dashboardView.run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dashboardView.loading && !dashboardView.data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (dashboardView.error) {
    return (
      <Card title="Overview" subtitle={errorTitle}>
        <p className="text-sm text-red-400">
          {dashboardView.error.message || errorMessage}
        </p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => dashboardView.run()}
        >
          Retry
        </Button>
      </Card>
    );
  }

  const d = dashboardView.data;
  const summary = d?.summary;
  const breakdowns = summary?.breakdowns;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
          {title}
        </h2>
      </div>

      {summary?.counts ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Object.entries(summary.counts).map(([key, val]) => (
            <Card key={key} className="!p-3 sm:!p-4">
              <p className="text-xs uppercase tracking-wide text-primary-400/80">
                {key.replace(/_/g, " ")}
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-semibold text-white">
                {val}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {summary?.revenue_completed_total != null ? (
        <Card title="Completed payments total" className="!p-3 sm:!p-4">
          <p className="text-xl sm:text-2xl font-semibold text-secondary-400">
            {formatMoney(summary.revenue_completed_total)}
          </p>
        </Card>
      ) : null}

      {breakdowns && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {Object.entries(breakdowns).map(([key, rows]) => (
            <Card key={key} title={key.replace(/_/g, " ")} className="!p-3 sm:!p-4">
              <DataTable
                rows={Array.isArray(rows) ? rows : []}
                maxHeightClass="max-h-48 sm:max-h-56"
                emptyMessage="No breakdown rows"
              />
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <Card title="Users with roles" subtitle="Latest 40">
          <DataTable rows={d?.users_with_roles} maxHeightClass="max-h-64" />
        </Card>

        <Card title="Routes" subtitle="Latest 50">
          <DataTable rows={d?.routes} maxHeightClass="max-h-64" />
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card title="Roles & permission counts">
          <DataTable
            rows={d?.roles_with_permission_counts}
            maxHeightClass="max-h-64"
          />
        </Card>

        <Card title="Vehicles & seat counts" subtitle="Latest 30">
          <DataTable rows={d?.vehicles_with_seat_counts} maxHeightClass="max-h-64" />
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Trips (linked)" subtitle="Latest 25">
          <DataTable rows={d?.trips_linked} maxHeightClass="max-h-64" />
        </Card>

        <Card title="Tickets (linked)" subtitle="Latest 25">
          <DataTable rows={d?.tickets_linked} maxHeightClass="max-h-64" />
        </Card>

        <Card title="Cargo (linked)" subtitle="Latest 25">
          <DataTable rows={d?.cargo_linked} maxHeightClass="max-h-64" />
        </Card>

        <Card title="Payments (linked)" subtitle="Latest 25">
          <DataTable rows={d?.payments_linked} maxHeightClass="max-h-64" />
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card title="Recent notifications" subtitle="Latest 15">
          <DataTable rows={d?.notifications_recent} maxHeightClass="max-h-64" />
        </Card>

        <Card title="Recent reports" subtitle="Latest 10">
          <DataTable rows={d?.reports_recent} maxHeightClass="max-h-48" />
        </Card>
      </div>

      <Card title="Recent login history" subtitle="Latest 20">
        <DataTable rows={d?.login_history_recent} maxHeightClass="max-h-64" />
      </Card>
    </div>
  );
}

export function DashboardPage() {
  return (
    <DashboardView
      load={() => viewsService.adminDashboard()}
      title="Full admin dataset"
      errorTitle="Could not load admin view"
      errorMessage="Request failed - check token and admin role."
    />
  );
}

