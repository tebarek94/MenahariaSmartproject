import { useCallback, useEffect, useState } from "react";
import { notificationsService } from "@/services/notifications.service.js";
import {
  REALTIME_DISPATCH_EVENT,
  REALTIME_NOTIFICATION_NEW,
} from "@/utils/constants.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { formatDate } from "@/utils/format.js";

export function DriverNotificationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await notificationsService.list();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setRows(list);
    } catch (e) {
      if (!silent) setError(e?.message || "Failed to load notifications");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onRealtime = (e) => {
      if (e.detail?.type === REALTIME_NOTIFICATION_NEW) {
        refresh({ silent: true });
      }
    };
    window.addEventListener(REALTIME_DISPATCH_EVENT, onRealtime);
    return () => window.removeEventListener(REALTIME_DISPATCH_EVENT, onRealtime);
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
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl lg:text-2xl">
            Notifications
          </h2>
          <p className="text-sm text-slate-600 dark:text-primary-400/80">
            Alerts when passengers book your trips (created automatically). Updates in real time when
            connected, and also refreshes every minute and when you return to this tab.
          </p>
        </div>
        <Button variant="ghost" className="self-start" onClick={() => refresh()}>
          Refresh now
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <Card title={`Your alerts (${rows.length})`} className="!p-3 sm:!p-4">
        <div className="overflow-x-auto rounded-lg border border-primary-900/20 dark:border-primary-900/30">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900/95 dark:text-primary-400/90">
              <tr className="border-b border-slate-200 dark:border-primary-900/40">
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Message</th>
                <th className="px-3 py-2 font-semibold">Channel</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/90">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-slate-500 dark:text-slate-500"
                  >
                    No notifications yet — you will see new passenger bookings here.
                  </td>
                </tr>
              ) : (
                rows.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                      {n.created_at ? formatDate(n.created_at) : "—"}
                    </td>
                    <td className="max-w-[480px] px-3 py-2 text-slate-800 dark:text-slate-200">
                      {n.message || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      {n.channel || "—"}
                    </td>
                    <td className="px-3 py-2 capitalize text-slate-700 dark:text-slate-300">
                      {n.status || "—"}
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
