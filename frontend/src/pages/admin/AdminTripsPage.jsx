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
import { cn } from "@/utils/cn.js";
import { DRIVER_ROLE_ID } from "@/utils/constants.js";

const TRIP_STATUSES = ["scheduled", "ongoing", "completed", "cancelled"];

const TRIP_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "route", label: "Route" },
  { key: "vehicle", label: "Vehicle" },
  { key: "driver", label: "Driver" },
  { key: "driver_lock", label: "Driver lock" },
  { key: "departure_time", label: "Departure" },
  { key: "arrival_time", label: "Arrival" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

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

function isDriverLockActive(trip) {
  if (!trip?.driver_id || !trip?.driver_lock_expires_at) return false;
  const t = new Date(trip.driver_lock_expires_at).getTime();
  return Number.isFinite(t) && Date.now() < t;
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

  const [addTripOpen, setAddTripOpen] = useState(false);
  const [cRoute, setCRoute] = useState("");
  const [cVehicle, setCVehicle] = useState("");
  const [cDriver, setCDriver] = useState("");
  const [cDepart, setCDepart] = useState("");
  const [cArrive, setCArrive] = useState("");
  const [cPrice, setCPrice] = useState("");
  const [cStatus, setCStatus] = useState("scheduled");
  /** Driver user IDs with another trip overlapping this departure/arrival window (admin API). */
  const [busyDriverIds, setBusyDriverIds] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [forceUnlockEdit, setForceUnlockEdit] = useState(false);
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
      setError(
        e?.data?.message || e?.message || "Failed to load trips, routes, and vehicles."
      );
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
        Number(u?.role_id) === DRIVER_ROLE_ID
    );
  }, [users]);

  const busyDriverSet = useMemo(
    () => new Set(busyDriverIds.map((n) => Number(n)).filter((n) => n > 0)),
    [busyDriverIds]
  );

  /** Active drivers not already on another trip in the selected time window. */
  const driverOptionsForCreate = useMemo(
    () => driverOptions.filter((u) => !busyDriverSet.has(Number(u.id))),
    [driverOptions, busyDriverSet]
  );

  /** Keep assigned driver visible when editing; hide others that overlap. */
  const driverOptionsForEdit = useMemo(() => {
    const free = driverOptions.filter((u) => !busyDriverSet.has(Number(u.id)));
    const id = editForm.driver_id ? Number(editForm.driver_id) : NaN;
    if (!Number.isFinite(id) || id <= 0) return free;
    if (free.some((u) => Number(u.id) === id)) return free;
    const assigned = users.find((u) => Number(u.id) === id);
    return assigned ? [...free, assigned] : free;
  }, [driverOptions, busyDriverSet, editForm.driver_id, users]);

  useEffect(() => {
    if (!addTripOpen && editingId == null) {
      setBusyDriverIds([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      let depSql = null;
      let arrSql = null;
      let excludeTripId = null;
      if (editingId != null) {
        depSql = localInputToSqlDatetime(editForm.departure_time);
        arrSql = editForm.arrival_time
          ? localInputToSqlDatetime(editForm.arrival_time)
          : null;
        excludeTripId = editingId;
      } else if (addTripOpen) {
        depSql = localInputToSqlDatetime(cDepart);
        arrSql = cArrive ? localInputToSqlDatetime(cArrive) : null;
      }
      if (!depSql) {
        if (!cancelled) setBusyDriverIds([]);
        return;
      }
      try {
        const raw = await tripsService.busyDriversForWindow({
          departure_time: depSql,
          arrival_time: arrSql,
          exclude_trip_id: excludeTripId,
        });
        const list = Array.isArray(raw?.busy_driver_ids)
          ? raw.busy_driver_ids
          : [];
        const ids = list.map(Number).filter((n) => Number.isInteger(n) && n > 0);
        if (cancelled) return;
        setBusyDriverIds(ids);
        if (addTripOpen && cDriver && ids.includes(Number(cDriver))) {
          setCDriver("");
        }
      } catch {
        if (!cancelled) setBusyDriverIds([]);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addTripOpen, cDepart, cArrive, editingId, editForm.departure_time, editForm.arrival_time]);

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
          t?.driver_lock_expires_at,
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
      } else if (sortKey === "driver_lock") {
        va = a?.driver_lock_expires_at
          ? new Date(a.driver_lock_expires_at).getTime()
          : 0;
        vb = b?.driver_lock_expires_at
          ? new Date(b.driver_lock_expires_at).getTime()
          : 0;
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

  function handleColumnSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function openEdit(x) {
    setEditingId(x.id);
    setForceUnlockEdit(false);
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
    setForceUnlockEdit(false);
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
      setAddTripOpen(false);
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
      const currentTrip = trips.find((x) => Number(x.id) === Number(editingId));
      const lockActive = currentTrip && isDriverLockActive(currentTrip);
      const oldDr =
        currentTrip?.driver_id != null ? Number(currentTrip.driver_id) : null;
      const newDr = driver_id ? Number(driver_id) : null;
      if (lockActive && oldDr !== newDr && !forceUnlockEdit) {
        setError(
          "This trip’s driver is locked. Enable “Override driver lock” below to assign a different driver, or wait until the lock time passes."
        );
        setSavingEdit(false);
        return;
      }
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
      if (lockActive && oldDr !== newDr && forceUnlockEdit) {
        body.force_unlock = true;
      }
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
         {/* animate the text */}
         <span className="animate-pulse">Admin Manegements Trips</span>
         <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
            Admin Manegements Trips
          </h1>

        </div>
        <Button
          type="button"
          variant={addTripOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddTripOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addTripOpen}
          aria-controls="admin-add-trip-panel"
        >
          {addTripOpen ? "Close form" : "Add trip"}
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

      {addTripOpen ? (
        <div id="admin-add-trip-panel">
          <Card
            title="Create trip"
            subtitle="Order: choose route, optionally assign a driver, then the vehicle. Departure, price, and status are required; arrival is optional."
          >
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Select
                label="Route"
                name="trip_route"
                value={cRoute}
                onChange={(e) => setCRoute(e.target.value)}
                required
              >
                <option value="">Select route…</option>
                {routes.map((r) => (
                  <option
                    key={r.id}
                    value={String(r.id)}
                    title={`Route ID ${r.id}`}
                  >
                    {r.origin} → {r.destination}
                  </option>
                ))}
              </Select>
              <Select
                label="Driver (optional)"
                name="trip_driver"
                value={cDriver}
                onChange={(e) => setCDriver(e.target.value)}
              >
                <option value="">No driver</option>
                {driverOptionsForCreate.map((u) => (
                  <option
                    key={u.id}
                    value={String(u.id)}
                    title={`ID ${u.id}`}
                  >
                    {driverDisplayName(u) || `Driver #${u.id}`}
                  </option>
                ))}
              </Select>
              <Select
                label="Vehicle"
                name="trip_vehicle"
                value={cVehicle}
                onChange={(e) => setCVehicle(e.target.value)}
                required
              >
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option
                    key={v.id}
                    value={String(v.id)}
                    title={`ID ${v.id}`}
                  >
                    {vehicleDisplayName(v) || `Vehicle #${v.id}`}
                  </option>
                ))}
              </Select>
              <Input
                label="Departure"
                type="datetime-local"
                name="trip_departure"
                value={cDepart}
                onChange={(e) => setCDepart(e.target.value)}
                required
              />
              <Input
                label="Arrival (optional)"
                type="datetime-local"
                name="trip_arrival"
                value={cArrive}
                onChange={(e) => setCArrive(e.target.value)}
              />
              <Input
                label="Price"
                type="number"
                step="0.01"
                min="0"
                name="trip_price"
                value={cPrice}
                onChange={(e) => setCPrice(e.target.value)}
                required
              />
              <Select
                label="Status"
                name="trip_status"
                value={cStatus}
                onChange={(e) => setCStatus(e.target.value)}
              >
                {TRIP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-3 dark:text-slate-400">
                {localInputToSqlDatetime(cDepart)
                  ? "Drivers who already have another scheduled/ongoing trip in this time window (same rules as the server) are not listed. When that trip is completed, cancelled, or rescheduled, they appear again."
                  : "Set departure to hide drivers with overlapping trips in this time window."}
              </p>
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create trip"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddTripOpen(false);
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
        title="All trips"
        subtitle="Search and filter by status. Sort columns by clicking the table headers (▲/▼)."
      >
        <div className="mb-4 flex flex-col gap-4 border-b border-primary-200/90 pb-4 dark:border-primary-900/25 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="max-w-md min-w-[200px] flex-1">
            <Input
              label="Search"
              type="search"
              name="trips_table_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Id, route, vehicle, driver, status, time…"
              autoComplete="off"
              className="w-full"
            />
          </div>
          <div className="min-w-[160px] sm:max-w-[200px]">
            <Select
              label="Status"
              name="trips_filter_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              {TRIP_STATUSES.map((s) => (
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
          <span className="font-semibold text-slate-800 dark:text-slate-300">{trips.length}</span>{" "}
          trips
          {search.trim() || filterStatus ? " (filtered)" : ""}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                {TRIP_SORT_KEYS.map(({ key, label }) => {
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
              {trips.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No trips — use the Add trip button above to create one.
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No trips match your search or status filter.{" "}
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
                      <td
                        className="max-w-[200px] truncate px-2 py-2.5 font-medium text-apptext dark:text-slate-100"
                        title={String(t.route_id ?? "")}
                      >
                        {tripRouteLabel(t.route_id)}
                      </td>
                      <td
                        className="max-w-[180px] truncate px-2 py-2.5 text-slate-800 dark:text-slate-200"
                        title={String(t.vehicle_id ?? "")}
                      >
                        {tripVehicleLabel(t.vehicle_id)}
                      </td>
                      <td
                        className="max-w-[140px] truncate px-2 py-2.5 text-slate-800 dark:text-slate-300"
                        title={t.driver_id != null ? String(t.driver_id) : ""}
                      >
                        {tripDriverLabel(t.driver_id)}
                      </td>
                      <td className="max-w-[160px] px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {!t.driver_lock_expires_at || !t.driver_id ? (
                          "—"
                        ) : (
                          <span
                            className={
                              isDriverLockActive(t)
                                ? "font-medium text-amber-700 dark:text-amber-400"
                                : ""
                            }
                            title={String(t.driver_lock_expires_at)}
                          >
                            {formatDate(t.driver_lock_expires_at)}
                            {isDriverLockActive(t) ? " · locked" : ""}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(t.departure_time)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {t.arrival_time ? formatDate(t.arrival_time) : "—"}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-slate-800 dark:text-slate-300">
                        {t.price}
                      </td>
                      <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {t.status}
                      </td>
                      <td className="px-2 py-2.5">
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
                      <tr className="border-b border-slate-100 bg-primary-50/90 dark:border-slate-800/60 dark:bg-primary-950/25">
                        <td colSpan={10} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            {isDriverLockActive(t) ? (
                              <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
                                <p>
                                  Driver is <strong>locked</strong> until{" "}
                                  {formatDate(t.driver_lock_expires_at)}. You can
                                  still edit route, vehicle, times, and price. To
                                  change the driver, check &quot;Override driver
                                  lock&quot; below.
                                </p>
                                <label className="mt-2 flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="rounded border-amber-400"
                                    checked={forceUnlockEdit}
                                    onChange={(e) =>
                                      setForceUnlockEdit(e.target.checked)
                                    }
                                  />
                                  <span>Override driver lock (reassign / clear driver)</span>
                                </label>
                              </div>
                            ) : null}
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
                                  <option
                                    key={r.id}
                                    value={String(r.id)}
                                    title={`Route ID ${r.id}`}
                                  >
                                    {r.origin} → {r.destination}
                                  </option>
                                ))}
                              </Select>
                              <div className="space-y-1">
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
                                    <option
                                      key={u.id}
                                      value={String(u.id)}
                                      title={`ID ${u.id}`}
                                    >
                                      {driverDisplayName(u) || `Driver #${u.id}`}
                                    </option>
                                  ))}
                                </Select>
                                <p className="text-[0.7rem] leading-snug text-slate-500 dark:text-slate-400">
                                  Drivers on another trip in this window are hidden; the
                                  current driver always stays available.
                                </p>
                              </div>
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
                                  <option
                                    key={v.id}
                                    value={String(v.id)}
                                    title={`ID ${v.id}`}
                                  >
                                    {vehicleDisplayName(v) || `Vehicle #${v.id}`}
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
