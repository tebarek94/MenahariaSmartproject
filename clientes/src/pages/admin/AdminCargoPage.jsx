import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { cargoService } from "@/services/cargo.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { tripsService } from "@/services/trips.service.js";
import { viewsService } from "@/services/views.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { DataTable } from "@/ui/DataTable.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { formatDate, formatMoney } from "@/utils/format.js";

const CARGO_STATUSES = [
  "pending",
  "accepted",
  "in_transit",
  "delivered",
  "cancelled",
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Created" },
  { value: "id", label: "ID" },
  { value: "owner_id", label: "Owner" },
  { value: "trip_id", label: "Trip" },
  { value: "weight", label: "Weight (kg)" },
  { value: "fee", label: "Fee" },
  { value: "status", label: "Status" },
];

export function AdminCargoPage() {
  const relationsView = useAsync(() => viewsService.cargoRelations(100));

  const [cargo, setCargo] = useState([]);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [cOwnerId, setCOwnerId] = useState("");
  const [cTripId, setCTripId] = useState("");
  const [cWeight, setCWeight] = useState("");
  const [cContent, setCContent] = useState("");
  const [cTracking, setCTracking] = useState("");
  const [cStatus, setCStatus] = useState("pending");
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
      const [c, u, tr] = await Promise.all([
        cargoService.list(),
        adminUsersService.list(),
        tripsService.list(),
      ]);
      setCargo(Array.isArray(c) ? c : []);
      setUsers(Array.isArray(u) ? u : []);
      setTrips(Array.isArray(tr) ? tr : []);
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

  const tripLabel = useCallback(
    (tripId) => {
      const t = trips.find((x) => String(x.id) === String(tripId));
      return t
        ? `#${t.id} · ${formatDate(t.departure_time)}`
        : String(tripId ?? "—");
    },
    [trips]
  );

  const filteredSorted = useMemo(() => {
    let rows = [...cargo];
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
  }, [cargo, search, sortKey, sortDir, userLabel, tripLabel]);

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

  async function handleCreate(e) {
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
    setSubmitting(true);
    try {
      const body = {
        owner_id: Number(cOwnerId),
        trip_id: Number(cTripId),
        weight: w,
        status: cStatus,
      };
      const ct = cContent.trim();
      if (ct) body.content = ct;
      const tr = cTracking.trim();
      if (tr) body.tracking_code = tr;
      if (cFeeOverride) {
        body.fee_override = true;
        body.fee = Number(cFee);
        if (!Number.isFinite(body.fee) || body.fee < 0) {
          setError("Override fee must be a non-negative number.");
          setSubmitting(false);
          return;
        }
      }
      await cargoService.create(body);
      setNotice("Cargo created.");
      setCWeight("");
      setCContent("");
      setCTracking("");
      setCFeeOverride(false);
      setCFee("");
      await refreshCore();
      relationsView.run().catch(() => {});
    } catch (e) {
      setError(
        e?.data?.sqlMessage || e?.data?.message || e?.message || "Create failed"
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
    if (!window.confirm("Delete this cargo record?")) return;
    setError("");
    setNotice("");
    if (editingId === id) closeEdit();
    try {
      await cargoService.remove(id);
      setNotice("Cargo deleted.");
      await refreshCore();
      relationsView.run().catch(() => {});
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  if (loading && !cargo.length && !trips.length) {
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
        title="Create cargo"
        subtitle="Owner, trip, weight — optional content, tracking, fee override"
      >
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Select
            label="Owner (user)"
            value={cOwnerId}
            onChange={(e) => setCOwnerId(e.target.value)}
            required
          >
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} · {u.phone}
              </option>
            ))}
          </Select>
          <Select
            label="Trip"
            value={cTripId}
            onChange={(e) => setCTripId(e.target.value)}
            required
          >
            <option value="">Select trip…</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} · vehicle {t.vehicle_id}
                {formatDate(t.departure_time)}
              </option>
            ))}
          </Select>
          <Input
            label="Weight (kg)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={cWeight}
            onChange={(e) => setCWeight(e.target.value)}
            required
          />
          <Input
            label="Content (optional)"
            value={cContent}
            onChange={(e) => setCContent(e.target.value)}
            placeholder="Brief description"
          />
          <Input
            label="Tracking code (optional)"
            value={cTracking}
            onChange={(e) => setCTracking(e.target.value)}
          />
          <Select
            label="Status"
            value={cStatus}
            onChange={(e) => setCStatus(e.target.value)}
          >
            {CARGO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={cFeeOverride}
                onChange={(e) => setCFeeOverride(e.target.checked)}
                className="rounded border-slate-600"
              />
              Override fee (admin)
            </label>
            {cFeeOverride ? (
              <Input
                label="Custom fee (ETB)"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={cFee}
                onChange={(e) => setCFee(e.target.value)}
                required={cFeeOverride}
              />
            ) : null}
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create cargo"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="All cargo">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, owner, trip, content, tracking, status…"
            />
          </div>
          <Select
            label="Sort by"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="min-w-[160px]"
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
            <option value="desc">Newest / high → low</option>
            <option value="asc">Oldest / low → high</option>
          </Select>
          <Button variant="ghost" className="!text-xs" onClick={() => refreshCore()}>
            Refresh list
          </Button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Showing {filteredSorted.length} of {cargo.length} loaded
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2 font-semibold">Id</th>
                <th className="px-2 py-2 font-semibold">Owner</th>
                <th className="px-2 py-2 font-semibold">Trip</th>
                <th className="px-2 py-2 font-semibold">Weight</th>
                <th className="px-2 py-2 font-semibold">Fee</th>
                <th className="px-2 py-2 font-semibold">Content</th>
                <th className="px-2 py-2 font-semibold">Tracking</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Created</th>
                <th className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    {cargo.length === 0
                      ? "No cargo"
                      : "No rows match your search"}
                  </td>
                </tr>
              ) : (
                filteredSorted.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="bg-slate-950/30 hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs text-slate-400">
                        {row.id}
                      </td>
                      <td className="max-w-[160px] truncate px-2 py-2 text-slate-200">
                        {userLabel(row.owner_id)}
                      </td>
                      <td className="max-w-[200px] truncate px-2 py-2 text-slate-400">
                        {tripLabel(row.trip_id)}
                      </td>
                      <td className="px-2 py-2 text-slate-300">{row.weight}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-300">
                        {formatMoney(row.fee)}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-2 text-slate-500">
                        {row.content ?? "—"}
                      </td>
                      <td className="max-w-[100px] truncate px-2 py-2 text-slate-500">
                        {row.tracking_code ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-300">{row.status}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-2 py-2">
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
                      <tr className="bg-primary-950/20">
                        <td colSpan={10} className="p-4">
                          <form
                            onSubmit={handleUpdate}
                            className="space-y-4"
                          >
                            <p className="text-xs font-medium text-primary-300">
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
                                    {u.full_name} (#{u.id})
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
                                {trips.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    #{t.id} · v{t.vehicle_id}
                                  </option>
                                ))}
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
    </div>
  );
}
