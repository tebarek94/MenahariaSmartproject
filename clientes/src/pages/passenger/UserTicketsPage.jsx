import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ticketsService } from "@/services/tickets.service.js";
import { paymentService } from "@/services/payment.service.js";
import { refundRequestsService } from "@/services/refundRequests.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import {
  REALTIME_DISPATCH_EVENT,
  REALTIME_REFUND_REQUEST_UPDATED,
  ROUTES,
  STORAGE_KEYS,
} from "@/utils/constants.js";

const POLL_MS = 30_000;
const MINUTES_BEFORE_DEPARTURE = 10;
const MIN_MS_BEFORE_DEPARTURE = MINUTES_BEFORE_DEPARTURE * 60 * 1000;

function normalizeTickets(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

function requestsByTicketId(list) {
  const m = new Map();
  for (const r of list) {
    const tid = Number(r.ticket_id);
    if (!Number.isFinite(tid)) continue;
    if (!m.has(tid)) m.set(tid, []);
    m.get(tid).push(r);
  }
  return m;
}

function refundBadge(ticketId, byTicket) {
  const arr = byTicket.get(Number(ticketId)) || [];
  const pending = arr.find(
    (x) => String(x.status || "").toLowerCase() === "pending"
  );
  if (pending) {
    return { text: "Refund pending", cls: "bg-amber-500/20 text-amber-200" };
  }
  const ap = arr.find(
    (x) => String(x.status || "").toLowerCase() === "approved"
  );
  if (ap) {
    return { text: "Refund approved", cls: "bg-emerald-500/20 text-emerald-200" };
  }
  const rj = arr.find(
    (x) => String(x.status || "").toLowerCase() === "rejected"
  );
  if (rj) {
    return { text: "Refund rejected", cls: "bg-red-500/20 text-red-200" };
  }
  return null;
}

/**
 * @returns {{ type: 'none' } | { type: 'enabled', label: string } | { type: 'disabled', label: string, reason: string }}
 */
function getRefundRequestAction(ticket, byTicket) {
  const st = String(ticket.status || "").toLowerCase();
  if (st === "cancelled" || st === "used") return { type: "none" };
  if (st !== "reserved" && st !== "confirmed") return { type: "none" };

  const tid = Number(ticket.id);
  const arr = byTicket.get(tid) || [];
  if (arr.some((x) => String(x.status || "").toLowerCase() === "pending")) {
    return { type: "none" };
  }
  if (arr.some((x) => String(x.status || "").toLowerCase() === "approved")) {
    return { type: "none" };
  }

  const paid = isPaymentSettled(ticket.payment_status);
  const label = paid ? "Request refund" : "Request cancellation";

  const dep = ticket.departure_time
    ? new Date(ticket.departure_time).getTime()
    : 0;
  const now = Date.now();
  if (!dep || dep <= now) {
    return {
      type: "disabled",
      label,
      reason:
        "Trip has started or departed — refund and cancellation requests are closed.",
    };
  }
  if (dep - now < MIN_MS_BEFORE_DEPARTURE) {
    return {
      type: "disabled",
      label,
      reason: `Less than ${MINUTES_BEFORE_DEPARTURE} minutes before departure — refund and cancellation requests are closed.`,
    };
  }

  return { type: "enabled", label };
}

function isPaymentSettled(paymentStatus) {
  const s = String(paymentStatus || "").toLowerCase();
  return s === "paid" || s === "completed";
}

export function UserTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [refundByTicket, setRefundByTicket] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [verifyingReturn, setVerifyingReturn] = useState(false);
  const [refundModalTicket, setRefundModalTicket] = useState(null);
  const [refundMessage, setRefundMessage] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const loadAll = useCallback(async (opts = { quiet: false }) => {
    try {
      if (!opts.quiet) setLoading(true);
      const [tRes, rRes] = await Promise.all([
        ticketsService.list(),
        refundRequestsService.listMine().catch(() => []),
      ]);
      setTickets(normalizeTickets(tRes));
      setRefundByTicket(requestsByTicketId(normalizeTickets(rRes)));
      setLastSync(new Date());
      setError("");
    } catch (err) {
      setError(err?.data?.message || "Failed to load tickets");
    } finally {
      if (!opts.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const onRt = (e) => {
      if (e.detail?.type === REALTIME_REFUND_REQUEST_UPDATED) {
        loadAll({ quiet: true });
      }
    };
    window.addEventListener(REALTIME_DISPATCH_EVENT, onRt);
    return () => window.removeEventListener(REALTIME_DISPATCH_EVENT, onRt);
  }, [loadAll]);

  /** After Chapa redirects back here, confirm payment server-side. */
  useEffect(() => {
    const pending = sessionStorage.getItem(STORAGE_KEYS.CHAPA_PENDING_TX_REF);
    if (!pending) return;

    let cancelled = false;
    setVerifyingReturn(true);
    (async () => {
      try {
        const data = await paymentService.chapaVerify(pending);
        if (cancelled) return;
        if (String(data?.status || "").toLowerCase() !== "success") {
          setError(data?.message || "Payment was not completed");
          return;
        }
        sessionStorage.removeItem(STORAGE_KEYS.CHAPA_PENDING_TX_REF);
        await loadAll({ quiet: true });
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.data?.message || err?.message || "Payment verification failed"
          );
        }
      } finally {
        if (!cancelled) setVerifyingReturn(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  useEffect(() => {
    const id = setInterval(() => loadAll({ quiet: true }), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible")
        loadAll({ quiet: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadAll]);

  const handlePayWithChapa = async (ticket) => {
    const amt = Number(ticket.trip_price);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Trip price is missing; contact support.");
      return;
    }
    setPayingId(ticket.id);
    setError("");
    try {
      const returnUrl = `${window.location.origin}${ROUTES.PASSENGER_TICKETS}`;
      const data = await paymentService.chapaInitialize({
        ticket_id: ticket.id,
        amount: amt,
        return_url: returnUrl,
      });
      const checkoutUrl = data?.checkout_url;
      const txRef = data?.tx_ref;
      if (!checkoutUrl || !txRef) {
        setError("Invalid payment response from server");
        return;
      }
      sessionStorage.setItem(STORAGE_KEYS.CHAPA_PENDING_TX_REF, txRef);
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err?.data?.message || err.message || "Could not start payment");
    } finally {
      setPayingId(null);
    }
  };

  const handleDownloadTicket = async (ticketId) => {
    try {
      const tokenResponse = await ticketsService.generateDownloadToken(ticketId);
      const downloadToken = tokenResponse.download_token;

      if (!downloadToken) {
        setError("Failed to generate download token");
        return;
      }

      const link = document.createElement("a");
      link.href = ticketsService.getDownloadUrl(downloadToken);
      link.download = `ticket_${ticketId}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setError("");
    } catch (err) {
      setError(err?.data?.message || "Failed to download ticket");
    }
  };

  async function submitRefundRequest() {
    if (!refundModalTicket) return;
    setRefundSubmitting(true);
    setError("");
    try {
      await refundRequestsService.create({
        ticket_id: refundModalTicket.id,
        message: refundMessage.trim() || undefined,
      });
      setRefundModalTicket(null);
      setRefundMessage("");
      await loadAll({ quiet: true });
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          "Could not submit refund request"
      );
    } finally {
      setRefundSubmitting(false);
    }
  }

  if (loading || verifyingReturn) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Spinner />
        {verifyingReturn ? (
          <p className="text-p-muted text-sm">Confirming payment…</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-p-heading text-lg font-bold sm:text-xl lg:text-2xl">
            My tickets
          </h2>
          <p className="text-p-muted">
            Download your tickets here. To ask for money back or cancel a booking,
            use <strong className="text-p-body">Request refund</strong> (paid) or{" "}
            <strong className="text-p-body">Request cancellation</strong> (unpaid)
            on each ticket card when departure is at least 10 minutes away. Track
            every submission on{" "}
            <Link
              to={ROUTES.PASSENGER_REFUNDS}
              className="font-medium text-emerald-400 underline hover:no-underline"
            >
              Refund requests
            </Link>{" "}
            (same as the sidebar link).
          </p>
          {lastSync ? (
            <p className="text-p-subtle text-xs">
              Last updated {lastSync.toLocaleString()} · every {POLL_MS / 1000}s
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={ROUTES.PASSENGER_DASHBOARD}>
            <Button variant="ghost" className="!text-xs">
              ← Dashboard
            </Button>
          </Link>
          <Link to={ROUTES.PASSENGER_BOOK}>
            <Button variant="ghost" className="!text-xs">
              Book a trip
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="!text-xs"
            type="button"
            onClick={() => loadAll({ quiet: true })}
          >
            Refresh now
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      <div className="grid gap-4">
        {tickets.length === 0 ? (
          <Card>
            <p className="text-p-muted">No tickets found</p>
          </Card>
        ) : (
          tickets.map((ticket) => {
            const badge = refundBadge(ticket.id, refundByTicket);
            const refundAction = getRefundRequestAction(ticket, refundByTicket);
            return (
              <Card key={ticket.id} className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 space-y-2">
                    <h3 className="text-p-heading text-lg font-semibold">
                      Ticket #{ticket.id}
                    </h3>
                    <p className="text-p-body">
                      {ticket.origin} to {ticket.destination}
                    </p>
                    <p className="text-slate-400 text-sm">
                      Passenger: {ticket.passenger_name}
                    </p>
                    <p className="text-slate-400 text-sm">
                      Departure:{" "}
                      {new Date(ticket.departure_time).toLocaleString()}
                    </p>
                    <p className="text-slate-400 text-sm">
                      Seat:{" "}
                      {ticket.seat_number != null && ticket.seat_number !== ""
                        ? ticket.seat_number
                        : ticket.seat_id}
                    </p>
                    {ticket.trip_price != null && ticket.trip_price !== "" ? (
                      <p className="text-p-body text-sm font-medium">
                        Fare: {Number(ticket.trip_price).toFixed(2)} ETB
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          ticket.status === "confirmed"
                            ? "bg-green-500 text-white"
                            : ticket.status === "reserved"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-500 text-white"
                        }`}
                      >
                        {ticket.status?.toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          ticket.payment_status === "completed" ||
                          ticket.payment_status === "paid"
                            ? "bg-green-500 text-white"
                            : ticket.payment_status === "pending"
                              ? "bg-yellow-500 text-white"
                              : "bg-gray-500 text-white"
                        }`}
                      >
                        {ticket.payment_status?.toUpperCase()}
                      </span>
                      {badge ? (
                        <span
                          className={`rounded px-2 py-1 text-xs font-bold ${badge.cls}`}
                        >
                          {badge.text}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {!isPaymentSettled(ticket.payment_status) ? (
                      <Button
                        type="button"
                        disabled={
                          payingId === ticket.id ||
                          !Number.isFinite(Number(ticket.trip_price)) ||
                          Number(ticket.trip_price) <= 0
                        }
                        onClick={() => handlePayWithChapa(ticket)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500"
                      >
                        {payingId === ticket.id
                          ? "Opening Chapa…"
                          : "Pay with Chapa"}
                      </Button>
                    ) : null}
                    {refundAction.type === "enabled" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="!border !border-amber-700/50 !text-amber-200"
                        onClick={() => {
                          setRefundModalTicket(ticket);
                          setRefundMessage("");
                          setError("");
                        }}
                      >
                        {refundAction.label}
                      </Button>
                    ) : refundAction.type === "disabled" ? (
                      <div className="flex max-w-[14rem] flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled
                          className="!cursor-not-allowed !border !border-slate-600 !text-slate-500 !opacity-70"
                        >
                          {refundAction.label}
                        </Button>
                        <p className="text-xs text-slate-500">
                          {refundAction.reason}
                        </p>
                      </div>
                    ) : null}
                    <Button
                      onClick={() => handleDownloadTicket(ticket.id)}
                      className="px-4 py-2"
                    >
                      Download Ticket
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {refundModalTicket ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
            <h3 className="text-p-heading mb-2 text-lg font-semibold">
              Refund / cancellation request
            </h3>
            <p className="text-p-muted mb-4 text-sm">
              Ticket #{refundModalTicket.id} ·{" "}
              {new Date(
                refundModalTicket.departure_time
              ).toLocaleString()}{" "}
              departure. Admins receive a notification and can approve (ticket
              cancelled
              {isPaymentSettled(refundModalTicket.payment_status)
                ? "; paid fares marked refunded in the system"
                : ""}
              ) or reject with a note.
            </p>
            <p className="mb-4 text-xs text-slate-500">
              After submitting, open{" "}
              <Link
                to={ROUTES.PASSENGER_REFUNDS}
                className="text-emerald-400 underline hover:no-underline"
              >
                Refund requests
              </Link>{" "}
              to follow pending / approved / rejected status.
            </p>
            <Input
              label="Message to admin (optional)"
              value={refundMessage}
              onChange={(e) => setRefundMessage(e.target.value)}
              placeholder="Reason or bank details if needed"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={refundSubmitting}
                onClick={() => {
                  setRefundModalTicket(null);
                  setRefundMessage("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={refundSubmitting}
                onClick={() => submitRefundRequest()}
              >
                {refundSubmitting ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
