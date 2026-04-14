import { useEffect, useMemo, useState } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { viewsService } from "@/services/views.service.js";
import { Card } from "@/ui/Card.jsx";
import { DataTable } from "@/ui/DataTable.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { Button } from "@/ui/Button.jsx";
import { formatMoney } from "@/utils/format.js";
import { RealtimeLineChart } from "@/ui/RealtimeLineChart.jsx";
import { ChartTrendIcon } from "@/ui/icons.jsx";

const DASHBOARD_POLL_MS = 20_000;
const MAX_LIVE_SAMPLES = 20;

export function DashboardView({ load, title, errorTitle, errorMessage }) {
  const dashboardView = useAsync(load);
  const [overviewHistory, setOverviewHistory] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveError, setLiveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        await dashboardView.run();
        if (!cancelled) {
          setLiveError("");
          setLastUpdated(new Date());
        }
      } catch (e) {
        if (!cancelled) {
          setLiveError(e?.message || "Live refresh failed");
        }
      }
    };
    refresh();
    const id = setInterval(refresh, DASHBOARD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [dashboardView.run]);

  const d = dashboardView.data;
  const summary = d?.summary;
  const breakdowns = summary?.breakdowns;

  useEffect(() => {
    const counts = summary?.counts;
    if (!counts || typeof counts !== "object") return;

    const numericCounts = Object.fromEntries(
      Object.entries(counts).filter(([, v]) => Number.isFinite(Number(v)))
    );
    if (!Object.keys(numericCounts).length) return;

    setOverviewHistory((prev) =>
      [
        ...prev,
        {
          at: Date.now(),
          counts: numericCounts,
        },
      ].slice(-MAX_LIVE_SAMPLES)
    );
  }, [summary?.counts]);

  const trendKeys = useMemo(() => {
    if (!overviewHistory.length) return [];
    const latest = overviewHistory[overviewHistory.length - 1]?.counts ?? {};
    return Object.entries(latest)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
      .map(([k]) => k);
  }, [overviewHistory]);

  const trendPalette = ["#4A90E2", "#F5A623", "#7ED321"];
  const trendSeries = useMemo(
    () =>
      trendKeys.map((key, idx) => ({
        name: key.replace(/_/g, " "),
        color: trendPalette[idx % trendPalette.length],
        values: overviewHistory.map((sample) => Number(sample.counts[key] ?? 0)),
      })),
    [overviewHistory, trendKeys]
  );

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

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <h2 className="text-p-heading text-lg font-bold sm:text-xl lg:text-2xl">
          {title}
        </h2>
      </div>

      <Card
        title={
          <span className="inline-flex items-center gap-2">
            <ChartTrendIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            Overview (live)
          </span>
        }
        subtitle={`Auto refresh every ${DASHBOARD_POLL_MS / 1000}s. Tracks top 3 live metrics.`}
      >
        <div className="grid grid-cols-1 gap-3 pb-3 sm:grid-cols-3">
          <div className="rounded-lg border border-primary-200/70 bg-white/80 p-3 dark:border-white/10 dark:bg-slate-900/45">
            <p className="text-p-subtle text-xs uppercase tracking-wide">Samples</p>
            <p className="text-p-heading mt-1 text-xl font-semibold">
              {overviewHistory.length}
            </p>
          </div>
          <div className="rounded-lg border border-primary-200/70 bg-white/80 p-3 dark:border-white/10 dark:bg-slate-900/45">
            <p className="text-p-subtle text-xs uppercase tracking-wide">Last updated</p>
            <p className="text-p-body mt-1 text-sm font-medium">
              {lastUpdated
                ? lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Waiting..."}
            </p>
          </div>
          <div className="rounded-lg border border-primary-200/70 bg-white/80 p-3 dark:border-white/10 dark:bg-slate-900/45">
            <p className="text-p-subtle text-xs uppercase tracking-wide">Revenue total</p>
            <p className="text-p-heading mt-1 text-sm font-semibold sm:text-base">
              {summary?.revenue_completed_total != null
                ? formatMoney(summary.revenue_completed_total)
                : "—"}
            </p>
          </div>
        </div>
        <RealtimeLineChart series={trendSeries} />
        {liveError ? (
          <p className="mt-2 text-xs text-red-400">{liveError}</p>
        ) : null}
      </Card>

      {summary?.counts ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Object.entries(summary.counts).map(([key, val]) => (
            <Card key={key} className="!p-3 sm:!p-4">
              <p className="text-xs uppercase tracking-wide text-primary-700/90 dark:text-primary-400/80">
                {key.replace(/_/g, " ")}
              </p>
              <p className="text-p-heading mt-1 text-xl font-semibold sm:text-2xl">
                {val}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {summary?.revenue_completed_total != null ? (
        <Card title="Completed payments total" className="!p-3 sm:!p-4">
          <p className="text-xl font-semibold text-secondary-700 dark:text-secondary-400 sm:text-2xl">
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

