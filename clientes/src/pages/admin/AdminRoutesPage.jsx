import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { routesService } from "@/services/routes.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { cn } from "@/utils/cn.js";

const ROUTE_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "origin", label: "Origin" },
  { key: "destination", label: "Destination" },
  { key: "distance_km", label: "Km" },
];

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

  const [addRouteOpen, setAddRouteOpen] = useState(false);
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

  function handleColumnSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
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
      setAddRouteOpen(false);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
            Routes
          </h1>
          <p className="text-p-muted max-w-xl text-sm sm:text-[0.95rem]">
            Define origin–destination pairs and optional distance. Use{" "}
            <strong className="font-semibold text-p-heading">Add route</strong> to open the form.
            Trips can reference these routes.
          </p>
        </div>
        <Button
          type="button"
          variant={addRouteOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddRouteOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addRouteOpen}
          aria-controls="admin-add-route-panel"
        >
          {addRouteOpen ? "Close form" : "Add route"}
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

      {addRouteOpen ? (
        <div id="admin-add-route-panel">
          <Card
            title="Create route"
            subtitle="Add a new route. Origin and destination are required."
          >
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <Input
                label="Origin"
                name="route_origin"
                value={cOrigin}
                onChange={(e) => setCOrigin(e.target.value)}
                required
              />
              <Input
                label="Destination"
                name="route_destination"
                value={cDest}
                onChange={(e) => setCDest(e.target.value)}
                required
              />
              <Input
                label="Distance km (optional)"
                type="number"
                step="0.01"
                min="0"
                name="route_distance_km"
                value={cKm}
                onChange={(e) => setCKm(e.target.value)}
              />
              <div className="flex flex-wrap items-end gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create route"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddRouteOpen(false);
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
        title="All routes"
        subtitle="Filter with search. Sort columns by clicking the table headers (▲/▼)."
      >
        <div className="mb-4 max-w-md border-b border-primary-200/90 pb-4 dark:border-primary-900/25">
          <Input
            label="Search"
            type="search"
            name="routes_table_search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Id, origin, destination, distance…"
            autoComplete="off"
            className="w-full"
          />
        </div>
        <p className="mb-2 text-xs text-slate-600 dark:text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-300">
            {filteredSorted.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-300">{rows.length}</span>{" "}
          routes
          {search.trim() ? " (filtered)" : ""}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                {ROUTE_SORT_KEYS.map(({ key, label }) => {
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
                  className="px-3 py-2.5 font-semibold text-slate-700 dark:text-primary-400/95"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No routes — use the Add route button above to create one.
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No routes match your search.{" "}
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
                filteredSorted.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                        "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                      )}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {r.id}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-apptext dark:text-slate-100">
                        {r.origin}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200">
                        {r.destination}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-600 dark:text-slate-400">
                        {r.distance_km ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
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
                      <tr className="border-b border-slate-100 bg-primary-50/90 dark:border-slate-800/60 dark:bg-primary-950/25">
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
