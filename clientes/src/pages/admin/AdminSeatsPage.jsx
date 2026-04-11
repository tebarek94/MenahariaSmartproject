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
      setSeats(Array.isArray(s) ? s : []);
      setVehicles(Array.isArray(v) ? v : []);
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

  function toggleTableSelection(key) {
    setTableSelection((cur) => (cur === key ? null : key));
    closeEdit();
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
    const seat = seats.find(s => s.id === id);
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

      <Card title="Create seat">
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-3"
        >
          <Select
            label="Vehicle"
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
            value={cNum}
            onChange={(e) => setCNum(e.target.value)}
            required
          />
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="All seats"
        subtitle="Click a vehicle card (or “All vehicles”) to open the detailed table. Click again to hide."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
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
          <p className="mb-3 text-sm text-slate-500">
            Choose a card to load the seat list in the table below.
          </p>
        ) : (
          <p className="mb-3 text-sm text-primary-200/90">
            {tableSelection === "all"
              ? `Showing all ${tableRows.length} seat(s).`
              : `Showing ${tableRows.length} seat(s) for vehicle #${tableSelection}.`}
          </p>
        )}

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => toggleTableSelection("all")}
            className={`rounded-xl border p-4 text-left transition ${
              tableSelection === "all"
                ? "border-primary-500 bg-primary-950/40 ring-2 ring-primary-500/60"
                : "border-primary-900/40 bg-slate-950/50 hover:border-primary-700/50 hover:bg-slate-900/50"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-primary-400/90">
              All vehicles
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {seats.length}{" "}
              <span className="text-sm font-normal text-slate-400">seats</span>
            </p>
          </button>
          {vehicleTableCards.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleTableSelection(id)}
              className={`rounded-xl border p-4 text-left transition ${
                tableSelection === id
                  ? "border-primary-500 bg-primary-950/40 ring-2 ring-primary-500/60"
                  : "border-primary-900/40 bg-slate-950/50 hover:border-primary-700/50 hover:bg-slate-900/50"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-primary-400/90">
                Vehicle #{id}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-200" title={label}>
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {count}{" "}
                <span className="text-sm font-normal text-slate-400">seats</span>
              </p>
            </button>
          ))}
        </div>

        {tableSelection != null ? (
          <div className="overflow-x-auto rounded-lg border border-primary-900/30">
            <div className="max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-900/95 text-xs uppercase text-primary-400/90 shadow-[0_1px_0_0_rgba(15,23,42,0.9)] backdrop-blur-sm">
                  <tr className="border-b border-primary-900/40">
                    <th className="px-2 py-1.5">Id</th>
                    <th className="px-2 py-1.5">Vehicle</th>
                    <th className="px-2 py-1.5">Seat #</th>
                    <th className="px-2 py-1.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/90">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        No seats in this view
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((s) => (
                      <Fragment key={s.id}>
                        <tr
                          id={`seat-row-${s.id}`}
                          className="hover:bg-slate-800/30"
                        >
                          <td className="px-2 py-1.5 font-mono text-xs">
                            {s.id}
                          </td>
                          <td className="px-2 py-1.5">{s.vehicle_id}</td>
                          <td className="px-2 py-1.5">{s.seat_number}</td>
                          <td className="px-2 py-1.5">
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
                          <tr className="bg-primary-950/20">
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
        subtitle="GET /api/views/seats-relations"
      >
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
