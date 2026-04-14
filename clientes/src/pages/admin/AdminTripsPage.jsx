import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { tripsService } from "@/services/trips.service.js";
import { routesService } from "@/services/routes.service.js";
import { vehiclesService } from "@/services/vehicles.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { formatDate, localInputToSqlDatetime, toDatetimeLocalValue } from "@/utils/format.js";

const TRIP_STATUSES = ["scheduled", "ongoing", "completed", "cancelled"];
const SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "route", label: "Route" },
  { value: "vehicle", label: "Vehicle" },
  { value: "driver", label: "Driver" },
  { value: "departure_time", label: "Departure" },
  { value: "arrival_time", label: "Arrival" },
  { value: "price", label: "Price" },
  { value: "status", label: "Status" },
];

const HEADER_SORT_KEYS = {
  Id: "id",
  Route: "route",
  Vehicle: "vehicle",
  Driver: "driver",
  Departure: "departure_time",
  Arrival: "arrival_time",
  Price: "price",
  Status: "status",
};

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

/** Plate + model for selects and tables (no raw id in the label). */
function vehicleDisplayName(v) {
  if (!v) return "";
  const plate = String(v.plate_number ?? "").trim();
  const model = String(v.model ?? "").trim();
  if (plate && model) return `${plate} · ${model}`;
  return plate || model || "";
}

function driverDisplayName(u) {
  if (!u) return "";
  const name = String(u.full_name ?? "").trim();
  return name || "";
}

