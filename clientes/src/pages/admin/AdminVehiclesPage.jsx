import { Fragment, useCallback, useEffect, useState } from "react";
import { useAsync } from "@/hooks/useAsync.js";
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

const VEHICLE_STATUSES = ["active", "inactive", "maintenance"];

export function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

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

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await vehiclesService.list();
      setVehicles(Array.isArray(rows) ? rows : []);
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
      if (plate) body.plate_number = plate;
      const model = cModel.trim();
      if (model) body.model = model;
      const res = await vehiclesService.create(body);
      setNotice(
        res?.plate_number
          ? `Vehicle created — plate ${res.plate_number}.`
          : "Vehicle created."
      );
      setCPlate("");
      setCModel("");
      setCCapacity("");
      setCStatus("active");
      await refreshList();
    } catch (e) {
      setError(
        e?.data?.message || e?.message || "Create failed"
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
    const plate = editForm.plate_number.trim();
    if (!plate) {
      setError("Plate number is required for update.");
      return;
    }
    if (
      editForm.capacity === "" ||
      Number.isNaN(Number(editForm.capacity))
    ) {
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
    const vehicle = vehicles.find(v => v.id === id);
    setDeleteModal({ isOpen: true, id, name: vehicle?.plate_number || `Vehicle #${id}` });
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
        errorMessage = "Server error occurred. The vehicle may be referenced by trips or seats.";
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
        title="Add vehicle"
        subtitle="capacity required; model and custom plate optional"
      >
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Input
            label="Plate number (optional)"
            value={cPlate}
            onChange={(e) => setCPlate(e.target.value)}
            placeholder="Auto-generated if empty"
          />
          <Input
            label="Model (optional)"
            value={cModel}
            onChange={(e) => setCModel(e.target.value)}
            placeholder="e.g. Toyota Hiace"
          />
          <Input
            label="Capacity"
            type="number"
            min={1}
            value={cCapacity}
            onChange={(e) => setCCapacity(e.target.value)}
            required
          />
          <Select
            label="Status"
            value={cStatus}
            onChange={(e) => setCStatus(e.target.value)}
          >
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <div className="flex items-end lg:col-span-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create vehicle"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Fleet">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refreshList()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-3 py-2 font-semibold">Id</th>
                <th className="px-3 py-2 font-semibold">Plate</th>
                <th className="px-3 py-2 font-semibold">Model</th>
                <th className="px-3 py-2 font-semibold">Capacity</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Created</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {vehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No vehicles
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <Fragment key={v.id}>
                    <tr className="bg-slate-950/30 hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">
                        {v.id}
                      </td>
                      <td className="px-3 py-2 font-medium text-primary-200">
                        {v.plate_number}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2 text-slate-300">
                        {v.model ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{v.capacity}</td>
                      <td className="px-3 py-2 text-slate-300">{v.status}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                        {formatDate(v.created_at)}
                      </td>
                      <td className="px-3 py-2">
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
                      <tr className="bg-primary-950/20">
                        <td colSpan={7} className="p-4">
                          <form
                            onSubmit={handleUpdate}
                            className="space-y-4"
                          >
                            <p className="text-xs font-medium text-primary-300">
                              Edit vehicle {v.name}
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
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={confirmDelete}
        title="Delete Vehicle"
        message={`Are you sure you want to delete the vehicle "${deleteModal.name}"? This action cannot be undone and may affect associated trips or seats.`}
        itemName={`Vehicle "${deleteModal.name}"`}
        loading={deleting}
      />
    </div>
  );
}
