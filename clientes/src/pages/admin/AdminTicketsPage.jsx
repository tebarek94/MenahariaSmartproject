import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import { cn } from "@/utils/cn.js";

const TICKET_STATUSES = [
  "reserved",
  "confirmed",
  "cancelled",
  "completed",
  "used",
];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

const TICKET_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "passenger", label: "Passenger" },
  { key: "route", label: "Route" },
  { key: "trip_id", label: "Trip" },
  { key: "seat_id", label: "Seat" },
  { key: "ticket_code", label: "Code" },
  { key: "status", label: "Status" },
  { key: "payment_status", label: "Pay" },
  { key: "issued_at", label: "Issued" },
];

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

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
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [sortKey, setSortKey] = useState("issued_at");
  const [sortDir, setSortDir] = useState("desc");

  const [addTicketOpen, setAddTicketOpen] = useState(false);
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
      setTickets(normalizeList(t));
      setPassengers(normalizeList(u));
      setTrips(normalizeList(tr));
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
      setAddTicketOpen(false);
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

  const filteredSorted = useMemo(() => {
    let rows = [...tickets];
    const q = search.trim().toLowerCase();
    const statusQ = filterStatus.trim().toLowerCase();
    const payQ = filterPayment.trim().toLowerCase();

    if (statusQ) {
      rows = rows.filter(
        (t) => String(t?.status ?? "").toLowerCase() === statusQ
      );
    }
    if (payQ) {
      rows = rows.filter(
        (t) => String(t?.payment_status ?? "").toLowerCase() === payQ
      );
    }

    if (q) {
      rows = rows.filter((t) => {
        const routeText =
          t?.origin && t?.destination ? `${t.origin} ${t.destination}` : "";
        const parts = [
          t?.id,
          t?.passenger_name,
          routeText,
          t?.trip_id,
          t?.seat_id,
          t?.ticket_code,
          t?.status,
          t?.payment_status,
          t?.issued_at,
          t?.qr_code_used ? "used" : "not used",
        ]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return parts.some((s) => s.includes(q));
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let va;
      let vb;
      if (sortKey === "passenger") {
        va = String(a?.passenger_name ?? "").toLowerCase();
        vb = String(b?.passenger_name ?? "").toLowerCase();
      } else if (sortKey === "route") {
        va = String(`${a?.origin ?? ""} ${a?.destination ?? ""}`).toLowerCase();
        vb = String(`${b?.origin ?? ""} ${b?.destination ?? ""}`).toLowerCase();
      } else if (sortKey === "ticket_code") {
        va = String(a?.ticket_code ?? "").toLowerCase();
        vb = String(b?.ticket_code ?? "").toLowerCase();
      } else {
        va = a?.[sortKey];
        vb = b?.[sortKey];
      }

      if (["id", "trip_id", "seat_id"].includes(sortKey)) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else if (sortKey === "issued_at") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else {
        va = String(va ?? "").toLowerCase();
        vb = String(vb ?? "").toLowerCase();
      }

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return rows;
  }, [tickets, search, filterStatus, filterPayment, sortKey, sortDir]);

  function handleColumnSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  if (loading && !tickets.length && !trips.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
            Tickets
          </h1>
          <p className="text-p-muted max-w-xl text-sm sm:text-[0.95rem]">
            Issue and manage passenger tickets. Use{" "}
            <strong className="font-semibold text-p-heading">Add ticket</strong> to open the
            form. Passenger accounts only; pick a trip, then a seat on that vehicle.
          </p>
        </div>
        <Button
          type="button"
          variant={addTicketOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddTicketOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addTicketOpen}
          aria-controls="admin-add-ticket-panel"
        >
          {addTicketOpen ? "Close form" : "Add ticket"}
        </Button>
      </div>

      {notice ? (
        <p
          className="rounded-lg border border-emerald-200/90 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-900 shadow-sm dark:border-primary-800/50 dark:bg-primary-950/40 dark:text-primary-200 dark:shadow-none"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50/95 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {addTicketOpen ? (
        <div id="admin-add-ticket-panel">
          <Card
            title="Create ticket"
            subtitle="Passenger accounts only (admin/driver are excluded). Choose trip, then seat on that vehicle."
          >
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Select
                label="Passenger (user)"
                name="ticket_passenger"
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
                name="ticket_trip"
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
                name="ticket_seat"
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
                name="ticket_status"
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
                name="ticket_payment"
                value={cPayment}
                onChange={(e) => setCPayment(e.target.value)}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={submitting || passengers.length === 0}>
                    {submitting ? "Creating…" : "Create ticket"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setAddTicketOpen(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {!loading && passengers.length === 0 ? (
                  <p className="text-xs text-amber-800 dark:text-amber-400/90">
                    No passenger users found. Add users with a passenger role in Users.
                  </p>
                ) : null}
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      <Card
        title="All tickets"
        subtitle="Search and filter. Sort columns by clicking the table headers (▲/▼)."
      >
        <div className="mb-4 flex flex-col gap-4 border-b border-primary-200/90 pb-4 dark:border-primary-900/25 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="max-w-md min-w-[200px] flex-1">
            <Input
              label="Search"
              type="search"
              name="tickets_table_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Id, passenger, route, trip, seat, code…"
              autoComplete="off"
              className="w-full"
            />
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:max-w-md">
            <Select
              label="Status"
              name="tickets_filter_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              label="Payment"
              name="tickets_filter_payment"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full"
            >
              <option value="">All payments</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mb-2 text-xs text-slate-600 dark:text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-300">
            {filteredSorted.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-300">{tickets.length}</span>{" "}
          tickets
          {search.trim() || filterStatus || filterPayment ? " (filtered)" : ""}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                {TICKET_SORT_KEYS.map(({ key, label }) => {
                  const active = sortKey === key;
                  return (
                    <th key={key} scope="col" className="px-2 py-2.5 font-semibold">
                      <button
                        type="button"
                        onClick={() => handleColumnSort(key)}
                        className={cn(
                          "flex w-full min-w-0 items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left transition-colors",
                          "text-slate-700 hover:bg-primary-100/90 hover:text-primary-950",
                          "dark:text-primary-300/95 dark:hover:bg-white/10 dark:hover:text-primary-50",
                          active &&
                            "bg-primary-100/80 font-semibold text-primary-950 dark:bg-white/10 dark:font-semibold dark:text-primary-100"
                        )}
                        aria-sort={
                          active
                            ? sortDir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <span className="truncate">{label}</span>
                        <span
                          className="shrink-0 tabular-nums text-[0.65rem] text-slate-500 opacity-90 dark:text-primary-400/80"
                          aria-hidden
                        >
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "◇"}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th
                  scope="col"
                  className="px-2 py-2.5 font-semibold text-slate-700 dark:text-primary-400/95"
                >
                  QR
                </th>
                <th
                  scope="col"
                  className="px-2 py-2.5 font-semibold text-slate-700 dark:text-primary-400/95"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No tickets — use the Add ticket button above to create one.
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No tickets match your search or filters.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("");
                        setFilterPayment("");
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSorted.map((t) => (
                  <Fragment key={t.id}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                        "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {t.id}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2.5 font-medium text-apptext dark:text-slate-100">
                        {t.passenger_name || "Unknown Passenger"}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {t.origin && t.destination
                          ? `${t.origin} ${t.destination}`
                          : "No route"}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-slate-800 dark:text-slate-300">
                        {t.trip_id}
                      </td>
                      <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        Seat {t.seat_id}
                      </td>
                      <td className="max-w-[80px] truncate px-2 py-2.5 text-slate-600 dark:text-slate-400">
                        {t.ticket_code || "Auto-generated"}
                      </td>
                      <td className="px-2 py-2.5 capitalize text-slate-800 dark:text-slate-300">
                        {t.status}
                      </td>
                      <td className="px-2 py-2.5 capitalize text-slate-800 dark:text-slate-300">
                        {t.payment_status}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(t.issued_at)}
                      </td>
                      <td className="px-2 py-2.5">
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
                              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                                Used
                              </span>
                            )}
                            {t.qr_code_expires_at &&
                              new Date(t.qr_code_expires_at) < new Date() &&
                              !t.qr_code_used && (
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                  Expired
                                </span>
                              )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 dark:text-slate-500">No QR</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
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
                      <tr className="border-b border-slate-100 bg-primary-50/90 dark:border-slate-800/60 dark:bg-primary-950/25">
                        <td colSpan={11} className="p-4">
                          <form
                            onSubmit={handleUpdate}
                            className="space-y-4"
                          >
                            <p className="text-xs font-medium text-slate-700 dark:text-primary-300">
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
        <p
          className="rounded-lg border border-red-200 bg-red-50/95 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-300"
          role="alert"
        >
          {relationsView.error.message}
        </p>
      ) : (
        <Card
          title="Ticket relations (view)"
          subtitle="Read-only join preview from the database (limit shown below)."
        >
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-500">
            limit {relationsView.data?.limit ?? "—"}
          </p>
          <DataTable rows={relationsView.data?.rows} emptyMessage="No rows" />
        </Card>
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
