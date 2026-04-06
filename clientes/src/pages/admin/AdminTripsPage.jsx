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
import { formatDate, localInputToSqlDatetime, toDatetimeLocalValue } from "@/utils/format.js";

const TRIP_STATUSES = ["scheduled", "ongoing", "completed", "cancelled"];

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
      setTrips(Array.isArray(t) ? t : []);
      setRoutes(Array.isArray(rt) ? rt : []);
      setVehicles(Array.isArray(v) ? v : []);
      setUsers(Array.isArray(u) ? u : []);
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
    const activeUsers = users.filter(
      (u) => String(u?.status ?? "active").toLowerCase() !== "inactive"
    );
    const drivers = activeUsers.filter((u) => Number(u?.role_id) === 2);
    // Fallback for environments where role_id data is not fully seeded.
    return drivers.length ? drivers : activeUsers;
  }, [users]);

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
    if (!window.confirm("Delete this trip?")) return;
    setError("");
    setNotice("");
    if (editingId === id) closeEdit();
    try {
      await tripsService.remove(id);
      setNotice("Trip deleted.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

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
            <option value="">Select…</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} {r.origin} → {r.destination}
              </option>
            ))}
          </Select>
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
          <Select label="Driver (optional)" value={cDriver} onChange={(e) => setCDriver(e.target.value)}>
            <option value="">—</option>
            {driverOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} (#{u.id})
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
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2">Id</th>
                <th className="px-2 py-2">Route</th>
                <th className="px-2 py-2">Vehicle</th>
                <th className="px-2 py-2">Driver</th>
                <th className="px-2 py-2">Departure</th>
                <th className="px-2 py-2">Price</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    No trips
                  </td>
                </tr>
              ) : (
                trips.map((t) => (
                  <Fragment key={t.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs">{t.id}</td>
                      <td className="px-2 py-2 text-slate-400">{t.route_id}</td>
                      <td className="px-2 py-2 text-slate-400">{t.vehicle_id}</td>
                      <td className="px-2 py-2 text-slate-400">
                        {t.driver_id ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(t.departure_time)}
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
                        <td colSpan={8} className="p-4">
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
                                  <option key={r.id} value={r.id}>
                                    #{r.id} {r.origin}→{r.destination}
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
                                  <option key={v.id} value={v.id}>
                                    #{v.id} {v.plate_number || v.model}
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
                                <option value="">—</option>
                                {driverOptions.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.full_name} (#{u.id})
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
    </div>
  );
}
