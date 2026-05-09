import { useCallback, useEffect, useMemo, useState } from "react";
import { ticketsService } from "@/services/tickets.service.js";
import { cargoService } from "@/services/cargo.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { AnimatedDonut } from "@/ui/charts/AnimatedDonut.jsx";
import { AnimatedHorizontalBars } from "@/ui/charts/AnimatedHorizontalBars.jsx";
import { InteractiveHistogram } from "@/ui/charts/InteractiveHistogram.jsx";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function buildStatusRows(rows) {
  const counts = new Map();
  rows.forEach((row) => {
    const key = String(row?.status ?? "").trim().toLowerCase() || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}

export function StaffDashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [cargoRows, setCargoRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [t, c] = await Promise.all([ticketsService.list(), cargoService.list()]);
      setTickets(normalizeList(t));
      setCargoRows(normalizeList(c));
    } catch (e) {
      setError(e?.message || "Failed to load staff data");
      setTickets([]);
      setCargoRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const ticketsCount = tickets.length;
  const cargoCount = cargoRows.length;
  const boardedCount = useMemo(
    () =>
      tickets.filter((row) => String(row.status || "").toLowerCase() === "boarded")
        .length,
    [tickets]
  );
  const ticketStatusRows = useMemo(() => buildStatusRows(tickets), [tickets]);
  const cargoStatusRows = useMemo(() => buildStatusRows(cargoRows), [cargoRows]);

  if (loading && !tickets.length && !cargoRows.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title="Staff overview"
        subtitle="Summary only. Use Staff Operations for booking/validation/boarding and Cargo for cargo tasks."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={loadAll}>
            Refresh
          </Button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Tickets">
          <p className="text-3xl font-bold text-emerald-400">{ticketsCount}</p>
        </Card>
        <Card title="Boarded">
          <p className="text-3xl font-bold text-sky-400">{boardedCount}</p>
        </Card>
        <Card title="Cargo records">
          <p className="text-3xl font-bold text-amber-400">{cargoCount}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Ticket status mix">
          {ticketStatusRows.length === 0 ? (
            <p className="text-sm text-p-muted">No ticket data yet.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-12 lg:items-center">
              <AnimatedDonut
                rows={ticketStatusRows}
                size={136}
                stroke={15}
                className="lg:col-span-4"
              />
              <div className="min-w-0 lg:col-span-4">
                <AnimatedHorizontalBars rows={ticketStatusRows} barHeightClass="h-2" />
              </div>
              <InteractiveHistogram rows={ticketStatusRows} className="lg:col-span-4" />
            </div>
          )}
        </Card>

        <Card title="Cargo status mix">
          {cargoStatusRows.length === 0 ? (
            <p className="text-sm text-p-muted">No cargo data yet.</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-12 lg:items-center">
              <AnimatedDonut
                rows={cargoStatusRows}
                size={136}
                stroke={15}
                className="lg:col-span-4"
              />
              <div className="min-w-0 lg:col-span-4">
                <AnimatedHorizontalBars rows={cargoStatusRows} barHeightClass="h-2" />
              </div>
              <InteractiveHistogram rows={cargoStatusRows} className="lg:col-span-4" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
