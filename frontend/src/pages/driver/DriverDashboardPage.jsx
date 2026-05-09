import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { viewsService } from "@/services/views.service.js";
import { cargoService } from "@/services/cargo.service.js";
import { Card } from "@/ui/Card.jsx";
import { DashboardView } from "../DashboardPage.jsx";
import { ROUTES } from "@/utils/constants.js";
import { cn } from "@/utils/cn.js";
import { AnimatedDonut } from "@/ui/charts/AnimatedDonut.jsx";
import { AnimatedHorizontalBars } from "@/ui/charts/AnimatedHorizontalBars.jsx";
import { InteractiveHistogram } from "@/ui/charts/InteractiveHistogram.jsx";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatNextDeparture(rows) {
  const now = Date.now();
  const future = rows
    .map((r) => new Date(r.trip_departure_time || "").getTime())
    .filter((ts) => Number.isFinite(ts) && ts > now)
    .sort((a, b) => a - b);
  if (!future.length) return "No upcoming departures";
  return new Date(future[0]).toLocaleString();
}

function buildCargoStatusRows(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(row?.status ?? "").trim().toLowerCase() || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}

export function DriverDashboardPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const loadCargo = useCallback(async () => {
    try {
      const data = await cargoService.list();
      setRows(normalizeList(data));
      setError("");
    } catch (e) {
      setRows([]);
      setError(e?.message || "Could not load assigned cargo stats");
    }
  }, []);

  useEffect(() => {
    loadCargo();
    const id = window.setInterval(loadCargo, 60_000);
    return () => window.clearInterval(id);
  }, [loadCargo]);

  const assignedCargoCount = rows.length;
  const pendingCargoCount = useMemo(
    () =>
      rows.filter((r) => String(r.status || "").trim().toLowerCase() === "pending")
        .length,
    [rows]
  );
  const nextDeparture = useMemo(() => formatNextDeparture(rows), [rows]);
  const cargoStatusMixRows = useMemo(() => buildCargoStatusRows(rows), [rows]);

  return (
    <div className="space-y-6">
         <DashboardView
        load={() => viewsService.driverDashboard()}
        title="Driver dashboard"
        errorTitle="Could not load driver view"
        errorMessage="Request failed - check token and driver role."
        statusMixOnly
      />
   
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="!p-4">
          <p className="text-p-subtle text-xs uppercase tracking-wide">
            Assigned cargo
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {assignedCargoCount}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-p-subtle text-xs uppercase tracking-wide">Pending cargo</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {pendingCargoCount}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-p-subtle text-xs uppercase tracking-wide">Next departure</p>
          <p className="mt-1 text-sm font-semibold text-p-body">{nextDeparture}</p>
        </Card>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

     

   
    </div>
  );
}
