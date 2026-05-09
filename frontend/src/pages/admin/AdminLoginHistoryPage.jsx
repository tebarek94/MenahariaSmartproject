import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { loginHistoryService } from "@/services/loginHistory.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { formatDate } from "@/utils/format.js";
import { cn } from "@/utils/cn.js";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { ROUTES } from "@/utils/constants.js";
import {
  isAuditLoginHistoryRow,
  parseAuditLine,
} from "@/utils/loginHistoryRow.js";

function isAuditRow(row) {
  return isAuditLoginHistoryRow(row);
}

function AuditActivityBadge({ activity }) {
  const a = String(activity || "—");
  const map = {
    Create:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    Update: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
    Delete: "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
    Write:
      "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  };
  const cls =
    map[a] ||
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide",
        cls,
      )}
    >
      {a}
    </span>
  );
}

export function AdminLoginHistoryPage() {
  const { pathname } = useLocation();
  const pathNorm = (pathname || "").replace(/\/+$/, "") || "/";
  const auditOnly =
    pathNorm === ROUTES.ADMIN_AUDIT_LOG ||
    pathNorm.endsWith("/admin/audit-log");

  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [filterEvent, setFilterEvent] = useState(() =>
    auditOnly ? "admin" : "all",
  );

  useEffect(() => {
    setFilterEvent(auditOnly ? "admin" : "all");
  }, [auditOnly]);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    user_id: "",
    device_info: "",
    ip_address: "",
  });

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
    let filtered = [...rows];

    if (searchTerm) {
      filtered = filtered.filter(
        (row) =>
          (row.device_info &&
            row.device_info.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (row.ip_address && row.ip_address.includes(searchTerm)) ||
          (row.user_id && row.user_id.toString().includes(searchTerm)),
      );
    }

    if (filterUser) {
      const uid = Number(filterUser);
      filtered = filtered.filter(
        (row) => row.user_id != null && Number(row.user_id) === uid,
      );
    }

    if (filterDateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (filterDateRange) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }

      if (filterDateRange !== "all") {
        filtered = filtered.filter((row) => {
          const loginDate = new Date(row.login_time);
          if (Number.isNaN(loginDate.getTime())) return true;
          return loginDate >= filterDate;
        });
      }
    }

    if (filterEvent === "login") {
      filtered = filtered.filter((row) => !isAuditRow(row));
    } else if (filterEvent === "admin") {
      filtered = filtered.filter((row) => isAuditRow(row));
    }

    setFilteredRows(filtered);
  }, [rows, searchTerm, filterUser, filterDateRange, filterEvent]);

  const refresh = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const [list, userList] = await Promise.all([
        loginHistoryService.list(),
        adminUsersService.list(),
      ]);
      setRows(list);
      setUsers(userList);
    } catch (e) {
      if (!silent) {
        setError(e?.message || "Failed to load");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh({ silent: true });
      }
    }, 20_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  function openEdit(x) {
    setEditingId(x.id);
    setEditForm({
      user_id: x.user_id != null ? String(x.user_id) : "",
      device_info: x.device_info ?? "",
      ip_address: x.ip_address ?? "",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({ user_id: "", device_info: "", ip_address: "" });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (editingId == null) return;
    setNotice("");
    setError("");
    setSavingEdit(true);
    try {
      await loginHistoryService.update(editingId, {
        user_id: editForm.user_id ? Number(editForm.user_id) : null,
        device_info: editForm.device_info.trim() || null,
        ip_address: editForm.ip_address.trim() || null,
      });
      setNotice("Record updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    setDeleteModal({ isOpen: true, id });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    if (editingId === id) closeEdit();
    setDeleting(true);
    try {
      await loginHistoryService.remove(id);
      setNotice("Record deleted.");
      setDeleteModal({ isOpen: false, id: null });
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => Number(u.id) === Number(userId));
    return user ? user.full_name : `User #${userId}`;
  };

  if (loading && !rows.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const colSpan = 7;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
          {auditOnly ? "Audit log" : "Login & activity"}
        </h1>
        <p className="text-p-muted max-w-2xl text-sm sm:text-[0.95rem]">
          {auditOnly ? (
            <>
              Successful{" "}
              <strong className="font-semibold text-p-heading">
                admin-only API writes
              </strong>{" "}
              (POST, PUT, PATCH, DELETE) are logged with an{" "}
              <strong className="font-semibold text-p-heading">AUDIT</strong>{" "}
              line.{" "}
              <Link
                className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                to={ROUTES.ADMIN_LOGIN_HISTORY}
              >
                Open login &amp; full activity
              </Link>{" "}
              to include sign-ins.
            </>
          ) : (
            <>
              Sign-ins are stored when anyone logs in. Successful{" "}
              <strong className="font-semibold text-p-heading">
                admin API actions
              </strong>{" "}
              are appended with an{" "}
              <strong className="font-semibold text-p-heading">AUDIT</strong>{" "}
              prefix.{" "}
              <Link
                className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                to={ROUTES.ADMIN_AUDIT_LOG}
              >
                Audit log only
              </Link>
              . Refreshes on load, every 20s while this tab is visible, and when
              you return here.
            </>
          )}
        </p>
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

      <Card
        title="Search & filter"
        subtitle={
          auditOnly
            ? "Admin actions only. Filter by admin user, time, IP, or AUDIT path text."
            : "Narrow by event type, user, time, device/UA, IP, or AUDIT action text."
        }
      >
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            auditOnly
              ? "md:grid-cols-2 lg:grid-cols-4"
              : "md:grid-cols-2 lg:grid-cols-5",
          )}
        >
          {!auditOnly ? (
            <Select
              label="Event type"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
            >
              <option value="all">All events</option>
              <option value="login">Sign-in only</option>
              <option value="admin">Admin actions only</option>
            </Select>
          ) : null}

          <Input
            label="Search"
            placeholder="IP, user id, AUDIT path…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            label="Admin user"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">All admins</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </Select>

          <Select
            label="Date range"
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </Select>

          <div className="flex items-end">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterUser("");
                setFilterDateRange("all");
                setFilterEvent(auditOnly ? "admin" : "all");
              }}
              className="w-full"
            >
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={auditOnly ? "Admin actions" : "Activity log"}
        subtitle={
          auditOnly
            ? "Each row is one successful mutating API call by an administrator. Edit or delete only for corrections."
            : "Rows are created automatically at sign-in and when an admin change succeeds. Edit or delete only for corrections."
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {auditOnly ? (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-300">
                  {filteredRows.length}
                </span>{" "}
                audit {filteredRows.length === 1 ? "event" : "events"}
                <span className="text-slate-500 dark:text-slate-500">
                  {" "}
                  ({rows.filter(isAuditRow).length} total AUDIT rows in store)
                </span>
              </>
            ) : (
              <>
                Showing {filteredRows.length} of {rows.length} records
              </>
            )}
          </div>
          <Button
            variant="ghost"
            className="!text-xs"
            type="button"
            onClick={() => refresh()}
          >
            Refresh now
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table
            className={cn(
              "w-full border-collapse text-left text-sm",
              auditOnly ? "min-w-[880px]" : "min-w-[800px]",
            )}
          >
            <thead className="border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                <th className="px-4 py-2.5 font-semibold">ID</th>
                {!auditOnly ? (
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                ) : (
                  <th className="px-4 py-2.5 font-semibold">Activity</th>
                )}
                <th className="px-4 py-2.5 font-semibold">
                  {auditOnly ? "Admin" : "User"}
                </th>
                <th className="px-4 py-2.5 font-semibold">
                  {auditOnly ? "Request" : "Details"}
                </th>
                <th className="px-4 py-2.5 font-semibold">IP</th>
                <th className="px-4 py-2.5 font-semibold">Time</th>
                <th className="px-4 py-2.5 text-center font-semibold text-slate-700 dark:text-primary-400/95">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="bg-white px-4 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    <div className="space-y-2">
                      <p className="text-base font-medium text-slate-800 dark:text-slate-200">
                        No records match your filters
                      </p>
                      <p className="text-sm">
                        Clear filters or wait for new sign-ins or admin actions.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const parsed = isAuditRow(r)
                    ? parseAuditLine(r.device_info)
                    : null;
                  const requestLine =
                    parsed && (parsed.method || parsed.path)
                      ? `${parsed.method || ""} ${parsed.path || ""}`.trim()
                      : null;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className={cn(
                          "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                          "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35",
                        )}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-primary-300">
                          #{r.id}
                        </td>
                        {!auditOnly ? (
                          <td className="whitespace-nowrap px-4 py-2.5">
                            {isAuditRow(r) ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Login
                              </span>
                            )}
                          </td>
                        ) : (
                          <td className="whitespace-nowrap px-4 py-2.5">
                            {parsed?.activity ? (
                              <AuditActivityBadge activity={parsed.activity} />
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2.5">
                          {r.user_id ? (
                            <div className="flex items-center space-x-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-500/20">
                                <span className="text-xs font-medium text-primary-800 dark:text-primary-300">
                                  {getUserName(r.user_id)
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-apptext dark:text-slate-100">
                                {getUserName(r.user_id)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-500">
                              —
                            </span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "max-w-[min(28rem,55vw)] truncate px-4 py-2.5",
                            auditOnly
                              ? "font-mono text-xs text-slate-800 dark:text-slate-300"
                              : "text-slate-800 dark:text-slate-300",
                          )}
                          title={r.device_info || undefined}
                        >
                          {auditOnly
                            ? requestLine || r.device_info || "—"
                            : r.device_info || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {r.ip_address || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                          {formatDate(r.login_time)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-center gap-1">
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
                          <td colSpan={colSpan} className="p-4">
                            <form onSubmit={handleUpdate} className="space-y-4">
                              <div className="grid gap-4 sm:grid-cols-3">
                                <Select
                                  label="User"
                                  value={editForm.user_id}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      user_id: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">—</option>
                                  {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.full_name} (#{u.id})
                                    </option>
                                  ))}
                                </Select>
                                <Input
                                  label="Details (browser UA or AUDIT line)"
                                  value={editForm.device_info}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      device_info: e.target.value,
                                    }))
                                  }
                                  placeholder="User-Agent or AUDIT …"
                                />
                                <Input
                                  label="IP Address"
                                  value={editForm.ip_address}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      ip_address: e.target.value,
                                    }))
                                  }
                                  placeholder="IP address"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete activity row"
        message="Remove this row from the log? Sign-ins and admin actions can be logged again later."
        itemName="Activity row"
        loading={deleting}
      />
    </div>
  );
}
