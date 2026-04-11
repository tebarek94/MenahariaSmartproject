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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-p-heading text-lg font-bold sm:text-xl">
            Refund & cancellation requests
          </h2>
          <p className="text-p-muted text-sm">
            New requests are started on{" "}
            <Link
              to={ROUTES.PASSENGER_TICKETS}
              className="font-medium text-emerald-400 underline hover:no-underline"
            >
              My tickets
            </Link>
            ; this page only lists what you already submitted. Admins review and
            you get an in-app notification when they decide.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={ROUTES.PASSENGER_TICKETS}>
            <Button type="button" className="!text-xs">
              Go to My tickets
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            className="!text-xs"
            onClick={() => refresh()}
          >
            Refresh
          </Button>
        </div>
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
            <ol className="list-decimal space-y-2 pl-5 text-sm text-p-body">
              <li>
                Open{" "}
                <Link
                  to={ROUTES.PASSENGER_TICKETS}
                  className="font-medium text-emerald-400 underline hover:no-underline"
                >
                  My tickets
                </Link>
                .
              </li>
              <li>
                On a ticket card, use the button that matches your case:{" "}
                <strong className="text-p-heading">Request refund</strong> if you
                already paid, or{" "}
                <strong className="text-p-heading">Request cancellation</strong>{" "}
                if the fare is still unpaid (reserved).
              </li>
              <li>
                The button only appears when departure is still{" "}
                <strong className="text-p-heading">more than 10 minutes away</strong>
                , the ticket is active, and you do not already have a pending or
                approved request for that ticket.
              </li>
              <li>
                After you submit, come back here —{" "}
                <strong className="text-p-heading">Refund requests</strong> in the
                sidebar — to see status (pending / approved / rejected).
              </li>
            </ol>
            <Link to={ROUTES.PASSENGER_TICKETS}>
              <Button type="button">Go to My tickets</Button>
            </Link>
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
