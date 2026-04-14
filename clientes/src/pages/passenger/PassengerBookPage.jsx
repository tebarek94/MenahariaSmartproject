import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tripsService } from "@/services/trips.service.js";
import { seatsService } from "@/services/seats.service.js";
import { ticketsService } from "@/services/tickets.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { ROUTES } from "@/utils/constants.js";
import { formatDate, formatMoney } from "@/utils/format.js";

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

function isTripOpenForBooking(trip) {
  const status = String(trip?.status ?? "").toLowerCase();
  const allowedStatus =
    status === "" ||
    status === "scheduled" ||
    status === "ongoing" ||
    status === "open" ||
    status === "active";
  if (!allowedStatus) return false;

  const ts = new Date(trip?.departure_time ?? "").getTime();
  if (!Number.isFinite(ts)) return true;
  return ts > Date.now();
}

export function PassengerBookPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [pickTrip, setPickTrip] = useState(null);
  const [seats, setSeats] = useState([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [seatsError, setSeatsError] = useState("");
  const [bookingId, setBookingId] = useState(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await tripsService.list();
      const tripRows = normalizeList(raw).filter(isTripOpenForBooking);
      const withSeats = await Promise.all(
        tripRows.map(async (trip) => {
          const vid = Number(trip.vehicle_id);
          const tid = Number(trip.id);
          if (!Number.isFinite(vid) || !Number.isFinite(tid)) return null;
          try {
            const seatsRaw = await seatsService.availableByVehicle(vid, tid);
            const available = normalizeList(seatsRaw);
            if (!available.length) return null;
            return trip;
          } catch {
            return null;
          }
        })
      );
      const filtered = withSeats.filter(Boolean);
      setTrips(filtered);
      setPickTrip((prev) =>
        prev && filtered.some((t) => String(t.id) === String(prev.id)) ? prev : null
      );
    } catch (e) {
      setError(e?.data?.message || e?.message || "Failed to load trips");
      setTrips([]);
      setPickTrip(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const openSeatPicker = async (trip) => {
    setPickTrip(trip);
    setSeats([]);
    setSeatsError("");
    setNotice("");
    const vid = Number(trip.vehicle_id);
    const tid = Number(trip.id);
    if (!Number.isFinite(vid) || !Number.isFinite(tid)) {
      setSeatsError("Trip is missing vehicle information.");
      return;
    }
    setSeatsLoading(true);
    try {
      const raw = await seatsService.availableByVehicle(vid, tid);
      setSeats(normalizeList(raw));
    } catch (e) {
      setSeatsError(
        e?.data?.message || e?.message || "Could not load available seats"
      );
      setSeats([]);
    } finally {
      setSeatsLoading(false);
    }
  };

  const closePicker = () => {
    setPickTrip(null);
    setSeats([]);
    setSeatsError("");
    setBookingId(null);
  };

  async function bookSeat(seat) {
    if (!pickTrip) return;
    setNotice("");
    setSeatsError("");
    setBookingId(seat.id);
    try {
      await ticketsService.create({
        trip_id: pickTrip.id,
        seat_id: seat.id,
      });
      setNotice(
        `Booked seat ${seat.seat_number ?? seat.id} on trip #${pickTrip.id}. View it under My tickets.`,
      );
      closePicker();
      await loadTrips();
    } catch (e) {
      setSeatsError(
        e?.data?.message || e?.message || "Booking failed. Try another seat."
      );
    } finally {
      setBookingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-p-muted text-sm">
            Choose a scheduled trip, then pick a free seat. You can only hold
            one active ticket per trip.
          </p>
        </div>
        <Button
          variant="ghost"
          className="!shrink-0 !text-xs"
          type="button"
          onClick={async () => {
            setLoading(true);
            await loadTrips();
          }}
        >
          Refresh trips
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
          {notice}{" "}
          <Link
            to={ROUTES.PASSENGER_TICKETS}
            className="font-medium underline hover:no-underline"
          >
            Open tickets
          </Link>
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Available trips" className="min-w-0">
          {trips.length === 0 ? (
            <p className="text-sm text-slate-500">No trips open for booking.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {trips.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-p-heading font-medium">
                      {t.origin ?? "—"} → {t.destination ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(t.departure_time)} · {t.plate_number ?? "—"} ·{" "}
                      {formatMoney(t.price)}
                    </p>
                    <p className="text-[10px] uppercase text-slate-600">
                      Trip #{t.id} · {t.status}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => openSeatPicker(t)}
                  >
                    Choose seat
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={pickTrip ? `Seats · trip #${pickTrip.id}` : "Select a trip"}
          subtitle={
            pickTrip
              ? `${pickTrip.origin} → ${pickTrip.destination}`
              : "Click “Choose seat” on a trip to see free seats."
          }
          className="min-w-0"
        >
          {!pickTrip ? (
            <p className="text-sm text-slate-500">
              Trip list is on the left (above on small screens).
            </p>
          ) : seatsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              {seatsError ? (
                <p className="mb-3 text-sm text-red-400">{seatsError}</p>
              ) : null}
              <div className="mb-3 flex flex-wrap gap-2">
                <Button variant="ghost" className="!text-xs" onClick={closePicker}>
                  Close
                </Button>
                <Button
                  variant="ghost"
                  className="!text-xs"
                  type="button"
                  onClick={() => openSeatPicker(pickTrip)}
                >
                  Reload seats
                </Button>
              </div>
              {seats.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No free seats for this departure right now.
                </p>
              ) : (
                <div className="max-h-[min(55vh,26rem)] overflow-y-auto overscroll-contain pr-0.5">
                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(2.4rem, 1fr))",
                    }}
                  >
                    {seats.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={bookingId != null}
                        onClick={() => bookSeat(s)}
                        className="min-h-[2.25rem] rounded-md border border-emerald-800/50 bg-emerald-950/30 px-1 py-1.5 text-center text-xs font-medium tabular-nums text-emerald-100 transition hover:bg-emerald-900/40 disabled:opacity-50 sm:min-h-[2.5rem] sm:text-sm"
                      >
                        {bookingId === s.id ? "…" : s.seat_number ?? s.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
