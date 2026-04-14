import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { reportsService } from "@/services/reports.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { rolesService } from "@/services/roles.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { formatDate } from "@/utils/format.js";

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

const SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "type", label: "Type" },
  { value: "summary", label: "Summary" },
  { value: "source", label: "Source" },
  { value: "status", label: "Status" },
  { value: "date_range", label: "Range" },
  { value: "file_path", label: "File" },
  { value: "created_at", label: "When" },
];

const HEADER_SORT_KEYS = {
  Id: "id",
  Type: "type",
  Summary: "summary",
  Source: "source",
  Status: "status",
  Range: "date_range",
  File: "file_path",
  When: "created_at",
};

export function AdminReportsPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [cType, setCType] = useState("");
  const [cRange, setCRange] = useState("");
  const [cPath, setCPath] = useState("");
  const [cSummary, setCSummary] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    type: "",
    date_range: "",
    file_path: "",
    source: "manual",
    status: "active",
    summary: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filterStatus.trim()) params.status = filterStatus.trim();
      if (filterSource.trim()) params.source = filterSource.trim();
      const [rep, u, rl] = await Promise.all([
        reportsService.list(params),
        adminUsersService.list(),
        rolesService.list(),
      ]);
      setRows(normalizeList(rep));
      setUsers(normalizeList(u));
      setRoles(normalizeList(rl));
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSource]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const roleName = useCallback(
    (roleId) => {
      const r = roles.find((x) => String(x.id) === String(roleId));
      return r?.name ?? String(roleId ?? "—");
    },
    [roles]
  );

  const activeUsers = useMemo(
    () =>
      users.filter(
        (u) => String(u.status ?? "active").trim().toLowerCase() === "active"
      ),
    [users]
  );

  const filteredSortedRows = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const parts = [
          r?.id,
          r?.type,
          r?.summary,
          r?.source,
          r?.status,
          r?.date_range,
          r?.file_path,
          r?.created_at,
        ]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return parts.some((s) => s.includes(q));
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let va = a?.[sortKey];
      let vb = b?.[sortKey];
      if (sortKey === "id") {
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

  function openEdit(x) {
    setEditingId(x.id);
    setEditForm({
      type: x.type ?? "",
      date_range: x.date_range ?? "",
      file_path: x.file_path ?? "",
      source: x.source ?? "manual",
      status: x.status ?? "active",
      summary: x.summary ?? "",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({
      type: "",
      date_range: "",
      file_path: "",
      source: "manual",
      status: "active",
      summary: "",
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    setSubmitting(true);
    try {
      const body = {
        source: "manual",
        status: "active",
      };
      if (cType.trim()) body.type = cType.trim();
      if (cRange.trim()) body.date_range = cRange.trim();
      if (cPath.trim()) body.file_path = cPath.trim();
      if (cSummary.trim()) body.summary = cSummary.trim();
      await reportsService.create(body);
      setNotice("Report created.");
      setCType("");
      setCRange("");
      setCPath("");
      setCSummary("");
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
    setSavingEdit(true);
    try {
      await reportsService.update(editingId, {
        type: editForm.type.trim() || null,
        date_range: editForm.date_range.trim() || null,
        file_path: editForm.file_path.trim() || null,
        source: editForm.source || "manual",
        status: editForm.status || "active",
        summary: editForm.summary.trim() || null,
      });
      setNotice("Report updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Delete this report?")) return;
    setError("");
    setNotice("");
    if (editingId === id) closeEdit();
    try {
      await reportsService.remove(id);
      setNotice("Deleted.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  if (loading && !rows.length && !users.length) {
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
        title="Active registered users"
        subtitle={`Accounts with status “active” (${activeUsers.length} of ${users.length} loaded). Same list as Users admin; shown here for reporting context.`}
      >
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2">Id</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Phone</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {activeUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No active users in the loaded list
                  </td>
                </tr>
              ) : (
                activeUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="px-2 py-2 font-mono text-xs text-slate-400">
                      {u.id}
                    </td>
                    <td className="max-w-[160px] truncate px-2 py-2 text-slate-200">
                      {u.full_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-400">
                      {u.phone ?? "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-2 py-2 text-slate-500">
                      {u.email ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-400">
                      {roleName(u.role_id)}
                    </td>
                    <td className="px-2 py-2 text-slate-300">{u.status ?? "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Activity & report log"
        subtitle="Rows with source “auto” are created when users register, admins create users, or trips / tickets / cargo are created. Run DB migration 005 if inserts fail."
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ID, type, summary, source, status, file..."
            className="min-w-[220px] sm:flex-1"
          />
          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="min-w-[140px]"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
          <Select
            label="Source"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="min-w-[140px]"
          >
            <option value="">All sources</option>
            <option value="manual">Manual</option>
            <option value="auto">Auto (tasks)</option>
          </Select>
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
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </Select>
          <Button
            variant="ghost"
            className="!text-xs"
            onClick={() => {
              setSearch("");
              setSortKey("created_at");
              setSortDir("desc");
            }}
          >
            Clear
          </Button>
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Showing {filteredSortedRows.length} of {rows.length}
        </p>

        <div className="mt-2 border-t border-primary-900/25 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">
            Create manual report row
          </h3>
          <form
            onSubmit={handleCreate}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Input
              label="Type (optional)"
              value={cType}
              onChange={(e) => setCType(e.target.value)}
              placeholder="e.g. revenue"
            />
            <Input
              label="Date range (optional)"
              value={cRange}
              onChange={(e) => setCRange(e.target.value)}
              placeholder="e.g. 2026-03"
            />
            <Input
              label="File path (optional)"
              value={cPath}
              onChange={(e) => setCPath(e.target.value)}
            />
            <Input
              label="Summary (optional)"
              value={cSummary}
              onChange={(e) => setCSummary(e.target.value)}
              className="sm:col-span-2 lg:col-span-3"
              placeholder="Short description for this report row"
            />
            <div className="flex items-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                {["Id", "Type", "Summary", "Source", "Status", "Range", "File", "When"].map(
                  (label) => {
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
                  }
                )}
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No reports match your filters
                  </td>
                </tr>
              ) : filteredSortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No rows match your search
                  </td>
                </tr>
              ) : (
                filteredSortedRows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                      <td className="max-w-[120px] truncate px-2 py-2 text-slate-300">
                        {r.type ?? "—"}
                      </td>
                      <td className="max-w-[220px] truncate px-2 py-2 text-slate-400" title={r.summary ?? ""}>
                        {r.summary ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-400">{r.source ?? "—"}</td>
                      <td className="px-2 py-2 text-slate-300">{r.status ?? "—"}</td>
                      <td className="max-w-[120px] truncate px-2 py-2 text-slate-500">
                        {r.date_range ?? "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2 text-slate-500">
                        {r.file_path ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(r.created_at)}
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
                        <td colSpan={9} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <Input
                                label="Type"
                                value={editForm.type}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    type: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                label="Date range"
                                value={editForm.date_range}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    date_range: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                label="File path"
                                value={editForm.file_path}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    file_path: e.target.value,
                                  }))
                                }
                              />
                              <Select
                                label="Source"
                                value={editForm.source}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    source: e.target.value,
                                  }))
                                }
                              >
                                <option value="manual">manual</option>
                                <option value="auto">auto</option>
                              </Select>
                              <Select
                                label="Status"
                                value={editForm.status}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    status: e.target.value,
                                  }))
                                }
                              >
                                <option value="active">active</option>
                                <option value="archived">archived</option>
                              </Select>
                              <Input
                                label="Summary"
                                value={editForm.summary}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    summary: e.target.value,
                                  }))
                                }
                                className="lg:col-span-2"
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
    </div>
  );
}
