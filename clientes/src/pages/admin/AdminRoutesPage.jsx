import { Fragment, useCallback, useEffect, useState } from "react";
import { routesService } from "@/services/routes.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";

export function AdminRoutesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const [cOrigin, setCOrigin] = useState("");
  const [cDest, setCDest] = useState("");
  const [cKm, setCKm] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    origin: "",
    destination: "",
    distance_km: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await routesService.list();
      setRows(Array.isArray(r) ? r : []);
    } catch (e) {
      setError(e?.message || "Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openEdit(x) {
    setEditingId(x.id);
    setEditForm({
      origin: x.origin ?? "",
      destination: x.destination ?? "",
      distance_km: x.distance_km != null ? String(x.distance_km) : "",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({ origin: "", destination: "", distance_km: "" });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (!cOrigin.trim() || !cDest.trim()) {
      setError("Origin and destination are required.");
      return;
    }
    setSubmitting(true);
    try {
      const body = { origin: cOrigin.trim(), destination: cDest.trim() };
      if (cKm !== "" && !Number.isNaN(Number(cKm)))
        body.distance_km = Number(cKm);
      await routesService.create(body);
      setNotice("Route created.");
      setCOrigin("");
      setCDest("");
      setCKm("");
      await refresh();
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
    const { origin, destination, distance_km } = editForm;
    if (!origin.trim() || !destination.trim()) {
      setError("Origin and destination are required.");
      return;
    }
    setSavingEdit(true);
    try {
      const body = {
        origin: origin.trim(),
        destination: destination.trim(),
      };
      if (distance_km !== "" && !Number.isNaN(Number(distance_km)))
        body.distance_km = Number(distance_km);
      else body.distance_km = null;
      await routesService.update(editingId, body);
      setNotice("Route updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    const route = rows.find(r => r.id === id);
    setDeleteModal({ isOpen: true, id, name: route?.name || `Route #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    if (editingId === id) closeEdit();
    
    try {
      await routesService.remove(id);
      setNotice("Route deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      console.error("Delete route error:", err);
      let errorMessage = "Failed to delete route.";
      
      if (err.status === 500) {
        errorMessage = "Server error occurred. The route may be referenced by existing trips or have database constraints. Please delete all associated trips first or contact your database administrator to check foreign key constraints.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this route.";
      } else if (err.status === 404) {
        errorMessage = "Route not found. It may have already been deleted.";
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

  if (loading && !rows.length) {
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

      <Card title="Create route">
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Input
            label="Origin"
            value={cOrigin}
            onChange={(e) => setCOrigin(e.target.value)}
            required
          />
          <Input
            label="Destination"
            value={cDest}
            onChange={(e) => setCDest(e.target.value)}
            required
          />
          <Input
            label="Distance km (optional)"
            type="number"
            step="0.01"
            min="0"
            value={cKm}
            onChange={(e) => setCKm(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="All routes">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2">Id</th>
                <th className="px-2 py-2">Origin</th>
                <th className="px-2 py-2">Destination</th>
                <th className="px-2 py-2">Km</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No routes
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                      <td className="px-2 py-2">{r.origin}</td>
                      <td className="px-2 py-2">{r.destination}</td>
                      <td className="px-2 py-2 text-slate-400">
                        {r.distance_km ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit"
                            onClick={() => openEdit(r)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete"
                            onClick={() => handleRemove(r.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === r.id ? (
                      <tr className="bg-primary-950/20">
                        <td colSpan={5} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <Input
                                label="Origin"
                                value={editForm.origin}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    origin: e.target.value,
                                  }))
                                }
                                required
                              />
                              <Input
                                label="Destination"
                                value={editForm.destination}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    destination: e.target.value,
                                  }))
                                }
                                required
                              />
                              <Input
                                label="Distance km"
                                type="number"
                                step="0.01"
                                value={editForm.distance_km}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    distance_km: e.target.value,
                                  }))
                                }
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
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={confirmDelete}
        title="Delete Route"
        message={`Are you sure you want to delete the route "${deleteModal.name}"? This action cannot be undone and may affect associated trips.`}
        itemName={`Route "${deleteModal.name}"`}
        loading={deleting}
      />
    </div>
  );
}
