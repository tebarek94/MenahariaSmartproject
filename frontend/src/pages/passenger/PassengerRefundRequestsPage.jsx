import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { refundRequestsService } from "@/services/refundRequests.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import {
  REALTIME_DISPATCH_EVENT,
  REALTIME_REFUND_REQUEST_UPDATED,
  ROUTES,
} from "@/utils/constants.js";
import { formatDate } from "@/utils/format.js";

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

export function PassengerRefundRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await refundRequestsService.listMine();
      setRows(normalizeList(raw));
    } catch (e) {
      setError(e?.data?.message || e?.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onRt = (e) => {
      if (e.detail?.type === REALTIME_REFUND_REQUEST_UPDATED) refresh();
    };
    window.addEventListener(REALTIME_DISPATCH_EVENT, onRt);
    return () => window.removeEventListener(REALTIME_DISPATCH_EVENT, onRt);
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
      {/* animate the text add animate color change     */}
      <div className="animate-pulse"> 
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl"><span className="animate-pulse">Refund & cancellation requests</span></h1>
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      ) : null}

      <Card title="Your requests">
        {rows.length === 0 ? (
          <div className="space-y-4">
            <p className="text-p-muted text-sm">
              You have not submitted any refund or cancellation requests yet.
            </p>
        
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {rows.map((r) => {
              const st = String(r.status || "").toLowerCase();
              return (
                <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-p-heading">
                        Ticket #{r.ticket_id} · {r.origin} → {r.destination}
                      </p>
                      <p className="text-p-subtle text-xs">
                        Departure {formatDate(r.departure_time)} · Submitted{" "}
                        {formatDate(r.created_at)}
                      </p>
                      {r.message ? (
                        <p className="mt-2 text-sm text-slate-400">
                          Your note: {r.message}
                        </p>
                      ) : null}
                      {r.admin_note ? (
                        <p className="mt-1 text-sm text-primary-200/90">
                          Admin: {r.admin_note}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-1 text-xs font-bold uppercase ${
                        st === "pending"
                          ? "bg-amber-500/20 text-amber-200"
                          : st === "approved"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-slate-600/40 text-slate-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
