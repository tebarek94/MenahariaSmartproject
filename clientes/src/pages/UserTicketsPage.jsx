import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ticketsService } from "@/services/tickets.service.js";
import { paymentService } from "@/services/payment.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { ROUTES, STORAGE_KEYS } from "@/utils/constants.js";

const POLL_MS = 30_000;

function normalizeTickets(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

function isPaymentSettled(paymentStatus) {
  const s = String(paymentStatus || "").toLowerCase();
  return s === "paid" || s === "completed";
}

export function UserTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [verifyingReturn, setVerifyingReturn] = useState(false);

  const loadUserTickets = useCallback(async (opts = { quiet: false }) => {
    try {
      if (!opts.quiet) setLoading(true);
      const response = await ticketsService.list();
      setTickets(normalizeTickets(response));
      setLastSync(new Date());
      setError("");
    } catch (err) {
      setError(err?.data?.message || "Failed to load tickets");
    } finally {
      if (!opts.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserTickets();
  }, [loadUserTickets]);

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
        await loadUserTickets({ quiet: true });
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
  }, [loadUserTickets]);

  useEffect(() => {
    const id = setInterval(() => loadUserTickets({ quiet: true }), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible")
        loadUserTickets({ quiet: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadUserTickets]);

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
      // Generate download token and download ticket
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
            Download your booked tickets for verification. List refreshes in the
            background.
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
            onClick={() => loadUserTickets({ quiet: true })}
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
          tickets.map((ticket) => (
            <Card key={ticket.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
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
                    Departure: {new Date(ticket.departure_time).toLocaleString()}
                  </p>
                  <p className="text-slate-400 text-sm">
                    Seat: {ticket.seat_id}
                  </p>
                  {ticket.trip_price != null && ticket.trip_price !== "" ? (
                    <p className="text-p-body text-sm font-medium">
                      Fare: {Number(ticket.trip_price).toFixed(2)} ETB
                    </p>
                  ) : null}
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      ticket.status === 'confirmed' ? 'bg-green-500 text-white' : 
                      ticket.status === 'reserved' ? 'bg-blue-500 text-white' : 
                      'bg-gray-500 text-white'
                    }`}>
                      {ticket.status?.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      ticket.payment_status === 'completed' || ticket.payment_status === 'paid' ? 'bg-green-500 text-white' : 
                      ticket.payment_status === 'pending' ? 'bg-yellow-500 text-white' : 
                      'bg-gray-500 text-white'
                    }`}>
                      {ticket.payment_status?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
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
                      {payingId === ticket.id ? "Opening Chapa…" : "Pay with Chapa"}
                    </Button>
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
          ))
        )}
      </div>
    </div>
  );
}
