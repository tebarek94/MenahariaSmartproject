import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { seatsService } from "@/services/seats.service.js";
import { vehiclesService } from "@/services/vehicles.service.js";
import { viewsService } from "@/services/views.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { DataTable } from "@/ui/DataTable.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { cn } from "@/utils/cn.js";

const SEAT_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "vehicle_id", label: "Vehicle" },
  { key: "seat_number", label: "Seat #" },
];

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

export function AdminSeatsPage() {
  const relationsView = useAsync(() => viewsService.seatsRelations(150));

  const [seats, setSeats] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  const [addSeatOpen, setAddSeatOpen] = useState(false);
  const [cVehicle, setCVehicle] = useState("");
  const [cNum, setCNum] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    vehicle_id: "",
    seat_number: "",
  });

  /** `null` = table hidden; `'all'` or vehicle id = filtered table shown */
  const [tableSelection, setTableSelection] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, v] = await Promise.all([
        seatsService.list(),
        vehiclesService.list(),
      ]);
      setSeats(normalizeList(s));
      setVehicles(normalizeList(v));
    } catch (e) {
      setError(e?.message || "Failed to load seats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const seatsByVehicle = useMemo(() => {
    const map = new Map();
    for (const s of seats) {
      const vid = Number(s.vehicle_id);
      if (!Number.isFinite(vid)) continue;
      if (!map.has(vid)) map.set(vid, []);
      map.get(vid).push(s);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [seats]);

  const seatCountByVehicleId = useMemo(() => {
    const m = new Map();
    for (const [vid, list] of seatsByVehicle) m.set(vid, list.length);
    return m;
  }, [seatsByVehicle]);

  const vehicleTableCards = useMemo(() => {
    const ids = new Set(vehicles.map((v) => Number(v.id)));
    for (const vid of seatCountByVehicleId.keys()) ids.add(vid);
    return [...ids]
      .filter((id) => Number.isFinite(id))
      .sort((a, b) => a - b)
      .map((id) => {
        const v = vehicles.find((x) => Number(x.id) === id);
        const label =
          v?.plate_number || v?.model || `Vehicle #${id}`;
        return {
          id,
          label,
          count: seatCountByVehicleId.get(id) ?? 0,
        };
      });
  }, [vehicles, seatCountByVehicleId]);

  const tableRows = useMemo(() => {
    if (tableSelection == null) return [];
    if (tableSelection === "all") return seats;
    return seats.filter((s) => Number(s.vehicle_id) === tableSelection);
  }, [seats, tableSelection]);

  const filteredSortedRows = useMemo(() => {
    let rows = [...tableRows];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((s) => {
        const parts = [s?.id, s?.vehicle_id, s?.seat_number]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return parts.some((v) => v.includes(q));
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const va = Number(a?.[sortKey]) || 0;
      const vb = Number(b?.[sortKey]) || 0;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [tableRows, search, sortKey, sortDir]);

  function toggleTableSelection(key) {
    setTableSelection((cur) => (cur === key ? null : key));
    closeEdit();
  }

  function handleColumnSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  useEffect(() => {
    relationsView.run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingId == null) return;
    document
      .getElementById(`seat-row-${editingId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [editingId]);

  function openEdit(x) {
    setEditingId(x.id);
    setEditForm({
      vehicle_id: String(x.vehicle_id ?? ""),
      seat_number: String(x.seat_number ?? ""),
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({ vehicle_id: "", seat_number: "" });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (!cVehicle || cNum === "") {
      setError("Vehicle and seat number are required.");
      return;
    }
    setSubmitting(true);
    try {
      await seatsService.create({
        vehicle_id: Number(cVehicle),
        seat_number: Number(cNum),
      });
      setNotice("Seat created.");
      setCVehicle("");
      setCNum("");
      setAddSeatOpen(false);
      await refresh();
      relationsView.run().catch(() => {});
    } catch (e) {
      setError(e?.data?.message || e?.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (editingId == null) return;
    setNotice("");
    setError("");
    const { vehicle_id, seat_number } = editForm;
    if (!vehicle_id || seat_number === "") {
      setError("Vehicle and seat number are required.");
      return;
    }
    setSavingEdit(true);
    try {
      await seatsService.update(editingId, {
        vehicle_id: Number(vehicle_id),
        seat_number: Number(seat_number),
      });
      setNotice("Seat updated.");
      closeEdit();
      await refresh();
      relationsView.run().catch(() => {});
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    setDeleteModal({ isOpen: true, id, name: `Seat #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    if (editingId === id) closeEdit();
    
    try {
      await seatsService.remove(id);
      setNotice("Seat deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      console.error("Delete seat error:", err);
      let errorMessage = "Failed to delete seat.";
      
      if (err.status === 500) {
        errorMessage = "Server error occurred. The seat may be referenced by tickets.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this seat.";
      } else if (err.status === 404) {
        errorMessage = "Seat not found. It may have already been deleted.";
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

  if (loading && !seats.length) {
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
            Seats
          </h1>
          <p className="text-p-muted max-w-xl text-sm sm:text-[0.95rem]">
            Seats belong to a vehicle. Use{" "}
            <strong className="font-semibold text-p-heading">Add seat</strong> to open the form,
            then pick a vehicle card to browse and edit the list.
          </p>
        </div>
        <Button
          type="button"
          variant={addSeatOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddSeatOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addSeatOpen}
          aria-controls="admin-add-seat-panel"
        >
          {addSeatOpen ? "Close form" : "Add seat"}
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

      {addSeatOpen ? (
        <div id="admin-add-seat-panel">
          <Card
            title="Create seat"
            subtitle="Choose a vehicle and a seat number. Numbers must be unique per vehicle."
          >
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Vehicle"
                name="seat_vehicle"
                value={cVehicle}
                onChange={(e) => setCVehicle(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    #{v.id} {v.plate_number || v.model || "vehicle"}
                  </option>
                ))}
              </Select>
              <Input
                label="Seat number"
                type="number"
                min="1"
                name="seat_number"
                value={cNum}
                onChange={(e) => setCNum(e.target.value)}
                required
              />
              <div className="flex flex-wrap items-end gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create seat"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddSeatOpen(false);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      <Card
        title="All seats"
        subtitle="Click a vehicle card (or “All vehicles”) to open the detailed table. Sort columns by clicking the headers (▲/▼). Click again to hide."
      >
        <div className="mb-4 flex flex-col gap-3 border-b border-primary-200/90 pb-4 dark:border-primary-900/25 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="max-w-md min-w-[200px] flex-1">
            <Input
              label="Search"
              type="search"
              name="seats_table_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Id, vehicle, seat number…"
              autoComplete="off"
              className="w-full"
              disabled={tableSelection == null}
            />
          </div>
          {tableSelection != null ? (
            <Button
              variant="ghost"
              className="!text-xs"
              type="button"
              onClick={() => {
                setTableSelection(null);
                closeEdit();
              }}
            >
              Hide table
            </Button>
          ) : null}
        </div>

        {tableSelection == null ? (
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-500">
            Choose a card to load the seat list in the table below.
          </p>
        ) : (
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
            {tableSelection === "all"
              ? `Showing ${filteredSortedRows.length} of ${tableRows.length} seat(s).`
              : `Showing ${filteredSortedRows.length} of ${tableRows.length} seat(s) for vehicle #${tableSelection}.`}
            {search.trim() ? " (filtered)" : ""}
          </p>
        )}

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => toggleTableSelection("all")}
            className={cn(
              "rounded-xl border p-4 text-left transition",
              tableSelection === "all"
                ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/40 dark:bg-primary-950/40 dark:ring-primary-500/60"
                : "border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/50 dark:border-primary-900/40 dark:bg-slate-950/50 dark:hover:border-primary-700/50 dark:hover:bg-slate-900/50"
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-primary-800 dark:text-primary-400/90">
              All vehicles
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {seats.length}{" "}
              <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                seats
              </span>
            </p>
          </button>
          {vehicleTableCards.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleTableSelection(id)}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                tableSelection === id
                  ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/40 dark:bg-primary-950/40 dark:ring-primary-500/60"
                  : "border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/50 dark:border-primary-900/40 dark:bg-slate-950/50 dark:hover:border-primary-700/50 dark:hover:bg-slate-900/50"
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-primary-800 dark:text-primary-400/90">
                Vehicle #{id}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-800 dark:text-slate-200" title={label}>
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {count}{" "}
                <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                  seats
                </span>
              </p>
            </button>
          ))}
        </div>

        {tableSelection != null ? (
          <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
            <div className="max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
                  <tr>
                    {SEAT_SORT_KEYS.map(({ key, label }) => {
                      const active = sortKey === key;
                      return (
                        <th key={key} scope="col" className="px-2 py-2 font-semibold">
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
                      className="px-2 py-2 font-semibold text-slate-700 dark:text-primary-400/95"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                      >
                        No seats in this view
                      </td>
                    </tr>
                  ) : filteredSortedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                      >
                        No rows match your search.{" "}
                        <button
                          type="button"
                          className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          onClick={() => setSearch("")}
                        >
                          Clear search
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredSortedRows.map((s) => (
                      <Fragment key={s.id}>
                        <tr
                          id={`seat-row-${s.id}`}
                          className={cn(
                            "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                            "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                          )}
                        >
                          <td className="px-2 py-2 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                            {s.id}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-slate-800 dark:text-slate-200">
                            {s.vehicle_id}
                          </td>
                          <td className="px-2 py-2 tabular-nums font-medium text-apptext dark:text-slate-100">
                            {s.seat_number}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <IconButton
                                variant="ghost"
                                label="Edit"
                                onClick={() => openEdit(s)}
                              >
                                <PencilIcon />
                              </IconButton>
                              <IconButton
                                variant="danger"
                                label="Delete"
                                onClick={() => handleRemove(s.id)}
                              >
                                <TrashIcon />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                        {editingId === s.id ? (
                          <tr className="border-b border-slate-100 bg-primary-50/90 dark:border-slate-800/60 dark:bg-primary-950/25">
                            <td colSpan={4} className="p-3 sm:p-4">
                              <form
                                onSubmit={handleUpdate}
                                className="space-y-3"
                              >
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Select
                                    label="Vehicle"
                                    value={editForm.vehicle_id}
                                    onChange={(e) =>
                                      setEditForm((f) => ({
                                        ...f,
                                        vehicle_id: e.target.value,
                                      }))
                                    }
                                    required
                                  >
                                    {vehicles.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        #{v.id} {v.plate_number || v.model}
                                      </option>
                                    ))}
                                  </Select>
                                  <Input
                                    label="Seat number"
                                    type="number"
                                    min="1"
                                    value={editForm.seat_number}
                                    onChange={(e) =>
                                      setEditForm((f) => ({
                                        ...f,
                                        seat_number: e.target.value,
                                      }))
                                    }
                                    required
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <IconButton
                                    variant="primary"
                                    type="submit"
                                    label="Save"
                                    disabled={savingEdit}
                                  >
                                    <CheckIcon />
                                  </IconButton>
                                  <IconButton
                                    variant="ghost"
                                    type="button"
                                    label="Cancel"
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
          </div>
        ) : null}
      </Card>

      <Card
        title="Joined view (read-only)"
        subtitle="GET /api/views/seats-relations — read-only join preview from the database."
      >
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
          <>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-500">
              limit {relationsView.data?.limit ?? "—"}
            </p>
            <DataTable
              rows={relationsView.data?.rows}
              emptyMessage="No rows"
            />
          </>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={confirmDelete}
        title="Delete Seat"
        message={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone and may affect associated tickets.`}
        itemName={deleteModal.name}
        loading={deleting}
      />
    </div>
  );
}
