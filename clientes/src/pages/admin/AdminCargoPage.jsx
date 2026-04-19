import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { cargoService } from "@/services/cargo.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { tripsService } from "@/services/trips.service.js";
import { routesService } from "@/services/routes.service.js";
import { vehiclesService } from "@/services/vehicles.service.js";
import { rolesService } from "@/services/roles.service.js";
import { viewsService } from "@/services/views.service.js";
import { ConfirmModal } from "@/components/ConfirmModal.jsx";
import { isDriverRole } from "@/utils/roles.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { DataTable } from "@/ui/DataTable.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { formatDate, formatMoney } from "@/utils/format.js";
import { cn } from "@/utils/cn.js";

const CARGO_STATUSES = [
  "pending",
  "accepted",
  "in_transit",
  "delivered",
  "cancelled",
];

const CARGO_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "owner_id", label: "Owner" },
  { key: "trip_id", label: "Trip" },
  { key: "weight", label: "Weight" },
  { key: "fee", label: "Fee" },
  { key: "content", label: "Content" },
  { key: "tracking_code", label: "Tracking" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
];

export function AdminCargoPage() {
  const relationsView = useAsync(() => viewsService.cargoRelations(100));

  const [cargo, setCargo] = useState([]);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [assignTripId, setAssignTripId] = useState("");
  const [assignDriverFilter, setAssignDriverFilter] = useState("");
  const [selectedCargoIds, setSelectedCargoIds] = useState([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [confirmAssignAllOpen, setConfirmAssignAllOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [addCargoOpen, setAddCargoOpen] = useState(false);
  const [cOwnerId, setCOwnerId] = useState("");
  const [cTripId, setCTripId] = useState("");
  const [cWeight, setCWeight] = useState("");
  const [cContent, setCContent] = useState("");
  const [cTracking, setCTracking] = useState("");
  const [cCargoStatus, setCCargoStatus] = useState("pending");
  const [cFeeOverride, setCFeeOverride] = useState(false);
  const [cFee, setCFee] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    owner_id: "",
    trip_id: "",
    weight: "",
    content: "",
    tracking_code: "",
    status: "pending",
    fee_override: false,
    fee: "",
  });

  const refreshCore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, u, tr, rt, veh, rl] = await Promise.all([
        cargoService.list(),
        adminUsersService.list(),
        tripsService.list(),
        routesService.list(),
        vehiclesService.list(),
        rolesService.list(),
      ]);
      setCargo(
        Array.isArray(c) ? c : Array.isArray(c?.data) ? c.data : []
      );
      setUsers(
        Array.isArray(u) ? u : Array.isArray(u?.data) ? u.data : []
      );
      setTrips(
        Array.isArray(tr) ? tr : Array.isArray(tr?.data) ? tr.data : []
      );
      setRoutes(
        Array.isArray(rt) ? rt : Array.isArray(rt?.data) ? rt.data : []
      );
      setVehicles(
        Array.isArray(veh) ? veh : Array.isArray(veh?.data) ? veh.data : []
      );
      setRoles(
        Array.isArray(rl) ? rl : Array.isArray(rl?.data) ? rl.data : []
      );
    } catch (e) {
      setError(e?.message || "Failed to load cargo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCore();
  }, [refreshCore]);

  useEffect(() => {
    relationsView.run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userLabel = useCallback(
    (ownerId) => {
      const u = users.find((x) => String(x.id) === String(ownerId));
      return u ? `${u.full_name} (#${u.id})` : String(ownerId ?? "—");
    },
    [users]
  );

  const routeLine = useCallback(
    (routeId) => {
      const r = routes.find((x) => String(x.id) === String(routeId));
      if (!r) return routeId != null ? `Route #${routeId}` : "Route —";
      const o = String(r.origin ?? "").trim() || "?";
      const d = String(r.destination ?? "").trim() || "?";
      return `${o} → ${d}`;
    },
    [routes]
  );

  const vehiclePlate = useCallback(
    (vehicleId) => {
      const v = vehicles.find((x) => String(x.id) === String(vehicleId));
      if (v?.plate_number) return String(v.plate_number).trim();
      return vehicleId != null ? `Vehicle id ${vehicleId}` : "—";
    },
    [vehicles]
  );

  const tripLabel = useCallback(
    (tripId) => {
      const t = trips.find((x) => String(x.id) === String(tripId));
      if (!t) return String(tripId ?? "—");
      return `#${t.id} · ${routeLine(t.route_id)} · ${formatDate(t.departure_time)}`;
    },
    [trips, routeLine]
  );

  /** Trip must have a driver or the shipment never appears on the driver Cargo page. */
  const assignableTrips = useMemo(
    () =>
      trips.filter((t) => {
        const d = t.driver_id;
        return d != null && String(d).trim() !== "" && Number(d) > 0;
      }),
    [trips]
  );

  const driverRoleIds = useMemo(() => {
    const set = new Set();
    for (const r of roles) {
      if (isDriverRole(r?.name)) set.add(Number(r.id));
    }
    return set;
  }, [roles]);

  const driverIdsOnTrips = useMemo(() => {
    const s = new Set();
    for (const t of assignableTrips) {
      s.add(Number(t.driver_id));
    }
    return s;
  }, [assignableTrips]);

  const driverUsersForAssign = useMemo(() => {
    const byId = new Map();
    for (const u of users) {
      const id = Number(u.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      const roleMatch = driverRoleIds.has(Number(u.role_id));
      if (roleMatch || driverIdsOnTrips.has(id)) {
        byId.set(id, u);
      }
    }
    return [...byId.values()].sort((a, b) =>
      String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""), undefined, {
        sensitivity: "base",
      })
    );
  }, [users, driverRoleIds, driverIdsOnTrips]);

  const tripsForAssign = useMemo(() => {
    let list = assignableTrips;
    if (String(assignDriverFilter ?? "").trim()) {
      list = list.filter(
        (t) => String(t.driver_id ?? "") === String(assignDriverFilter).trim()
      );
    }
    return [...list].sort((a, b) => {
      const ta = new Date(a.departure_time || 0).getTime();
      const tb = new Date(b.departure_time || 0).getTime();
      return ta - tb;
    });
  }, [assignableTrips, assignDriverFilter]);

  /**
   * Assign trip dropdown: hide any trip that already has one of the selected cargo rows
   * (so you only pick a destination trip you are moving cargo onto — no redundant “same trip”).
   * With no rows checked, all filtered driver trips stay available.
   */
  const tripsForAssignDropdown = useMemo(() => {
    if (!selectedCargoIds.length) return tripsForAssign;

    const selectedRows = cargo.filter((c) =>
      selectedCargoIds.some((sid) => Number(sid) === Number(c.id))
    );
    if (!selectedRows.length) return tripsForAssign;

    return tripsForAssign.filter((t) => {
      const tid = Number(t.id);
      const anyAlreadyOnThisTrip = selectedRows.some(
        (row) => Number(row.trip_id) === tid
      );
      return !anyAlreadyOnThisTrip;
    });
  }, [tripsForAssign, selectedCargoIds, cargo]);

  const selectedAssignTrip = useMemo(() => {
    const tid = Number(assignTripId);
    if (!Number.isFinite(tid) || tid <= 0) return null;
    return assignableTrips.find((t) => Number(t.id) === tid) ?? null;
  }, [assignTripId, assignableTrips]);

  /** Trip choice must stay in the filtered list (driver + selection rules). */
  const assignTripReady = useMemo(() => {
    if (!assignTripId.trim()) return false;
    const tid = Number(assignTripId);
    if (!Number.isFinite(tid) || tid <= 0) return false;
    return tripsForAssignDropdown.some((t) => Number(t.id) === tid);
  }, [assignTripId, tripsForAssignDropdown]);

  useEffect(() => {
    if (!assignTripId.trim()) return;
    const tid = Number(assignTripId);
    const inFiltered = tripsForAssignDropdown.some((t) => Number(t.id) === tid);
    if (!inFiltered) setAssignTripId("");
  }, [assignTripId, tripsForAssignDropdown]);

  /**
   * Dropdown option text without "#" (name · numeric id).
   * Used for assign filters and edit-row selects.
   */
  const userOptionText = useCallback(
    (u, fallbackName = "User") =>
      `${String(u.full_name ?? "").trim() || fallbackName} · ${u.id}`,
    []
  );

  /** Full readable label for trip `<option>`s (assign + edit). */
  const tripSelectOptionText = useCallback(
    (t) => {
      const u = users.find((x) => String(x.id) === String(t.driver_id));
      const driverPart = u
        ? `Driver: ${String(u.full_name ?? "").trim() || "Driver"} (user #${u.id})`
        : t.driver_id
          ? `Driver: user #${t.driver_id} (not in list)`
          : "Driver: —";
      const routePart = routeLine(t.route_id);
      const dep = formatDate(t.departure_time);
      const plate = vehiclePlate(t.vehicle_id);
      const st = String(t.status ?? "").trim() || "—";
      return `Trip #${t.id} · ${routePart} · ${driverPart} · Departs ${dep} · Vehicle ${plate} · Trip status: ${st}`;
    },
    [users, routeLine, vehiclePlate]
  );

  const pendingCargoCount = useMemo(
    () =>
      cargo.filter(
        (r) => String(r.status ?? "").trim().toLowerCase() === "pending"
      ).length,
    [cargo]
  );

  const filteredSorted = useMemo(() => {
    let rows = [...cargo];
    const statusQ = filterStatus.trim().toLowerCase();
    if (statusQ) {
      rows = rows.filter(
        (r) => String(r?.status ?? "").toLowerCase() === statusQ
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const pack = [
          r.id,
          r.owner_id,
          r.trip_id,
          r.weight,
          r.fee,
          r.content,
          r.tracking_code,
          r.status,
          r.created_at,
          userLabel(r.owner_id),
          tripLabel(r.trip_id),
        ]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return pack.some((s) => s.includes(q));
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const key = sortKey;
    rows.sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      if (key === "created_at") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else if (
        ["id", "owner_id", "trip_id", "weight", "fee"].includes(key)
      ) {
        va = Number(va);
        vb = Number(vb);
        if (!Number.isFinite(va)) va = 0;
        if (!Number.isFinite(vb)) vb = 0;
      } else {
        va = String(va ?? "").toLowerCase();
        vb = String(vb ?? "").toLowerCase();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [
    cargo,
    search,
    filterStatus,
    sortKey,
    sortDir,
    userLabel,
    tripLabel,
  ]);

  function handleColumnSort(k) {
    if (!k) return;
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(k);
    setSortDir("asc");
  }

  async function handleCreateCargo(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (!cOwnerId || !cTripId || cWeight === "") {
      setError("Owner, trip, and weight are required.");
      return;
    }
    const w = Number(cWeight);
    if (!Number.isFinite(w) || w <= 0) {
      setError("Weight must be a positive number.");
      return;
    }
    if (cFeeOverride) {
      const f = Number(cFee);
      if (!Number.isFinite(f) || f < 0) {
        setError("Override fee must be a non-negative number.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const body = {
        owner_id: Number(cOwnerId),
        trip_id: Number(cTripId),
        weight: w,
        content: cContent.trim() || null,
        tracking_code: cTracking.trim() || null,
        status: cCargoStatus,
      };
      if (cFeeOverride) {
        body.fee_override = true;
        body.fee = Number(cFee);
      }
      await cargoService.create(body);
      setNotice("Cargo created.");
      setCOwnerId("");
      setCTripId("");
      setCWeight("");
      setCContent("");
      setCTracking("");
      setCCargoStatus("pending");
      setCFeeOverride(false);
      setCFee("");
      setAddCargoOpen(false);
      await refreshCore();
      relationsView.run().catch(() => {});
    } catch (err) {
      setError(
        err?.data?.sqlMessage ||
          err?.data?.message ||
          err?.message ||
          "Create failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCargoSelect(id) {
    setSelectedCargoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllVisible() {
    const ids = filteredSorted.map((r) => r.id);
    setSelectedCargoIds((prev) => {
      const allSelected = ids.length && ids.every((i) => prev.includes(i));
      if (allSelected) {
        return prev.filter((i) => !ids.includes(i));
      }
      return [...new Set([...prev, ...ids])];
    });
  }

  async function runBulkAssign(scope, extra = {}) {
    setNotice("");
    setError("");
    const tid = Number(assignTripId);
    if (!Number.isFinite(tid) || tid <= 0) {
      setError("Choose a trip to assign cargo to.");
      return;
    }
    const tripRow = assignableTrips.find((t) => Number(t.id) === tid);
    if (!tripRow) {
      setError(
        "That trip is not assignable (missing driver) or does not exist. Set a driver on Admin Trips first.",
      );
      return;
    }
    if (
      String(assignDriverFilter ?? "").trim() &&
      String(tripRow.driver_id ?? "") !== String(assignDriverFilter).trim()
    ) {
      setError("That trip does not belong to the driver user ID you filtered.");
      return;
    }
    setAssignSubmitting(true);
    try {
      const body = { trip_id: tid, scope, ...extra };
      if (
        scope === "ids" &&
        Array.isArray(body.cargo_ids) &&
        body.cargo_ids.length
      ) {
        body.cargo_ids = body.cargo_ids
          .map((x) => Number(x))
          .filter((n) => Number.isInteger(n) && n > 0);
        if (!body.cargo_ids.length) {
          setError("No valid cargo rows selected.");
          return;
        }
      }
      const res = await cargoService.bulkAssignTrip(body);
      const n = res?.affectedRows ?? 0;
      setNotice(res?.message || `Updated ${n} cargo row(s).`);
      setSelectedCargoIds([]);
      setAssignTripId("");
      await refreshCore();
      relationsView.run().catch(() => {});
    } catch (e) {
      setError(
        e?.data?.sqlMessage ||
          e?.data?.message ||
          e?.message ||
          "Bulk assign failed"
      );
    } finally {
      setAssignSubmitting(false);
      setConfirmAssignAllOpen(false);
    }
  }

  function openEdit(row) {
    setEditingId(row.id);
    setEditForm({
      owner_id: String(row.owner_id ?? ""),
      trip_id: String(row.trip_id ?? ""),
      weight: String(row.weight ?? ""),
      content: row.content ?? "",
      tracking_code: row.tracking_code ?? "",
      status: row.status ?? "pending",
      fee_override: false,
      fee: "",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({
      owner_id: "",
      trip_id: "",
      weight: "",
      content: "",
      tracking_code: "",
      status: "pending",
      fee_override: false,
      fee: "",
    });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (editingId == null) return;
    setNotice("");
    setError("");
    const {
      owner_id,
      trip_id,
      weight,
      content,
      tracking_code,
      status,
      fee_override,
      fee,
    } = editForm;
    if (!owner_id || !trip_id || weight === "" || !status) {
      setError("Owner, trip, weight, and status are required.");
      return;
    }
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setError("Weight must be a positive number.");
      return;
    }
    setSavingEdit(true);
    try {
      const body = {
        owner_id: Number(owner_id),
        trip_id: Number(trip_id),
        weight: w,
        content: content.trim() || null,
        tracking_code: tracking_code.trim() || null,
        status,
      };
      if (fee_override) {
        body.fee_override = true;
        body.fee = Number(fee);
        if (!Number.isFinite(body.fee) || body.fee < 0) {
          setError("Override fee must be a non-negative number.");
          setSavingEdit(false);
          return;
        }
      }
      await cargoService.update(editingId, body);
      setNotice("Cargo updated.");
      closeEdit();
      await refreshCore();
      relationsView.run().catch(() => {});
    } catch (e) {
      setError(
        e?.data?.sqlMessage || e?.data?.message || e?.message || "Update failed"
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    const cargoItem = cargo.find((c) => c.id === id);
    setDeleteModal({ isOpen: true, id, name: `Cargo #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);

    if (editingId === id) closeEdit();

    try {
      await cargoService.remove(id);
      setNotice("Cargo record deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refreshCore();
    } catch (err) {
      console.error("Delete cargo error:", err);
      let errorMessage = "Failed to delete cargo record.";

      if (err.status === 500) {
        errorMessage = "Server error occurred. The cargo record may have related data.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this cargo record.";
      } else if (err.status === 404) {
        errorMessage = "Cargo record not found. It may have already been deleted.";
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

  if (loading && !cargo.length && !trips.length) {
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
            This page shows all cargo.
          </h1>
          
        </div>
        <Button
          type="button"
          variant={addCargoOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddCargoOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addCargoOpen}
          aria-controls="admin-add-cargo-panel"
        >
          {addCargoOpen ? "Close form" : "Add cargo"}
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

      {addCargoOpen ? (
        <div id="admin-add-cargo-panel">
          <Card
            title="Create cargo"
            subtitle="Owner, trip, and weight are required. Fee is calculated automatically unless you override it (admin)."
          >
            <form
              onSubmit={handleCreateCargo}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Select
                label="Owner"
                name="cargo_owner"
                value={cOwnerId}
                onChange={(e) => setCOwnerId(e.target.value)}
                required
              >
                <option value="">Select owner…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {userOptionText(u)}
                  </option>
                ))}
              </Select>
              <Select
                label="Trip"
                name="cargo_trip"
                value={cTripId}
                onChange={(e) => setCTripId(e.target.value)}
                required
              >
                <option value="">Select trip…</option>
                {trips.map((t) => {
                  const label = tripSelectOptionText(t);
                  return (
                    <option key={t.id} value={t.id} title={label}>
                      {label}
                    </option>
                  );
                })}
              </Select>
              <Input
                label="Weight (kg)"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                name="cargo_weight"
                value={cWeight}
                onChange={(e) => setCWeight(e.target.value)}
                required
              />
              <Input
                label="Content (optional)"
                name="cargo_content"
                value={cContent}
                onChange={(e) => setCContent(e.target.value)}
              />
              <Input
                label="Tracking code (optional)"
                name="cargo_tracking"
                value={cTracking}
                onChange={(e) => setCTracking(e.target.value)}
              />
              <Select
                label="Status"
                name="cargo_status"
                value={cCargoStatus}
                onChange={(e) => setCCargoStatus(e.target.value)}
              >
                {CARGO_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <div className="flex flex-col gap-2 lg:col-span-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={cFeeOverride}
                    onChange={(e) => setCFeeOverride(e.target.checked)}
                    className="rounded border-slate-400 dark:border-slate-600"
                  />
                  Override fee on create (admin)
                </label>
                {cFeeOverride ? (
                  <Input
                    label="Custom fee (ETB)"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    name="cargo_fee"
                    value={cFee}
                    onChange={(e) => setCFee(e.target.value)}
                    required={cFeeOverride}
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap items-end gap-2 lg:col-span-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create cargo"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddCargoOpen(false);
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
        title="Assign cargo to a driver’s trip"
        subtitle="Optionally filter by driver, then choose a destination trip. Each option shows route, driver name, departure, vehicle plate, and trip status. Trips your checked cargo already belongs to disappear from the list so you only move shipments to a different trip."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Filter by driver (optional)"
            value={assignDriverFilter}
            onChange={(e) => setAssignDriverFilter(e.target.value)}
            className="min-w-0"
          >
            <option value="">All drivers</option>
            {driverUsersForAssign.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {userOptionText(d, "Driver")}
              </option>
            ))}
          </Select>
          <Select
            label="Destination trip (route · driver · departure · vehicle)"
            value={assignTripId}
            onChange={(e) => setAssignTripId(e.target.value)}
            className="min-w-0 lg:col-span-2"
          >
            <option value="">
              {tripsForAssign.length === 0
                ? "No trips for this driver — pick another driver or assign a driver on Admin Trips"
                : tripsForAssignDropdown.length === 0
                  ? selectedCargoIds.length
                    ? "No destination trips — checked cargo is already on every trip shown here (change selection or driver filter)"
                    : "No trips available — check driver filter or trips list"
                  : "Select a trip to assign cargo to…"}
            </option>
            {tripsForAssignDropdown.map((t) => {
              const label = tripSelectOptionText(t);
              return (
                <option key={t.id} value={String(t.id)} title={label}>
                  {label}
                </option>
              );
            })}
          </Select>
        </div>
        {selectedCargoIds.length > 0 &&
        tripsForAssign.length > 0 &&
        tripsForAssignDropdown.length < tripsForAssign.length ? (
          <p className="mt-1 text-xs text-slate-500">
            Hidden from the list: trips that already include at least one of the
            checked cargo rows (choose a different destination or uncheck rows).
          </p>
        ) : null}
        {assignTripReady && selectedAssignTrip ? (
          <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-400/90">
            {tripSelectOptionText(selectedAssignTrip)}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-500">
          {assignableTrips.length} trip{assignableTrips.length === 1 ? "" : "s"}{" "}
          with a driver · {pendingCargoCount} pending cargo ·{" "}
          {selectedCargoIds.length} selected in table
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={
              assignSubmitting ||
              !assignTripReady ||
              selectedCargoIds.length === 0
            }
            onClick={() =>
              runBulkAssign("ids", { cargo_ids: selectedCargoIds })
            }
          >
            Assign selected
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={assignSubmitting || !assignTripReady || pendingCargoCount === 0}
            onClick={() => runBulkAssign("pending")}
          >
            Assign all pending ({pendingCargoCount})
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="!text-red-700 dark:!text-red-300"
            disabled={assignSubmitting || !assignTripReady || cargo.length === 0}
            onClick={() => setConfirmAssignAllOpen(true)}
          >
            Assign every cargo row…
          </Button>
        </div>
      </Card>

      <Card
        title="All cargo"
        subtitle="Search and filter by status. Sort columns by clicking the table headers (▲/▼)."
      >
        <div className="mb-4 flex flex-col gap-4 border-b border-primary-200/90 pb-4 dark:border-primary-900/25 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="max-w-md min-w-[200px] flex-1">
            <Input
              label="Search"
              type="search"
              name="cargo_table_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Id, owner, trip, content, tracking, status…"
              autoComplete="off"
              className="w-full"
            />
          </div>
          <div className="min-w-[160px] sm:max-w-[200px]">
            <Select
              label="Status"
              name="cargo_filter_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              {CARGO_STATUSES.map((s) => (
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
            {cargo.length}
          </span>{" "}
          rows
          {search.trim() || filterStatus ? " (filtered)" : ""}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                <th
                  scope="col"
                  className="w-10 px-1 py-2.5 font-semibold text-slate-700 dark:text-primary-400/95"
                >
                  <input
                    type="checkbox"
                    className="rounded border-slate-400 dark:border-slate-600"
                    title="Select visible rows"
                    checked={
                      filteredSorted.length > 0 &&
                      filteredSorted.every((r) =>
                        selectedCargoIds.includes(r.id)
                      )
                    }
                    onChange={toggleSelectAllVisible}
                  />
                </th>
                {CARGO_SORT_KEYS.map(({ key, label }) => {
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
              {filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    {cargo.length === 0 ? (
                      <>No cargo — use Add cargo above to create one.</>
                    ) : (
                      <>
                        No rows match your search or status filter.{" "}
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
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSorted.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                        "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                      )}
                    >
                      <td className="px-1 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          className="rounded border-slate-400 dark:border-slate-600"
                          checked={selectedCargoIds.includes(row.id)}
                          onChange={() => toggleCargoSelect(row.id)}
                          aria-label={`Select cargo ${row.id}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {row.id}
                      </td>
                      <td className="max-w-[160px] truncate px-2 py-2.5 font-medium text-apptext dark:text-slate-100">
                        {userLabel(row.owner_id)}
                      </td>
                      <td className="max-w-[200px] truncate px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {tripLabel(row.trip_id)}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-slate-800 dark:text-slate-300">
                        {row.weight}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 tabular-nums text-slate-800 dark:text-slate-300">
                        {formatMoney(row.fee)}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-2.5 text-slate-700 dark:text-slate-400">
                        {row.content ?? "—"}
                      </td>
                      <td className="max-w-[100px] truncate px-2 py-2.5 text-slate-700 dark:text-slate-400">
                        {row.tracking_code ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {row.status}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit cargo"
                            onClick={() => openEdit(row)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete cargo"
                            onClick={() => handleRemove(row.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === row.id ? (
                      <tr className="border-b border-slate-100 bg-primary-50/90 dark:border-slate-800/60 dark:bg-primary-950/25">
                        <td colSpan={11} className="p-4">
                          <form
                            onSubmit={handleUpdate}
                            className="space-y-4"
                          >
                            <p className="text-xs font-medium text-slate-700 dark:text-primary-300">
                              Edit cargo #{row.id}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <Select
                                label="Owner"
                                value={editForm.owner_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    owner_id: e.target.value,
                                  }))
                                }
                                required
                              >
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {userOptionText(u)}
                                  </option>
                                ))}
                              </Select>
                              <Select
                                label="Trip"
                                value={editForm.trip_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    trip_id: e.target.value,
                                  }))
                                }
                                required
                              >
                                {trips.map((t) => {
                                  const label = tripSelectOptionText(t);
                                  return (
                                    <option key={t.id} value={t.id} title={label}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </Select>
                              <Input
                                label="Weight (kg)"
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0.01"
                                value={editForm.weight}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    weight: e.target.value,
                                  }))
                                }
                                required
                              />
                              <Input
                                label="Content"
                                value={editForm.content}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    content: e.target.value,
                                  }))
                                }
                                placeholder="optional"
                              />
                              <Input
                                label="Tracking code"
                                value={editForm.tracking_code}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    tracking_code: e.target.value,
                                  }))
                                }
                                placeholder="optional"
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
                                {CARGO_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                              <div className="flex flex-col gap-2 lg:col-span-2">
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={editForm.fee_override}
                                    onChange={(e) =>
                                      setEditForm((f) => ({
                                        ...f,
                                        fee_override: e.target.checked,
                                      }))
                                    }
                                    className="rounded border-slate-600"
                                  />
                                  Override fee on save
                                </label>
                                {editForm.fee_override ? (
                                  <Input
                                    label="Custom fee (ETB)"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={editForm.fee}
                                    onChange={(e) =>
                                      setEditForm((f) => ({
                                        ...f,
                                        fee: e.target.value,
                                      }))
                                    }
                                    required={editForm.fee_override}
                                  />
                                ) : null}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <IconButton
                                variant="primary"
                                label="Save"
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

      <Card
        title="Joined view (read-only)"
        subtitle="GET /api/views/cargo-relations — wider joins"
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

      <ConfirmModal
        isOpen={confirmAssignAllOpen}
        onClose={() => !assignSubmitting && setConfirmAssignAllOpen(false)}
        onConfirm={() =>
          runBulkAssign("all", { confirm: "ASSIGN_ALL" })
        }
        title="Assign all cargo to this trip?"
        message={`Every cargo record (${cargo.length} rows) will point to the selected trip. Drivers only see cargo on trips they are assigned to. This is meant for bulk reassignment — use with care.`}
        confirmText="Assign all"
        type="danger"
        loading={assignSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={confirmDelete}
        title="Delete Cargo Record"
        message={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone.`}
        itemName={deleteModal.name}
        loading={deleting}
      />
    </div>
  );
}
