import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { vehiclesService } from "@/services/vehicles.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { formatDate } from "@/utils/format.js";
import { cn } from "@/utils/cn.js";

const VEHICLE_STATUSES = ["active", "inactive", "maintenance"];

const VEHICLE_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "plate_number", label: "Plate" },
  { key: "model", label: "Model" },
  { key: "capacity", label: "Capacity" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
];

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

export function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    name: "",
  });
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [cPlate, setCPlate] = useState("");
  const [cModel, setCModel] = useState("");
  const [cCapacity, setCCapacity] = useState("");
  const [cStatus, setCStatus] = useState("active");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    plate_number: "",
    model: "",
    capacity: "",
    status: "active",
  });
  const plateRegex = /^[ABC][0-9]{5}$/;

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await vehiclesService.list();
      setVehicles(normalizeList(rows));
    } catch (e) {
      setError(e?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (cCapacity === "" || Number.isNaN(Number(cCapacity))) {
      setError("Capacity is required (number).");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        capacity: Number(cCapacity),
        status: cStatus,
      };
      const plate = cPlate.trim();

      if (plate) {
        if (!plateRegex.test(plate)) {
          setError(
            "Plate number must be A, B, or C followed by 5 digits (e.g. A12345).",
          );
          return;
        }
        body.plate_number = plate;
      }
      const model = cModel.trim();
      if (model) body.model = model;
      const res = await vehiclesService.create(body);
      setNotice(
        res?.plate_number
          ? `Vehicle created — plate ${res.plate_number}.`
          : "Vehicle created.",
      );
      setCPlate("");
      setCModel("");
      setCCapacity("");
      setCStatus("active");
      setAddVehicleOpen(false);
      await refreshList();
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
    const plate = editForm.plate_number.trim();

    if (!plateRegex.test(plate)) {
      setError(
        "Plate number must be A, B, or C followed by 5 digits (e.g. A12345).",
      );
      return;
    }
    if (editForm.capacity === "" || Number.isNaN(Number(editForm.capacity))) {
      setError("Capacity must be a number.");
      return;
    }
    if (!editForm.status) {
      setError("Status is required.");
      return;
    }
    setSavingEdit(true);
    try {
      await vehiclesService.update(editingId, {
        plate_number: plate,
        model: editForm.model.trim() || null,
        capacity: Number(editForm.capacity),
        status: editForm.status,
      });
      setNotice("Vehicle updated.");
      closeEdit();
      await refreshList();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    const vehicle = vehicles.find((v) => v.id === id);
    setDeleteModal({
      isOpen: true,
      id,
      name: vehicle?.plate_number || `Vehicle #${id}`,
    });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);

    if (editingId === id) closeEdit();

    try {
      await vehiclesService.remove(id);
      setNotice("Vehicle deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refreshList();
    } catch (err) {
      console.error("Delete vehicle error:", err);
      let errorMessage = "Failed to delete vehicle.";

      if (err.status === 500) {
        errorMessage =
          "Server error occurred. The vehicle may be referenced by trips or seats.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this vehicle.";
      } else if (err.status === 404) {
        errorMessage = "Vehicle not found. It may have already been deleted.";
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

  const filteredSorted = useMemo(() => {
    let rows = [...vehicles];
    const q = search.trim().toLowerCase();
    const statusQ = filterStatus.trim().toLowerCase();

    if (statusQ) {
      rows = rows.filter(
        (v) => String(v?.status ?? "").toLowerCase() === statusQ,
      );
    }

    if (q) {
      rows = rows.filter((v) => {
        const parts = [
          v?.id,
          v?.plate_number,
          v?.model,
          v?.capacity,
          v?.status,
          v?.created_at,
        ]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return parts.some((s) => s.includes(q));
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let va = a?.[sortKey];
      let vb = b?.[sortKey];
      if (["id", "capacity"].includes(sortKey)) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else if (sortKey === "created_at") {
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
  }, [vehicles, search, filterStatus, sortKey, sortDir]);

  function handleColumnSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function openEdit(v) {
    setEditingId(v.id);
    setEditForm({
      plate_number: v.plate_number ?? "",
      model: v.model ?? "",
      capacity: String(v.capacity ?? ""),
      status: v.status ?? "active",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({
      plate_number: "",
      model: "",
      capacity: "",
      status: "active",
    });
  }

  if (loading && !vehicles.length) {
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
            Admin Manegements Vehicles
          </h1>
        </div>
        <Button
          type="button"
          variant={addVehicleOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddVehicleOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addVehicleOpen}
          aria-controls="admin-add-vehicle-panel"
        >
          {addVehicleOpen ? "Close form" : "Add vehicle"}
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

      {addVehicleOpen ? (
        <div id="admin-add-vehicle-panel">
          <form
            onSubmit={handleCreate}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Input
              label="Plate number (optional)"
              name="vehicle_plate"
              value={cPlate}
              onChange={(e) => setCPlate(e.target.value)}
              placeholder="Auto-generated if empty"
            />
            <Input
              label="Model (optional)"
              name="vehicle_model"
              value={cModel}
              onChange={(e) => setCModel(e.target.value)}
              placeholder="e.g. Toyota Hiace"
            />
            <Input
              label="Capacity"
              type="number"
              min={1}
              name="vehicle_capacity"
              value={cCapacity}
              onChange={(e) => setCCapacity(e.target.value)}
              required
            />
            <Select
              label="Status"
              name="vehicle_status"
              value={cStatus}
              onChange={(e) => setCStatus(e.target.value)}
            >
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap items-end gap-2 lg:col-span-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create vehicle"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAddVehicleOpen(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <Card
        title="Fleet"
        subtitle="Search and filter by status. Sort columns by clicking the table headers (▲/▼)."
      >
        <div className="mb-4 flex flex-col gap-4 border-b border-primary-200/90 pb-4 dark:border-primary-900/25 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="max-w-md min-w-[200px] flex-1">
            <Input
              label="Search"
              type="search"
              name="vehicles_table_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Id, plate, model, capacity, status…"
              autoComplete="off"
              className="w-full"
            />
          </div>
          <div className="min-w-[160px] sm:max-w-[200px]">
            <Select
              label="Status"
              name="vehicles_filter_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              {VEHICLE_STATUSES.map((s) => (
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
          <span className="font-semibold text-slate-800 dark:text-slate-300">
            {vehicles.length}
          </span>{" "}
          vehicles
          {search.trim() || filterStatus ? " (filtered)" : ""}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                {VEHICLE_SORT_KEYS.map(({ key, label }) => {
                  const active = sortKey === key;
                  return (
                    <th
                      key={key}
                      scope="col"
                      className="px-2 py-2.5 font-semibold"
                    >
                      <button
                        type="button"
                        onClick={() => handleColumnSort(key)}
                        className={cn(
                          "flex w-full min-w-0 items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left transition-colors",
                          "text-slate-700 hover:bg-primary-100/90 hover:text-primary-950",
                          "dark:text-primary-300/95 dark:hover:bg-white/10 dark:hover:text-primary-50",
                          active &&
                            "bg-primary-100/80 font-semibold text-primary-950 dark:bg-white/10 dark:font-semibold dark:text-primary-100",
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
                  className="px-3 py-2.5 font-semibold text-slate-700 dark:text-primary-400/95"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {vehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No vehicles — use the Add vehicle button above to create
                    one.
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No vehicles match your search or status filter.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("");
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSorted.map((v) => (
                  <Fragment key={v.id}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                        "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35",
                      )}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {v.id}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-apptext dark:text-slate-100">
                        {v.plate_number}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-800 dark:text-slate-200">
                        {v.model ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-800 dark:text-slate-300">
                        {v.capacity}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-300">
                        {v.status}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(v.created_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit vehicle"
                            onClick={() => openEdit(v)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete vehicle"
                            onClick={() => handleRemove(v.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === v.id ? (
                      <tr className="border-b border-slate-100 bg-primary-50/90 dark:border-slate-800/60 dark:bg-primary-950/25">
                        <td colSpan={7} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-4">
                            <p className="text-xs font-medium text-slate-700 dark:text-primary-300">
                              Edit vehicle {v.plate_number ?? `#${v.id}`}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <Input
                                label="Plate number"
                                value={editForm.plate_number}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    plate_number: e.target.value,
                                  }))
                                }
                                required
                              />
                              <Input
                                label="Model"
                                value={editForm.model}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    model: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                label="Capacity"
                                type="number"
                                min={1}
                                value={editForm.capacity}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    capacity: e.target.value,
                                  }))
                                }
                                required
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
                                {[
                                  ...new Set([
                                    ...VEHICLE_STATUSES,
                                    editForm.status,
                                  ]),
                                ].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <IconButton
                                variant="primary"
                                label="Save vehicle"
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

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })
        }
        onConfirm={confirmDelete}
        title="Delete Vehicle"
        message={`Are you sure you want to delete the vehicle "${deleteModal.name}"? This action cannot be undone and may affect associated trips or seats.`}
        itemName={`Vehicle "${deleteModal.name}"`}
        loading={deleting}
      />
    </div>
  );
}
