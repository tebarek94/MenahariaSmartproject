import { useCallback, useEffect, useState } from "react";
import { cargoService } from "@/services/cargo.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { formatDate, formatMoney } from "@/utils/format.js";
import { isCargoFeePaid } from "@/utils/cargoPayment.js";
import { RefreshIcon } from "@/ui/icons.jsx";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function DriverCargoPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await cargoService.list();
      setRows(normalizeList(data));
    } catch (e) {
      if (!silent) setError(e?.message || "Failed to load cargo");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => refresh({ silent: true }), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

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
       
        <Button variant="ghost" className="self-start" onClick={() => refresh()}>
    
          <RefreshIcon className="w-4 h-4" />
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <Card title={`Cargo items (${rows.length})`} className="!p-3 sm:!p-4">
        <div className="overflow-x-auto rounded-lg border border-primary-900/20 dark:border-primary-900/30">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900/95 dark:text-primary-400/90">
              <tr className="border-b border-slate-200 dark:border-primary-900/40">
                <th className="px-2 py-2 font-semibold">ID</th>
                <th className="px-2 py-2 font-semibold">Owner</th>
                <th className="px-2 py-2 font-semibold">Route</th>
                <th className="px-2 py-2 font-semibold">Trip</th>
                <th className="px-2 py-2 font-semibold">Departure</th>
                <th className="px-2 py-2 font-semibold">Vehicle</th>
                <th className="px-2 py-2 font-semibold">Weight</th>
                <th className="px-2 py-2 font-semibold">Fee</th>
                <th className="px-2 py-2 font-semibold">Fee paid</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Tracking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/90">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-10 text-center text-slate-500 dark:text-slate-500"
                  >
                    No cargo on your assigned trips
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-2 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {r.id}
                    </td>
                    <td className="max-w-[140px] truncate px-2 py-2 text-slate-800 dark:text-slate-200">
                      {r.owner_name || `User #${r.owner_id}`}
                    </td>
                    <td className="max-w-[200px] truncate px-2 py-2 text-slate-600 dark:text-slate-400">
                      {r.route_origin && r.route_destination
                        ? `${r.route_origin} → ${r.route_destination}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{r.trip_id}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-600 dark:text-slate-500">
                      {r.trip_departure_time ? formatDate(r.trip_departure_time) : "—"}
                    </td>
                    <td className="max-w-[120px] truncate px-2 py-2 text-slate-600 dark:text-slate-400">
                      {r.vehicle_plate || "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{r.weight}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-700 dark:text-slate-300">
                      {formatMoney(r.fee)}
                    </td>
                    <td className="px-2 py-2 text-xs capitalize text-slate-700 dark:text-slate-300">
                      {isCargoFeePaid(r.payment_status) ? "yes" : r.payment_status || "pending"}
                    </td>
                    <td className="px-2 py-2 capitalize text-slate-700 dark:text-slate-300">
                      {r.status || "—"}
                    </td>
                    <td className="max-w-[100px] truncate px-2 py-2 font-mono text-xs text-slate-500">
                      {r.tracking_code || "—"}
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
