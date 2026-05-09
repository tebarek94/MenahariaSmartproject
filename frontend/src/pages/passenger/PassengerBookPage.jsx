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

function tripIdsWithActiveTickets(ticketRows) {
  const ids = new Set();
  for (const tk of ticketRows) {
    const st = String(tk?.status ?? "")
      .toLowerCase()
      .trim();
    if (st === "cancelled") continue;
    const raw = tk?.trip_id ?? tk?.tripId;
    if (raw == null || raw === "") continue;
    ids.add(String(raw));
  }
  return ids;
}

function formatTripOptionLabel(t) {
  const route = `${t.origin ?? "—"} → ${t.destination ?? "—"}`;
  const when = formatDate(t.departure_time);
  const price = formatMoney(t.price);
  const plate = t.plate_number ? String(t.plate_number) : "—";
  const driver = t.driver_name ? String(t.driver_name) : "Driver pending";
  return `${route} · ${when} · ${price} · ${plate} · ${driver} · #${t.id}`;
}

function isTripOpenForBooking(trip) {
  if (!trip) return false;

  const status = String(trip?.status ?? "")
    .toLowerCase()
    .trim();
  if (status === "cancelled" || status === "completed") return false;

  const ts = new Date(trip?.departure_time).getTime();
  if (!Number.isFinite(ts)) return false;

  return ts >= Date.now();
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
      const [raw, rawTickets] = await Promise.all([
        tripsService.list(),
        ticketsService.list().catch(() => []),
      ]);
      const ticketRows = normalizeList(rawTickets);
      const alreadyBookedTripIds = tripIdsWithActiveTickets(ticketRows);

      const tripRows = normalizeList(raw)
        .filter(isTripOpenForBooking)
        .filter((t) => !alreadyBookedTripIds.has(String(t.id)));

      const withSeats = await Promise.all(
        tripRows.map(async (trip) => {
          const vid = Number(trip.vehicle_id);
          const tid = Number(trip.id);
          if (!Number.isFinite(vid) || !Number.isFinite(tid)) return null;

          try {
            const seatsRaw = await seatsService.availableByVehicle(vid, tid);
            const available = normalizeList(seatsRaw);

            return {
              ...trip,
              hasSeats: available.length > 0,
            };
          } catch {
            return {
              ...trip,
              hasSeats: false,
            };
          }
        }),
      );

      setTrips(withSeats.filter(Boolean));
      const filtered = withSeats.filter(Boolean);
      setTrips(filtered);
      setPickTrip((prev) =>
        prev && filtered.some((t) => String(t.id) === String(prev.id))
          ? prev
          : null,
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

  const refreshSeatList = useCallback(
    async (trip, { showSpinner = false } = {}) => {
      const vid = Number(trip?.vehicle_id);
      const tid = Number(trip?.id);
      if (!Number.isFinite(vid) || !Number.isFinite(tid)) return;
      if (showSpinner) setSeatsLoading(true);
      try {
        const raw = await seatsService.availableByVehicle(vid, tid);
        setSeats(normalizeList(raw));
      } catch (e) {
        setSeatsError(
          e?.data?.message || e?.message || "Could not load available seats",
        );
        setSeats([]);
      } finally {
        if (showSpinner) setSeatsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!pickTrip) return undefined;
    const vid = Number(pickTrip.vehicle_id);
    const tid = Number(pickTrip.id);
    if (!Number.isFinite(vid) || !Number.isFinite(tid)) return undefined;
    const id = window.setInterval(() => {
      if (bookingId != null) return;
      void refreshSeatList(pickTrip, { showSpinner: false });
    }, 5000);
    return () => window.clearInterval(id);
  }, [pickTrip, bookingId, refreshSeatList]);

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
    await refreshSeatList(trip, { showSpinner: true });
  };

  const closePicker = () => {
    setPickTrip(null);
    setSeats([]);
    setSeatsError("");
    setBookingId(null);
  };

  const onTripSelectChange = (e) => {
    const id = e.target.value;
    if (!id) {
      closePicker();
      return;
    }
    const trip = trips.find((t) => String(t.id) === id);
    if (trip) void openSeatPicker(trip);
  };

  async function bookSeat(seat) {
    if (!pickTrip) return;
    setNotice("");
    setSeatsError("");
    setBookingId(seat.id);

    const vehicleId = Number(pickTrip.vehicle_id);
    const tripId = Number(pickTrip.id);
    const seatNum = Number(seat.seat_number);
    if (
      !Number.isFinite(vehicleId) ||
      !Number.isFinite(tripId) ||
      !Number.isFinite(seatNum)
    ) {
      setSeatsError("Invalid seat or trip.");
      setBookingId(null);
      return;
    }

    let lockToken = null;
    try {
      const lockRes = await seatsService.lock({
        vehicle_id: vehicleId,
        seat_number: seatNum,
        trip_id: tripId,
      });
      lockToken =
        (lockRes && typeof lockRes === "object" && lockRes.lock_token) || null;

      await ticketsService.create({
        trip_id: tripId,
        seat_id: seat.id,
      });
      setNotice(
        `Booked seat ${seat.seat_number ?? seat.id} on trip #${pickTrip.id}. View it under My tickets.`,
      );
      closePicker();
      await loadTrips();
    } catch (e) {
      if (lockToken) {
        await seatsService
          .unlock({
            vehicle_id: vehicleId,
            seat_number: seatNum,
            lock_token: lockToken,
          })
          .catch(() => {});
      }
      const msg =
        e?.data?.message || e?.message || "Booking failed. Try another seat.";
      setSeatsError(msg);
      const alreadyHasTicket =
        e?.status === 409 &&
        /already has a ticket for this trip/i.test(String(msg));
      if (alreadyHasTicket) {
        closePicker();
        await loadTrips();
      } else {
        await refreshSeatList(pickTrip, { showSpinner: false });
      }
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
      {/* animate the text add animate color change     */}
      <div className="animate-pulse">
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
          <span className="animate-pulse">Book a seat</span>
        </h1>
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
        <Card title="Choose a trip" className="min-w-0">
          {trips.length === 0 ? (
            <p className="text-sm text-slate-500">
              No trips are available to book right now (or you already have a
              ticket for every open trip with free seats).
            </p>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="passenger-book-trip"
                className="block text-sm font-medium text-slate-200"
              >
                Trip (route, date, price)
              </label>
              <select
                id="passenger-book-trip"
                className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-100 shadow-inner focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={pickTrip ? String(pickTrip.id) : ""}
                onChange={onTripSelectChange}
              >
                <option value="">— Select a trip to load seats —</option>
                {trips.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {formatTripOptionLabel(t)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Seats lock as soon as they are booked (or briefly held). After
                you reserve, this trip disappears from the list until you cancel
                that ticket.
              </p>
            </div>
          )}
        </Card>

        <Card
          title={pickTrip ? `Seats · trip #${pickTrip.id}` : "Select a trip"}
          subtitle={
            pickTrip
              ? `${pickTrip.origin} → ${pickTrip.destination}`
              : "Choose a trip from the list on the left to see free seats."
          }
          className="min-w-0"
        >
          {pickTrip ? (
            <div className="mb-3 rounded-lg border border-primary-200/70 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900/40">
              <p className="text-p-body font-medium">
                Driver: {pickTrip.driver_name || "Not assigned yet"}
              </p>
              <p className="text-p-muted text-xs">
                Phone: {pickTrip.driver_phone || "Not available"}
              </p>
            </div>
          ) : null}
          {!pickTrip ? (
            <p className="text-sm text-slate-500">
              Use the trip menu on the left (above on small screens).
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
                <Button
                  variant="ghost"
                  className="!text-xs"
                  onClick={closePicker}
                >
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
                        {bookingId === s.id ? "…" : (s.seat_number ?? s.id)}
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
