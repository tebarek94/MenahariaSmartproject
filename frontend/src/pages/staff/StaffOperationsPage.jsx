import { useCallback, useEffect, useMemo, useState } from "react";
import { ticketsService } from "@/services/tickets.service.js";
import { cargoService } from "@/services/cargo.service.js";
import { tripsService } from "@/services/trips.service.js";
import { seatsService } from "@/services/seats.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { formatDate } from "@/utils/format.js";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function StaffOperationsPage() {
  const [tickets, setTickets] = useState([]);
  const [tripOptions, setTripOptions] = useState([]);
  const [passengerOptions, setPassengerOptions] = useState([]);
  const [seatOptions, setSeatOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ticketForm, setTicketForm] = useState({
    user_id: "",
    trip_id: "",
    seat_id: "",
    status: "reserved",
    payment_status: "pending",
  });
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [qrToken, setQrToken] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [t, publicTrips] = await Promise.all([
        ticketsService.list(),
        tripsService.browsePublic(),
        cargoService.list(),
      ]);
      const ticketRows = normalizeList(t);
      const tripRows = normalizeList(publicTrips);
      setTickets(ticketRows);

      const pMap = new Map();
      ticketRows.forEach((row) => {
        const id = Number(row.user_id);
        if (!Number.isInteger(id) || id <= 0 || pMap.has(id)) return;
        pMap.set(id, {
          id,
          name: row.passenger_name || `Passenger #${id}`,
        });
      });
      setPassengerOptions(
        [...pMap.values()].sort((a, b) => a.name.localeCompare(b.name))
      );

      setTripOptions(
        tripRows
          .map((row) => ({
            id: Number(row.id),
            vehicle_id: Number(row.vehicle_id),
            label: `${row.origin || "-"} -> ${row.destination || "-"} (#${row.id})`,
          }))
          .filter((row) => Number.isInteger(row.id) && row.id > 0)
      );
    } catch (e) {
      setError(e?.message || "Failed to load staff operations data");
      setTickets([]);
      setTripOptions([]);
      setPassengerOptions([]);
      setSeatOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    let active = true;
    async function loadSeatsForTrip() {
      const tripId = Number(ticketForm.trip_id);
      if (!Number.isInteger(tripId) || tripId <= 0) {
        setSeatOptions([]);
        return;
      }
      const trip = tripOptions.find((t) => Number(t.id) === tripId);
      if (!trip || !Number.isInteger(trip.vehicle_id) || trip.vehicle_id <= 0) {
        setSeatOptions([]);
        return;
      }
      try {
        const seats = await seatsService.availableByVehicle(trip.vehicle_id, tripId);
        if (!active) return;
        const options = normalizeList(seats).map((s) => ({
          id: Number(s.id ?? s.seat_id),
          label:
            s.seat_number != null && s.seat_number !== ""
              ? `Seat ${s.seat_number} (#${s.id ?? s.seat_id})`
              : `Seat #${s.id ?? s.seat_id}`,
        }));
        setSeatOptions(
          options.filter((s) => Number.isInteger(s.id) && s.id > 0)
        );
      } catch {
        if (active) setSeatOptions([]);
      }
    }
    loadSeatsForTrip();
    return () => {
      active = false;
    };
  }, [ticketForm.trip_id, tripOptions]);

  const latestTickets = useMemo(
    () =>
      [...tickets]
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
        .slice(0, 12),
    [tickets]
  );

  async function handleCreateTicket(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    try {
      await ticketsService.create({
        user_id: Number(ticketForm.user_id),
        trip_id: Number(ticketForm.trip_id),
        seat_id: Number(ticketForm.seat_id),
        status: ticketForm.status,
        payment_status: ticketForm.payment_status,
      });
      setNotice("Passenger booking created.");
      setTicketForm((prev) => ({ ...prev, seat_id: "" }));
      await loadAll();
    } catch (err) {
      setError(err?.message || "Could not create booking");
    }
  }

  async function handleValidateQr(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    try {
      const data = await ticketsService.validateQr(qrToken.trim());
      const ticket = data?.ticket || {};
      setNotice(
        `Ticket validated: #${ticket.id ?? "?"} ${ticket.origin ?? ""} -> ${ticket.destination ?? ""}`.trim()
      );
      setQrToken("");
      await loadAll();
    } catch (err) {
      setError(err?.message || "QR validation failed");
    }
  }

  async function updateBoardingStatus(row, status) {
    setNotice("");
    setError("");
    try {
      await ticketsService.update(row.id, {
        user_id: Number(row.user_id),
        trip_id: Number(row.trip_id),
        seat_id: Number(row.seat_id),
        ticket_code: row.ticket_code || null,
        status,
        payment_status: row.payment_status || "pending",
      });
      setNotice(`Boarding status updated for ticket #${row.id}.`);
      await loadAll();
    } catch (err) {
      setError(err?.message || "Could not update boarding status");
    }
  }

  if (loading && !tickets.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title="Staff operations"
        subtitle="Assist passengers with booking, validate tickets, and manage boarding."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={loadAll}>
            Refresh
          </Button>
          {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Assist passengers with booking">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setShowBookingForm((prev) => !prev)}
              >
                {showBookingForm ? "Hide books form" : "Books"}
              </Button>
            </div>
            {showBookingForm ? (
              <form className="mt-3 grid gap-3" onSubmit={handleCreateTicket}>
                <Select
                  label="Passenger ID"
                  value={ticketForm.user_id}
                  onChange={(e) => setTicketForm((p) => ({ ...p, user_id: e.target.value }))}
                  required
                >
                  <option value="">Select passenger</option>
                  {passengerOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </Select>
                <Select
                  label="Trip ID"
                  value={ticketForm.trip_id}
                  onChange={(e) =>
                    setTicketForm((p) => ({ ...p, trip_id: e.target.value, seat_id: "" }))
                  }
                  required
                >
                  <option value="">Select trip</option>
                  {tripOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Seat ID"
                  value={ticketForm.seat_id}
                  onChange={(e) => setTicketForm((p) => ({ ...p, seat_id: e.target.value }))}
                  required
                >
                  <option value="">Select seat</option>
                  {seatOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Book ticket</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setTicketForm({
                        user_id: "",
                        trip_id: "",
                        seat_id: "",
                        status: "reserved",
                        payment_status: "pending",
                      })
                    }
                  >
                    Clear
                  </Button>
                </div>
              </form>
            ) : null}
        </Card>

        <Card title="Validate tickets">
          <form className="grid gap-3" onSubmit={handleValidateQr}>
            <Input
              label="QR token"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Paste scanned token"
              required
            />
            <Button type="submit">Validate ticket QR</Button>
          </form>
        </Card>
      </div>

      <Card title="Manage boarding / on-site reservations">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-2">Ticket</th>
                <th className="px-2 py-2">Passenger</th>
                <th className="px-2 py-2">Route</th>
                <th className="px-2 py-2">Departure</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {latestTickets.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-2 py-2">#{row.id}</td>
                  <td className="px-2 py-2">{row.passenger_name || row.user_id}</td>
                  <td className="px-2 py-2">{`${row.origin || "-"} -> ${row.destination || "-"}`}</td>
                  <td className="px-2 py-2">
                    {row.departure_time ? formatDate(row.departure_time) : "-"}
                  </td>
                  <td className="px-2 py-2 capitalize">{row.status || "-"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => updateBoardingStatus(row, "boarded")}>
                        Boarded
                      </Button>
                      <Button variant="ghost" onClick={() => updateBoardingStatus(row, "cancelled")}>
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
