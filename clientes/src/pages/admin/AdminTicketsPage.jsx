import { Fragment, useCallback, useEffect, useState } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { ticketsService } from "@/services/tickets.service.js";
import { tripsService } from "@/services/trips.service.js";
import { seatsService } from "@/services/seats.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { viewsService } from "@/services/views.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { DataTable } from "@/ui/DataTable.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon, DownloadIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { formatDate } from "@/utils/format.js";

const TICKET_STATUSES = [
  "reserved",
  "confirmed",
  "cancelled",
  "completed",
  "used",
];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

export function AdminTicketsPage() {
  const relationsView = useAsync(() => viewsService.ticketsRelations(100));

  const [tickets, setTickets] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [seatOptions, setSeatOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);
  const [generatingDownload, setGeneratingDownload] = useState(null);

  const [cUserId, setCUserId] = useState("");
  const [cTripId, setCTripId] = useState("");
  const [cSeatId, setCSeatId] = useState("");
  const [cStatus, setCStatus] = useState("reserved");
  const [cPayment, setCPayment] = useState("pending");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    user_id: "",
    trip_id: "",
    seat_id: "",
    ticket_code: "",
    status: "reserved",
    payment_status: "pending",
  });

  const refreshCore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [t, u, tr] = await Promise.all([
        ticketsService.list(),
        adminUsersService.listPassengers(),
        tripsService.list(),
      ]);
      setTickets(Array.isArray(t) ? t : []);
      setPassengers(Array.isArray(u) ? u : []);
      setTrips(Array.isArray(tr) ? tr : []);
    } catch (e) {
      setError(e?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCore();
  }, [refreshCore]);

  useEffect(() => {
    relationsView.run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTripId = editingId != null ? editForm.trip_id : cTripId;

  const loadSeatsForTrip = useCallback(
    async (tripId, includeSeatId) => {
      if (!tripId || !trips.length) {
        setSeatOptions([]);
        return;
      }
      const trip = trips.find((x) => String(x.id) === String(tripId));
      if (!trip?.vehicle_id) {
        setSeatOptions([]);
        return;
      }
      try {
        const rows = await seatsService.availableByVehicle(
          trip.vehicle_id,
          Number(tripId)
        );
        let list = Array.isArray(rows) ? rows : [];
        const sid = includeSeatId ? Number(includeSeatId) : NaN;
        if (Number.isInteger(sid) && sid > 0 && !list.some((s) => Number(s.id) === sid)) {
          try {
            const one = await seatsService.get(sid);
            if (one && Number(one.vehicle_id) === Number(trip.vehicle_id)) {
              list = [one, ...list];
            }
          } catch {
            /* keep list */
          }
        }
        setSeatOptions(list);
      } catch {
        setSeatOptions([]);
      }
    },
    [trips]
  );

  useEffect(() => {
    const includeSeatId =
      editingId != null && editForm.seat_id ? editForm.seat_id : null;
    loadSeatsForTrip(activeTripId, includeSeatId);
  }, [activeTripId, editingId, editForm.seat_id, loadSeatsForTrip]);

  function openEdit(t) {
    setEditingId(t.id);
    setEditForm({
      user_id: String(t.user_id ?? ""),
      trip_id: String(t.trip_id ?? ""),
      seat_id: String(t.seat_id ?? ""),
      ticket_code: t.ticket_code ?? "",
      status: t.status ?? "reserved",
      payment_status: t.payment_status ?? "pending",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({
      user_id: "",
      trip_id: "",
      seat_id: "",
      ticket_code: "",
      status: "reserved",
      payment_status: "pending",
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (!cUserId || !cTripId || !cSeatId) {
      setError("Passenger, trip, and seat are required.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        user_id: Number(cUserId),
        trip_id: Number(cTripId),
        seat_id: Number(cSeatId),
        status: cStatus,
        payment_status: cPayment,
      };
      await ticketsService.create(body);
      setNotice("Ticket created with automatic code.");
      setCSeatId("");
      await refreshCore();
      relationsView.run().catch(() => {});
    } catch (e) {
      setError(
        e?.data?.sqlMessage || e?.data?.message || e?.message || "Create failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (editingId == null) return;
    setNotice("");
    setError("");
    const {
      user_id,
      trip_id,
      seat_id,
      ticket_code,
      status,
      payment_status,
    } = editForm;
    if (!user_id || !trip_id || !seat_id || !status || !payment_status) {
      setError("All fields except optional code are required for update.");
      return;
    }
    setSavingEdit(true);
    try {
      await ticketsService.update(editingId, {
        user_id: Number(user_id),
        trip_id: Number(trip_id),
        seat_id: Number(seat_id),
        ticket_code: ticket_code.trim() || null,
        status,
        payment_status,
      });
      setNotice("Ticket updated.");
      closeEdit();
      await refreshCore();
      relationsView.run().catch(() => {});
    } catch (e) {
      setError(
        e?.data?.sqlMessage || e?.data?.message || e?.message || "Update failed"
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    setDeleteModal({ isOpen: true, id, name: `Ticket #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    if (editingId === id) closeEdit();
    
    try {
      await ticketsService.remove(id);
      setNotice("Ticket deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refreshCore();
    } catch (err) {
      console.error("Delete ticket error:", err);
      let errorMessage = "Failed to delete ticket.";
      
      if (err.status === 500) {
        errorMessage = "Server error occurred. The ticket may have associated payments.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this ticket.";
      } else if (err.status === 404) {
        errorMessage = "Ticket not found. It may have already been deleted.";
      } else if (err.data?.message) {
        errorMessage = err.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadTicket = async (ticketId) => {
    setGeneratingDownload(ticketId);
    setError("");
    setNotice("");
    
    try {
      const tokenResponse = await ticketsService.generateDownloadToken(ticketId);
      const downloadToken = tokenResponse.download_token;
      
      if (!downloadToken) {
        setError("Failed to generate download token.");
        return;
      }

      const link = document.createElement("a");
      link.href = ticketsService.getDownloadUrl(downloadToken);
      link.download = `ticket_${ticketId}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setNotice("Ticket download started.");
      await refreshCore();
    } catch (err) {
      console.error("Download ticket error:", err);
      setError(err?.data?.message || "Failed to download ticket.");
    } finally {
      setGeneratingDownload(null);
    }
  };

  if (loading && !tickets.length && !trips.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
        title="Create ticket"
        subtitle="Passenger accounts only (admin/driver are excluded) · trip · seat on that vehicle"
      >
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Select
            label="Passenger (user)"
            value={cUserId}
            onChange={(e) => setCUserId(e.target.value)}
            required
          >
            <option value="">Select passenger…</option>
            {passengers.map((u) => (
              <option key={u.id} value={u.id}>
                {(String(u?.full_name ?? "").trim() || "Unnamed user")} ·{" "}
                {u.phone || "no phone"} (#{u.id})
              </option>
            ))}
          </Select>
          <Select
            label="Trip"
            value={cTripId}
            onChange={(e) => {
              setCTripId(e.target.value);
              setCSeatId("");
            }}
            required
          >
            <option value="">Select trip…</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} · vehicle {t.vehicle_id} · {formatDate(t.departure_time)}
              </option>
            ))}
          </Select>
          <Select
            label="Seat"
            value={cSeatId}
            onChange={(e) => setCSeatId(e.target.value)}
            required
            disabled={!cTripId || !seatOptions.length}
          >
            <option value="">
              {!cTripId
                ? "Pick a trip first"
                : seatOptions.length
                  ? "Select seat…"
                  : "No seats for vehicle"}
            </option>
            {seatOptions.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.seat_number} (id {s.id})
              </option>
            ))}
          </Select>
                    <Select
            label="Status"
            value={cStatus}
            onChange={(e) => setCStatus(e.target.value)}
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Payment status"
            value={cPayment}
            onChange={(e) => setCPayment(e.target.value)}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <div className="flex flex-col justify-end gap-1 sm:col-span-2 lg:col-span-1">
            <Button type="submit" disabled={submitting || passengers.length === 0}>
              {submitting ? "Creating…" : "Create ticket"}
            </Button>
            {!loading && passengers.length === 0 ? (
              <p className="text-xs text-amber-400/90">
                No passenger users found. Add users with a passenger role in Users.
              </p>
            ) : null}
          </div>
        </form>
      </Card>

      <Card title="All tickets">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refreshCore()}>
            Refresh list
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2 font-semibold">Id</th>
                <th className="px-2 py-2 font-semibold">Passenger</th>
                <th className="px-2 py-2 font-semibold">Route</th>
                <th className="px-2 py-2 font-semibold">Trip</th>
                <th className="px-2 py-2 font-semibold">Seat</th>
                <th className="px-2 py-2 font-semibold">Code</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Pay</th>
                <th className="px-2 py-2 font-semibold">Issued</th>
                <th className="px-2 py-2 font-semibold">QR</th>
                <th className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No tickets
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <Fragment key={t.id}>
                    <tr className="bg-slate-950/30 hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs text-slate-400">
                        {t.id}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2 text-slate-200">
                        {t.passenger_name || "Unknown Passenger"}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-2 text-slate-400">
                        {t.origin && t.destination
                          ? `${t.origin} ${t.destination}`
                          : "No route"}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{t.trip_id}</td>
                      <td className="px-2 py-2 text-slate-400">Seat {t.seat_id}</td>
                      <td className="max-w-[80px] truncate px-2 py-2 text-slate-500">
                        {t.ticket_code || "Auto-generated"}
                      </td>
                      <td className="px-2 py-2 text-slate-300 capitalize">{t.status}</td>
                      <td className="px-2 py-2 text-slate-300 capitalize">
                        {t.payment_status}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(t.issued_at)}
                      </td>
                      <td className="px-2 py-2">
                        {t.qr_data_url ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={t.qr_data_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded border border-primary-800/40 bg-white p-1"
                              title={`Open QR for ticket #${t.id}`}
                            >
                              <img
                                src={t.qr_data_url}
                                alt={`QR for ticket ${t.id}`}
                                className="h-12 w-12 object-contain"
                              />
                            </a>
                            {t.qr_code_used && (
                              <span className="text-xs text-red-400">Used</span>
                            )}
                            {t.qr_code_expires_at && new Date(t.qr_code_expires_at) < new Date() && !t.qr_code_used && (
                              <span className="text-xs text-yellow-400">Expired</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No QR</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit ticket"
                            onClick={() => openEdit(t)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="primary"
                            label="Download Ticket"
                            onClick={() => handleDownloadTicket(t.id)}
                            disabled={generatingDownload === t.id}
                          >
                            <DownloadIcon className={generatingDownload === t.id ? "animate-spin" : ""} />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete ticket"
                            onClick={() => handleRemove(t.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === t.id ? (
                      <tr className="bg-primary-950/20">
                        <td colSpan={11} className="p-4">
                          <form
                            onSubmit={handleUpdate}
                            className="space-y-4"
                          >
                            <p className="text-xs font-medium text-primary-300">
                              Edit ticket {t.id}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <Select
                                label="Passenger"
                                value={editForm.user_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    user_id: e.target.value,
                                  }))
                                }
                                required
                              >
                                {passengers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {(String(u?.full_name ?? "").trim() ||
                                      "Unnamed user")}{" "}
                                    · {u.phone || "no phone"} (#{u.id})
                                  </option>
                                ))}
                              </Select>
                              <Select
                                label="Trip"
                                value={editForm.trip_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    trip_id: e.target.value,
                                    seat_id: "",
                                  }))
                                }
                                required
                              >
                                {trips.map((tr) => (
                                  <option key={tr.id} value={tr.id}>
                                    {tr.id} · v{tr.vehicle_name}
                                  </option>
                                ))}
                              </Select>
                              <Select
                                label="Seat"
                                value={editForm.seat_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    seat_id: e.target.value,
                                  }))
                                }
                                required
                                disabled={!seatOptions.length}
                              >
                                <option value="">
                                  {seatOptions.length
                                    ? "Select seat…"
                                    : "No seats"}
                                </option>
                                {seatOptions.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.seat_number}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                label="Ticket code"
                                value={editForm.ticket_code}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    ticket_code: e.target.value,
                                  }))
                                }
                                placeholder="empty = null"
                              />
                              <Select
                                label="Status"
                                value={editForm.status}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    status: e.target.value,
                                  }))
                                }
                                required
                              >
                                {TICKET_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                              <Select
                                label="Payment status"
                                value={editForm.payment_status}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    payment_status: e.target.value,
                                  }))
                                }
                                required
                              >
                                {PAYMENT_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <IconButton
                                variant="primary"
                                label="Save ticket"
                                type="submit"
                                disabled={savingEdit}
                              >
                                <CheckIcon />
                              </IconButton>
                              <IconButton
                                variant="ghost"
                                label="Cancel"
                                type="button"
                                onClick={closeEdit}
                              >
                                <XIcon />
                              </IconButton>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
        {relationsView.loading && !relationsView.data ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : relationsView.error ? (
          <p className="text-sm text-red-400">{relationsView.error.message}</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">
              limit {relationsView.data?.limit ?? "—"}
            </p>
            <DataTable
              rows={relationsView.data?.rows}
              emptyMessage="No rows"
            />
          </>
        )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={confirmDelete}
        title="Delete Ticket"
        message={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone and may affect associated payments.`}
        itemName={deleteModal.name}
        loading={deleting}
      />
    </div>
  );
}
