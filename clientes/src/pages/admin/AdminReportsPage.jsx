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
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { formatDate } from "@/utils/format.js";
import { cn } from "@/utils/cn.js";

const REPORT_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "type", label: "Type" },
  { key: "summary", label: "Summary" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "date_range", label: "Range" },
  { key: "file_path", label: "File" },
  { key: "created_at", label: "When" },
];

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

export function AdminReportsPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [addReportOpen, setAddReportOpen] = useState(false);
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
      const [rep, u, rl] = await Promise.all([
        reportsService.list({}),
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
  }, []);

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
    const st = filterStatus.trim().toLowerCase();
    const src = filterSource.trim().toLowerCase();
    if (st) {
      list = list.filter((r) => String(r?.status ?? "").toLowerCase() === st);
    }
    if (src) {
      list = list.filter((r) => String(r?.source ?? "").toLowerCase() === src);
    }
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
  }, [rows, search, filterStatus, filterSource, sortKey, sortDir]);

  function handleColumnSort(k) {
    if (!k) return;
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(k);
    setSortDir("asc");
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
      setAddReportOpen(false);
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
    setDeleteModal({ isOpen: true, id, name: `Report #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    if (editingId === id) closeEdit();
    try {
      await reportsService.remove(id);
      setNotice("Report deleted.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          "Delete failed"
      );
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters =
    Boolean(search.trim()) || Boolean(filterStatus) || Boolean(filterSource);

  if (loading && !rows.length && !users.length) {
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
            Reports
          </h1>
          <p className="text-p-muted max-w-xl text-sm sm:text-[0.95rem]">
            Activity log and manual report rows. Use{" "}
            <strong className="font-semibold text-p-heading">Add report</strong> to open the
            form. Rows with source “auto” are created from registrations, admin actions, or
            trips / tickets / cargo. Run DB migration 005 if inserts fail.
          </p>
        </div>
        <Button
          type="button"
          variant={addReportOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddReportOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addReportOpen}
          aria-controls="admin-add-report-panel"
        >
          {addReportOpen ? "Close form" : "Add report"}
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

      {addReportOpen ? (
        <div id="admin-add-report-panel">
          <Card
            title="Create manual report row"
            subtitle="All fields are optional; empty rows still record manual source and active status."
          >
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Input
                label="Type (optional)"
                name="report_create_type"
                value={cType}
                onChange={(e) => setCType(e.target.value)}
                placeholder="e.g. revenue"
              />
              <Input
                label="Date range (optional)"
                name="report_create_range"
                value={cRange}
                onChange={(e) => setCRange(e.target.value)}
                placeholder="e.g. 2026-03"
              />
              <Input
                label="File path (optional)"
                name="report_create_path"
                value={cPath}
                onChange={(e) => setCPath(e.target.value)}
              />
              <Input
                label="Summary (optional)"
                name="report_create_summary"
                value={cSummary}
                onChange={(e) => setCSummary(e.target.value)}
                className="sm:col-span-2 lg:col-span-3"
                placeholder="Short description for this report row"
              />
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create report"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddReportOpen(false);
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
        title="All reports"
        subtitle="Search and filter. Sort columns by clicking the table headers (▲/▼)."
      >
        <div className="mb-4 flex flex-col gap-4 border-b border-primary-200/90 pb-4 dark:border-primary-900/25 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="max-w-md min-w-[200px] flex-1">
            <Input
              label="Search"
              type="search"
              name="reports_table_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, type, summary, source, status, file…"
              autoComplete="off"
              className="w-full"
            />
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:max-w-md">
            <Select
              label="Status"
              name="reports_filter_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
            <Select
              label="Source"
              name="reports_filter_source"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full"
            >
              <option value="">All sources</option>
              <option value="manual">Manual</option>
              <option value="auto">Auto (tasks)</option>
            </Select>
          </div>
        </div>
        <p className="mb-2 text-xs text-slate-600 dark:text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-300">
            {filteredSortedRows.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-300">
            {rows.length}
          </span>{" "}
          reports
          {hasActiveFilters ? " (filtered)" : ""}
        </p>

        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                {REPORT_SORT_KEYS.map(({ key, label }) => {
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
                    colSpan={9}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No reports — use Add report above to create one.
                  </td>
                </tr>
              ) : filteredSortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No reports match your search or filters.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("");
                        setFilterSource("");
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSortedRows.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                        "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {r.id}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2.5 text-slate-800 dark:text-slate-200">
                        {r.type ?? "—"}
                      </td>
                      <td
                        className="max-w-[220px] truncate px-2 py-2.5 text-slate-700 dark:text-slate-300"
                        title={r.summary ?? ""}
                      >
                        {r.summary ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {r.source ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {r.status ?? "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2.5 text-slate-600 dark:text-slate-400">
                        {r.date_range ?? "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2.5 text-slate-600 dark:text-slate-400">
                        {r.file_path ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-2 py-2.5">
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
                        <td colSpan={9} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <Input
                                label="Type"
                                name="report_edit_type"
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
                                name="report_edit_range"
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
                                name="report_edit_path"
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
                                name="report_edit_source"
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
                                name="report_edit_status"
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
                                name="report_edit_summary"
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

      <Card
        title="Active registered users"
        subtitle={`Accounts with status “active” (${activeUsers.length} of ${users.length} loaded). Same list as Users admin; shown here for reporting context.`}
      >
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95">
              <tr>
                <th scope="col" className="px-2 py-2.5 font-semibold">
                  Id
                </th>
                <th scope="col" className="px-2 py-2.5 font-semibold">
                  Name
                </th>
                <th scope="col" className="px-2 py-2.5 font-semibold">
                  Phone
                </th>
                <th scope="col" className="px-2 py-2.5 font-semibold">
                  Email
                </th>
                <th scope="col" className="px-2 py-2.5 font-semibold">
                  Role
                </th>
                <th scope="col" className="px-2 py-2.5 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-2 py-2.5 font-semibold">
                  Registered
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {activeUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No active users in the loaded list
                  </td>
                </tr>
              ) : (
                activeUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={cn(
                      "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                      "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                    )}
                  >
                    <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                      {u.id}
                    </td>
                    <td className="max-w-[160px] truncate px-2 py-2.5 text-slate-800 dark:text-slate-200">
                      {u.full_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-slate-600 dark:text-slate-400">
                      {u.phone ?? "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-2 py-2.5 text-slate-600 dark:text-slate-400">
                      {u.email ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 text-slate-700 dark:text-slate-300">
                      {roleName(u.role_id)}
                    </td>
                    <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                      {u.status ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })
        }
        onConfirm={confirmDelete}
        title="Delete report"
        message={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone.`}
        itemName={deleteModal.name}
        loading={deleting}
      />
    </div>
  );
}