export function AdminTripsPage() {
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState("departure_time");
  const [sortDir, setSortDir] = useState("desc");

  const [cRoute, setCRoute] = useState("");
  const [cVehicle, setCVehicle] = useState("");
  const [cDriver, setCDriver] = useState("");
  const [cDepart, setCDepart] = useState("");
  const [cArrive, setCArrive] = useState("");
  const [cPrice, setCPrice] = useState("");
  const [cStatus, setCStatus] = useState("scheduled");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    route_id: "",
    vehicle_id: "",
    driver_id: "",
    departure_time: "",
    arrival_time: "",
    price: "",
    status: "scheduled",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [t, rt, v, u] = await Promise.all([
        tripsService.list(),
        routesService.list(),
        vehiclesService.list(),
        adminUsersService.list(),
      ]);
      setTrips(normalizeList(t));
      setRoutes(normalizeList(rt));
      setVehicles(normalizeList(v));
      setUsers(normalizeList(u));
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const driverOptions = useMemo(() => {
    return users.filter(
      (u) =>
        String(u?.status ?? "active").toLowerCase() !== "inactive" &&
        Number(u?.role_id) === 2
    );
  }, [users]);

  /** Keep assigned driver visible when editing even if role/status changed. */
  const driverOptionsForEdit = useMemo(() => {
    const id = editForm.driver_id ? Number(editForm.driver_id) : NaN;
    if (!Number.isFinite(id) || id <= 0) return driverOptions;
    if (driverOptions.some((u) => Number(u.id) === id)) return driverOptions;
    const assigned = users.find((u) => Number(u.id) === id);
    return assigned ? [...driverOptions, assigned] : driverOptions;
  }, [driverOptions, editForm.driver_id, users]);

  const routeById = useMemo(() => {
    const m = new Map();
    for (const r of routes) m.set(Number(r.id), r);
    return m;
  }, [routes]);

  const vehicleById = useMemo(() => {
    const m = new Map();
    for (const v of vehicles) m.set(Number(v.id), v);
    return m;
  }, [vehicles]);

  const userById = useMemo(() => {
    const m = new Map();
    for (const u of users) m.set(Number(u.id), u);
    return m;
  }, [users]);

  function tripRouteLabel(routeId) {
    const r = routeById.get(Number(routeId));
    return r
      ? `${r.origin} → ${r.destination}`
      : routeId != null
        ? `Route #${routeId}`
        : "—";
  }

  function tripVehicleLabel(vehicleId) {
    const v = vehicleById.get(Number(vehicleId));
    const label = vehicleDisplayName(v);
    return label || (vehicleId != null ? `Vehicle #${vehicleId}` : "—");
  }

  function tripDriverLabel(driverId) {
    if (driverId == null || driverId === "") return "—";
    const u = userById.get(Number(driverId));
    const label = driverDisplayName(u);
    return label || `Driver #${driverId}`;
  }

  const filteredSorted = useMemo(() => {
    let rows = [...trips];
    const q = search.trim().toLowerCase();
    const statusQ = filterStatus.trim().toLowerCase();

    if (statusQ) {
      rows = rows.filter(
        (t) => String(t?.status ?? "").toLowerCase() === statusQ
      );
    }

    if (q) {
      rows = rows.filter((t) => {
        const parts = [
          t?.id,
          t?.route_id,
          t?.vehicle_id,
          t?.driver_id,
          t?.departure_time,
          t?.arrival_time,
          t?.price,
          t?.status,
          tripRouteLabel(t?.route_id),
          tripVehicleLabel(t?.vehicle_id),
          tripDriverLabel(t?.driver_id),
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
      if (sortKey === "route") {
        va = tripRouteLabel(a?.route_id).toLowerCase();
        vb = tripRouteLabel(b?.route_id).toLowerCase();
      } else if (sortKey === "vehicle") {
        va = tripVehicleLabel(a?.vehicle_id).toLowerCase();
        vb = tripVehicleLabel(b?.vehicle_id).toLowerCase();
      } else if (sortKey === "driver") {
        va = tripDriverLabel(a?.driver_id).toLowerCase();
        vb = tripDriverLabel(b?.driver_id).toLowerCase();
      } else {
        va = a?.[sortKey];
        vb = b?.[sortKey];
      }

      if (["id", "price"].includes(sortKey)) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else if (["departure_time", "arrival_time"].includes(sortKey)) {
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
  }, [trips, search, filterStatus, sortKey, sortDir, routeById, vehicleById, userById]);

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

  function openEdit(x) {
    setEditingId(x.id);
    setEditForm({
      route_id: String(x.route_id ?? ""),
      vehicle_id: String(x.vehicle_id ?? ""),
      driver_id: x.driver_id != null ? String(x.driver_id) : "",
      departure_time: toDatetimeLocalValue(x.departure_time),
      arrival_time: toDatetimeLocalValue(x.arrival_time),
      price: String(x.price ?? ""),
      status: x.status ?? "scheduled",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({
      route_id: "",
      vehicle_id: "",
      driver_id: "",
      departure_time: "",
      arrival_time: "",
      price: "",
      status: "scheduled",
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (!cRoute || !cVehicle || !cDepart || cPrice === "") {
      setError("Route, vehicle, departure, and price are required.");
      return;
    }
    const dep = localInputToSqlDatetime(cDepart);
    if (!dep) {
      setError("Invalid departure time.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        route_id: Number(cRoute),
        vehicle_id: Number(cVehicle),
        departure_time: dep,
        price: Number(cPrice),
        status: cStatus,
      };
      if (cDriver) body.driver_id = Number(cDriver);
      if (cArrive) {
        const arr = localInputToSqlDatetime(cArrive);
        if (arr) body.arrival_time = arr;
      }
      await tripsService.create(body);
      setNotice("Trip created.");
      setCRoute("");
      setCVehicle("");
      setCDriver("");
      setCDepart("");
      setCArrive("");
      setCPrice("");
      setCStatus("scheduled");
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
    const {
      route_id,
      vehicle_id,
      driver_id,
      departure_time,
      arrival_time,
      price,
      status,
    } = editForm;
    if (!route_id || !vehicle_id || !departure_time || price === "" || !status) {
      setError("All fields except optional arrival/driver are required for update.");
      return;
    }
    const dep = localInputToSqlDatetime(departure_time);
    if (!dep) {
      setError("Invalid departure time.");
      return;
    }
    setSavingEdit(true);
    try {
      const body = {
        route_id: Number(route_id),
        vehicle_id: Number(vehicle_id),
        driver_id: driver_id ? Number(driver_id) : null,
        departure_time: dep,
        arrival_time: arrival_time
          ? localInputToSqlDatetime(arrival_time)
          : null,
        price: Number(price),
        status,
      };
      await tripsService.update(editingId, body);
      setNotice("Trip updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    setDeleteModal({ isOpen: true, id, name: `Trip #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    if (editingId === id) closeEdit();
    
    try {
      await tripsService.remove(id);
      setNotice("Trip deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      console.error("Delete trip error:", err);
      let errorMessage = "Failed to delete trip.";
      
      if (err.status === 500) {
        errorMessage = "Server error occurred. The trip may have associated tickets or seats.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this trip.";
      } else if (err.status === 404) {
        errorMessage = "Trip not found. It may have already been deleted.";
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

  if (loading && !trips.length) {
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

      <Card title="Create trip">
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Select
            label="Route"
            value={cRoute}
            onChange={(e) => setCRoute(e.target.value)}
            required
          >
            <option value="">Select route…</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id} title={`Route ID ${r.id}`}>
                {r.origin} → {r.destination}
              </option>
            ))}
          </Select>
          <Select
            label="Vehicle"
            value={cVehicle}
            onChange={(e) => setCVehicle(e.target.value)}
            required
          >
            <option value="">Select vehicle…</option>
            {vehicles.map((v) => (
              <option
                key={v.id}
                value={v.id}
                title={`ID ${v.id}`}
              >
                {vehicleDisplayName(v) || `Vehicle #${v.id}`}
              </option>
            ))}
          </Select>
          <Select label="Driver (optional)" value={cDriver} onChange={(e) => setCDriver(e.target.value)}>
            <option value="">No driver</option>
            {driverOptions.map((u) => (
              <option key={u.id} value={u.id} title={`ID ${u.id}`}>
                {driverDisplayName(u) || `Driver #${u.id}`}
              </option>
            ))}
          </Select>
          <Input
            label="Departure"
            type="datetime-local"
            value={cDepart}
            onChange={(e) => setCDepart(e.target.value)}
            required
          />
          <Input
            label="Arrival (optional)"
            type="datetime-local"
            value={cArrive}
            onChange={(e) => setCArrive(e.target.value)}
          />
          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            value={cPrice}
            onChange={(e) => setCPrice(e.target.value)}
            required
          />
          <Select
            label="Status"
            value={cStatus}
            onChange={(e) => setCStatus(e.target.value)}
          >
            {TRIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create trip"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="All trips">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID, route, vehicle, driver, status, time..."
            className="min-w-[240px] sm:flex-1"
          />
          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="min-w-[150px]"
          >
            <option value="">All statuses</option>
            {TRIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Sort by"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="min-w-[150px]"
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
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </Select>
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
          <Button
            variant="ghost"
            className="!text-xs"
            onClick={() => {
              setSearch("");
              setFilterStatus("");
              setSortKey("departure_time");
              setSortDir("desc");
            }}
          >
            Clear
          </Button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Showing {filteredSorted.length} of {trips.length}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                {[
                  "Id",
                  "Route",
                  "Vehicle",
                  "Driver",
                  "Departure",
                  "Arrival",
                  "Price",
                  "Status",
                ].map((label) => {
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
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    No trips
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    No rows match your filters
                  </td>
                </tr>
              ) : (
                filteredSorted.map((t) => (
                  <Fragment key={t.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs">{t.id}</td>
                      <td className="max-w-[200px] truncate px-2 py-2 text-slate-300" title={String(t.route_id ?? "")}>
                        {tripRouteLabel(t.route_id)}
                      </td>
                      <td className="max-w-[180px] truncate px-2 py-2 text-slate-300" title={String(t.vehicle_id ?? "")}>
                        {tripVehicleLabel(t.vehicle_id)}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-2 text-slate-300" title={t.driver_id != null ? String(t.driver_id) : ""}>
                        {tripDriverLabel(t.driver_id)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(t.departure_time)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {t.arrival_time ? formatDate(t.arrival_time) : "—"}
                      </td>
                      <td className="px-2 py-2">{t.price}</td>
                      <td className="px-2 py-2">{t.status}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit"
                            onClick={() => openEdit(t)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete"
                            onClick={() => handleRemove(t.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === t.id ? (
                      <tr className="bg-primary-950/20">
                        <td colSpan={9} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <Select
                                label="Route"
                                value={editForm.route_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    route_id: e.target.value,
                                  }))
                                }
                                required
                              >
                                {routes.map((r) => (
                                  <option key={r.id} value={r.id} title={`Route ID ${r.id}`}>
                                    {r.origin} → {r.destination}
                                  </option>
                                ))}
                              </Select>
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
                                  <option key={v.id} value={v.id} title={`ID ${v.id}`}>
                                    {vehicleDisplayName(v) || `Vehicle #${v.id}`}
                                  </option>
                                ))}
                              </Select>
                              <Select
                                label="Driver"
                                value={editForm.driver_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    driver_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">No driver</option>
                                {driverOptionsForEdit.map((u) => (
                                  <option key={u.id} value={u.id} title={`ID ${u.id}`}>
                                    {driverDisplayName(u) || `Driver #${u.id}`}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                label="Departure"
                                type="datetime-local"
                                value={editForm.departure_time}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    departure_time: e.target.value,
                                  }))
                                }
                                required
                              />
                              <Input
                                label="Arrival"
                                type="datetime-local"
                                value={editForm.arrival_time}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    arrival_time: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                label="Price"
                                type="number"
                                step="0.01"
                                value={editForm.price}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    price: e.target.value,
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
                                {TRIP_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
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
        title="Delete Trip"
        message={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone and may affect associated tickets or seats.`}
        itemName={deleteModal.name}
        loading={deleting}
      />
    </div>
  );
}
