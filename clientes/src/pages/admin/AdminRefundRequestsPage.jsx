import { useCallback, useEffect, useState } from "react";
import { refundRequestsService } from "@/services/refundRequests.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import {
  REALTIME_DISPATCH_EVENT,
  REALTIME_REFUND_REQUEST_NEW,
  REALTIME_REFUND_REQUEST_UPDATED,
} from "@/utils/constants.js";
import { formatDate } from "@/utils/format.js";

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

export function AdminRefundRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actingId, setActingId] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [noteForId, setNoteForId] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await refundRequestsService.listAll();
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
      const { type } = e.detail || {};
      if (
        type === REALTIME_REFUND_REQUEST_NEW ||
        type === REALTIME_REFUND_REQUEST_UPDATED
      ) {
        refresh();
      }
    };
    window.addEventListener(REALTIME_DISPATCH_EVENT, onRt);
    return () => window.removeEventListener(REALTIME_DISPATCH_EVENT, onRt);
  }, [refresh]);

  async function resolve(id, status) {
    setNotice("");
    setError("");
    setActingId(id);
    try {
      await refundRequestsService.updateStatus(id, {
        status,
        admin_note: noteForId === id ? adminNote.trim() || null : null,
      });
      setNotice(
        status === "approved"
          ? "Request approved; ticket cancelled and passenger notified."
          : "Request rejected; passenger notified."
      );
      setNoteForId(null);
      setAdminNote("");
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setActingId(null);
    }
  }

  if (loading && !rows.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <p className="rounded-lg border border-primary-800/50 bg-primary-950/40 px-3 py-2 text-sm text-primary-200">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <Card
        title="Refund & cancellation requests"
        subtitle="Passengers can submit at least 10 minutes before departure. Approve to cancel the ticket and mark payment refunded when it was paid; reject to notify with your note."
      >
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2">Id</th>
                <th className="px-2 py-2">Ticket</th>
                <th className="px-2 py-2">Passenger</th>
                <th className="px-2 py-2">Route / departure</th>
                <th className="px-2 py-2">Pay</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Note</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No refund requests
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const pending =
                    String(r.status || "").toLowerCase() === "pending";
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/20">
                      <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                      <td className="px-2 py-2">
                        #{r.ticket_id}
                        <div className="text-[10px] text-slate-500">
                          {r.ticket_code}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="max-w-[140px] truncate">
                          {r.passenger_name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.passenger_phone}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs">
                        <div>
                          {r.origin} → {r.destination}
                        </div>
                        <div className="text-slate-500">
                          {formatDate(r.departure_time)}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {r.payment_status}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            pending
                              ? "bg-amber-500/20 text-amber-200"
                              : String(r.status).toLowerCase() === "approved"
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-slate-600/30 text-slate-300"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="max-w-[200px] px-2 py-2 text-xs text-slate-400">
                        {r.message ? (
                          <span title={r.message}>P: {r.message}</span>
                        ) : null}
                        {r.admin_note ? (
                          <div className="mt-1 text-primary-300/80" title={r.admin_note}>
                            A: {r.admin_note}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {pending ? (
                          <div className="flex min-w-[200px] flex-col gap-2">
                            {noteForId === r.id ? (
                              <Input
                                label="Admin note (optional)"
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Shown to passenger"
                              />
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                className="!text-xs"
                                onClick={() => {
                                  setNoteForId(r.id);
                                  setAdminNote("");
                                }}
                              >
                                Add note…
                              </Button>
                            )}
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                className="!bg-emerald-700 !text-xs hover:!bg-emerald-600"
                                disabled={actingId === r.id}
                                onClick={() => resolve(r.id, "approved")}
                              >
                                {actingId === r.id ? "…" : "Approve"}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="!text-xs text-red-300"
                                disabled={actingId === r.id}
                                onClick={() => resolve(r.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {r.resolved_at
                              ? formatDate(r.resolved_at)
                              : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
