import { useCallback, useEffect, useMemo, useState } from "react";
import { ticketsService } from "@/services/tickets.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { formatDate } from "@/utils/format.js";
import { RefreshCwIcon } from "@/ui/icons";
// import { RefreshIcon } from "@/ui/icons.jsx";

function seatLabel(t) {
  if (t.seat_number != null && t.seat_number !== "") return String(t.seat_number);
  if (t.seat_id != null) return `#${t.seat_id}`;
  return "—";
}

export function DriverPassengersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ticketsService.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load passengers");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = a.departure_time ? new Date(a.departure_time).getTime() : 0;
      const db = b.departure_time ? new Date(b.departure_time).getTime() : 0;
      if (db !== da) return db - da;
      const ia = a.issued_at ? new Date(a.issued_at).getTime() : 0;
      const ib = b.issued_at ? new Date(b.issued_at).getTime() : 0;
      return ib - ia;
    });
  }, [rows]);

  if (loading && !rows.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* add simple text */}
        <p className="text-sm text-p-muted">
          This page shows all passengers on your trips.
        </p>
        <Button variant="ghost" className="shrink-0 self-start" onClick={() => load()}>
          <RefreshCwIcon className="w-4 h-4" />
        </Button>
      </div>

      {error ? (
        <Card title="Error">
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          <Button className="mt-3" variant="primary" onClick={() => load()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <Card
        title={`Assigned passengers (${sorted.length})`}
        subtitle="Read-only manifest — name, phone, route, seat, ticket status"
        className="!p-3 sm:!p-4"
      >
        <div className="overflow-x-auto rounded-lg border border-primary-900/20 dark:border-primary-900/30">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900/95 dark:text-primary-400/90">
              <tr className="border-b border-slate-200 dark:border-primary-900/40">
                <th className="px-2 py-2 font-semibold">Ticket</th>
                <th className="px-2 py-2 font-semibold">Passenger</th>
                <th className="px-2 py-2 font-semibold">Phone</th>
                <th className="px-2 py-2 font-semibold">Route</th>
                <th className="px-2 py-2 font-semibold">Trip</th>
                <th className="px-2 py-2 font-semibold">Departure</th>
                <th className="px-2 py-2 font-semibold">Seat</th>
                <th className="px-2 py-2 font-semibold">Code</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/90">
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-10 text-center text-slate-500 dark:text-slate-500"
                  >
                    No passenger bookings on your assigned trips yet
                  </td>
                </tr>
              ) : (
                sorted.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-2 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {t.id}
                    </td>
                    <td className="max-w-[140px] truncate px-2 py-2 text-slate-800 dark:text-slate-200">
                      {t.passenger_name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-600 dark:text-slate-400">
                      {t.passenger_phone || "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-2 py-2 text-slate-600 dark:text-slate-400">
                      {t.origin && t.destination
                        ? `${t.origin} → ${t.destination}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400">
                      {t.trip_id ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-600 dark:text-slate-500">
                      {t.departure_time ? formatDate(t.departure_time) : "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-700 dark:text-slate-300">
                      {seatLabel(t)}
                    </td>
                    <td className="max-w-[100px] truncate px-2 py-2 font-mono text-xs text-slate-500">
                      {t.ticket_code || "—"}
                    </td>
                    <td className="px-2 py-2 capitalize text-slate-700 dark:text-slate-300">
                      {t.status || "—"}
                    </td>
                    <td className="px-2 py-2 capitalize text-slate-700 dark:text-slate-300">
                      {t.payment_status || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
