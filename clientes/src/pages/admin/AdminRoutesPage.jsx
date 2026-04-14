import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { routesService } from "@/services/routes.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";

const SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "origin", label: "Origin" },
  { value: "destination", label: "Destination" },
  { value: "distance_km", label: "Distance" },
];

const HEADER_SORT_KEYS = {
  Id: "id",
  Origin: "origin",
  Destination: "destination",
  Km: "distance_km",
};

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

export function AdminRoutesPage() {
  const [rows, setRows] = useState([]);
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
      setRows(normalizeList(r));
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

  const filteredSorted = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const parts = [r?.id, r?.origin, r?.destination, r?.distance_km]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return parts.some((p) => p.includes(q));
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let va = a?.[sortKey];
      let vb = b?.[sortKey];
      if (["id", "distance_km"].includes(sortKey)) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else {
        va = String(va ?? "").toLowerCase();
        vb = String(vb ?? "").toLowerCase();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return list;
  }, [rows, search, sortKey, sortDir]);

  function handleHeaderSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function sortIndicator(key) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
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
    setDeleteModal({ isOpen: true, id, name: `Route #${id}` });
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
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID, origin, destination, distance..."
            className="min-w-[220px] sm:flex-1"
          />
          <Select
            label="Sort by"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="min-w-[140px]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Order"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
            className="min-w-[120px]"
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </Select>
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
          <Button
            variant="ghost"
            className="!text-xs"
            onClick={() => {
              setSearch("");
              setSortKey("id");
              setSortDir("asc");
            }}
          >
            Clear
          </Button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Showing {filteredSorted.length} of {rows.length}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                {["Id", "Origin", "Destination", "Km"].map((label) => {
                  const key = HEADER_SORT_KEYS[label];
                  return (
                    <th key={label} className="px-2 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-primary-300"
                        onClick={() => handleHeaderSort(key)}
                        title={`Sort by ${label}`}
                      >
                        <span>{label}</span>
                        <span className="w-3 text-center text-[10px]">
                          {sortIndicator(key)}
                        </span>
                      </button>
                    </th>
                  );
                })}
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
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No rows match your search
                  </td>
                </tr>
              ) : (
                filteredSorted.map((r) => (
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
