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
import { AnimatedDonut } from "@/ui/charts/AnimatedDonut.jsx";
import { AnimatedHorizontalBars } from "@/ui/charts/AnimatedHorizontalBars.jsx";
import { cn } from "@/utils/cn.js";

const DASHBOARD_POLL_MS = 20_000;
const MAX_LIVE_SAMPLES = 20;

export function DashboardView({
  load,
  title,
  errorTitle,
  errorMessage,
  statusMixOnly = false,
}) {
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
    if (statusMixOnly) return;
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
  }, [summary?.counts, statusMixOnly]);

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

  const countEntries = summary?.counts
    ? Object.entries(summary.counts).filter(([, v]) => v != null)
    : [];

  const breakdownCharts = [
    { key: "tickets_by_status", title: "Tickets by status" },
    { key: "trips_by_status", title: "Trips by status" },
    { key: "cargo_by_status", title: "Cargo by status" },
    { key: "payments_by_status", title: "Payments by status" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
          "border-primary-300/60 bg-gradient-to-br from-primary-50 via-white to-secondary-50/40 shadow-lg",
          "dark:border-primary-800/50 dark:from-slate-900 dark:via-slate-900 dark:to-primary-950/40"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 admin-hero-shimmer opacity-70 dark:opacity-40"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-700/90 dark:text-primary-400/90">
              Analytics
            </p>
            <h2 className="text-p-heading mt-1 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              {title}
            </h2>
            <p className="text-p-muted mt-1 max-w-xl text-sm sm:text-[0.95rem]">
              {statusMixOnly
                ? "Status breakdowns across tickets, trips, cargo, and payments — refreshed on a short interval."
                : "Live metrics, status mix, and revenue — refreshed on a short interval so you see movement as the system updates."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-primary-800 shadow-sm dark:border-primary-700/50 dark:bg-slate-800/80 dark:text-primary-200">
            <span
              className="relative flex h-2 w-2"
              aria-hidden
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live · {DASHBOARD_POLL_MS / 1000}s refresh
          </div>
        </div>
      </div>

      {!statusMixOnly && countEntries.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {countEntries.map(([key, val], i) => (
            <div
              key={key}
              className="admin-metric-tile card-surface rounded-xl border p-3.5 shadow-lg sm:p-4"
              style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-700/85 dark:text-primary-400/85">
                {key.replace(/_/g, " ")}
              </p>
              <p className="text-p-heading mt-1.5 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                {typeof val === "bigint" ? val.toString() : val}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {!statusMixOnly ? (
        <Card
          title={
            <span className="inline-flex items-center gap-2">
              <ChartTrendIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Live trend (top metrics)
            </span>
          }
          subtitle={`Auto refresh every ${DASHBOARD_POLL_MS / 1000}s · tracks the three largest entity counts over time.`}
        >
          <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-3">
            <div className="rounded-xl border border-primary-200/70 bg-white/85 p-3.5 dark:border-white/10 dark:bg-slate-900/5">
              <p className="text-p-subtle text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                Samples
              </p>
              <p className="text-p-heading mt-1 text-2xl font-bold tabular-nums">
                {overviewHistory.length}
              </p>
            </div>
            <div className="rounded-xl border border-primary-200/70 bg-white/85 p-3.5 dark:border-white/10 dark:bg-slate-900/5">
              <p className="text-p-subtle text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                Last updated
              </p>
              <p className="text-p-body mt-1 text-sm font-semibold tabular-nums">
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "Waiting..."}
              </p>
            </div>
            <div className="rounded-xl border border-primary-200/70 bg-white/85 p-3.5 dark:border-white/10 dark:bg-slate-900/5">
              <p className="text-p-subtle text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                Revenue (completed)
              </p>
              <p className="text-p-heading mt-1 text-base font-bold sm:text-lg">
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
      ) : null}

      {breakdowns ? (
        <div className="space-y-3">
          <h3 className="text-p-heading text-base font-bold sm:text-lg">
            Status mix
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {breakdownCharts.map(({ key, title }) => {
              const rows = breakdowns[key];
              if (!Array.isArray(rows) || rows.length === 0) return null;
              return (
                <div
                  key={key}
                  className="card-surface overflow-hidden rounded-xl border shadow-xl"
                >
                  <div className="border-b border-primary-900/20 bg-gradient-to-r from-primary-600/12 via-transparent to-secondary-500/10 px-4 py-3 dark:border-white/10">
                    <h4 className="text-card-title !mb-0 !text-[1.05rem]">{title}</h4>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                      <AnimatedDonut rows={rows} size={136} stroke={15} className="lg:w-1/2" />
                      <div className="min-w-0 flex-1">
                        <AnimatedHorizontalBars rows={rows} barHeightClass="h-2" />
                      </div>
                    </div>
                    <details className="mt-4 border-t border-primary-900/15 pt-3 dark:border-white/10">
                      <summary className="cursor-pointer text-xs font-semibold text-primary-700 dark:text-primary-400">
                        Raw rows
                      </summary>
                      <div className="mt-2">
                        <DataTable
                          rows={rows}
                          maxHeightClass="max-h-40"
                          emptyMessage="No rows"
                        />
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!statusMixOnly ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title="Users with roles" subtitle="Latest 40">
              <DataTable rows={d?.users_with_roles} maxHeightClass="max-h-64" />
            </Card>

            <Card title="Routes" subtitle="Latest 50">
              <DataTable rows={d?.routes} maxHeightClass="max-h-64" />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        </>
      ) : null}
    </div>
  );
}

export function DashboardPage() {
  return (
    <DashboardView
      load={() => viewsService.adminDashboard()}
      title="Operations overview"
      errorTitle="Could not load admin view"
      errorMessage="Request failed - check token and admin role."
      statusMixOnly
    />
  );
}

