import { useCallback, useEffect, useMemo, useState } from "react";
import { ticketsService } from "@/services/tickets.service.js";
import { Card } from "@/ui/Card.jsx";
import { Spinner } from "@/ui/Spinner.jsx";

function normalizeTickets(payload) {
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export function PassengerAssignedDriverPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ticketsService.list();
      setTickets(normalizeTickets(data));
    } catch (e) {
      setError(e?.data?.message || e?.message || "Failed to load driver profile");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assignedTrips = useMemo(
    () =>
      tickets
        .filter((t) => Number(t.trip_id) > 0)
        .sort(
          (a, b) =>
            new Date(a.departure_time || 0).getTime() -
            new Date(b.departure_time || 0).getTime()
        ),
    [tickets]
  );

  if (loading) {
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
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl"><span className="animate-pulse">Assigned driver profile</span></h1>
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      ) : null}

      {assignedTrips.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No booked trips yet. Driver details appear here once you reserve a trip.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assignedTrips.map((t) => (
            <Card
              key={t.id}
              title={`${t.origin || "—"} → ${t.destination || "—"}`}
              subtitle={`Trip ${t.trip_id || "—"} · Ticket ${t.id}`}
            >
              <div className="space-y-1 text-sm">
                <p className="text-p-body">
                  <span className="text-p-muted">Driver:</span>{" "}
                  {t.driver_name || "Not assigned"}
                </p>
                <p className="text-p-body">
                  <span className="text-p-muted">Phone:</span>{" "}
                  {t.driver_phone || "Not available"}
                </p>
                <p className="text-p-body">
                  <span className="text-p-muted">Email:</span>{" "}
                  {t.driver_email || "Not available"}
                </p>
                <p className="text-p-muted text-xs">
                  Departure:{" "}
                  {t.departure_time
                    ? new Date(t.departure_time).toLocaleString()
                    : "Not scheduled"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
