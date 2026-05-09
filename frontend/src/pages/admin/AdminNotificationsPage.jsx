import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { notificationsService } from "@/services/notifications.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
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

const CHANNELS = ["sms", "email", "push"];
const STATUSES = ["pending", "sent", "failed"];

const NOTIFICATION_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "user_id", label: "User" },
  { key: "message", label: "Message" },
  { key: "channel", label: "Channel" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
];

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

export function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [addNotificationOpen, setAddNotificationOpen] = useState(false);
  const [cUser, setCUser] = useState("");
  const [cMsg, setCMsg] = useState("");
  const [cChannel, setCChannel] = useState("sms");
  const [cStatus, setCStatus] = useState("pending");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    user_id: "",
    message: "",
    channel: "sms",
    status: "pending",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [n, u] = await Promise.all([
        notificationsService.list(),
        adminUsersService.list(),
      ]);
      setNotifications(normalizeList(n));
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

  const userLabel = useCallback(
    (userId) => {
      if (userId == null || userId === "") return "Broadcast";
      const u = users.find((x) => String(x.id) === String(userId));
      return u
        ? `${String(u.full_name ?? "").trim() || "User"} (#${u.id})`
        : `User #${userId}`;
    },
    [users]
  );

  const filteredSorted = useMemo(() => {
    let rows = [...notifications];
    const ch = filterChannel.trim().toLowerCase();
    const st = filterStatus.trim().toLowerCase();
    if (ch) {
      rows = rows.filter(
        (n) => String(n?.channel ?? "").toLowerCase() === ch
      );
    }
    if (st) {
      rows = rows.filter(
        (n) => String(n?.status ?? "").toLowerCase() === st
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((n) => {
        const pack = [
          n?.id,
          n?.user_id,
          n?.message,
          n?.channel,
          n?.status,
          n?.created_at,
          userLabel(n?.user_id),
        ]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return pack.some((s) => s.includes(q));
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const key = sortKey;
    rows.sort((a, b) => {
      let va = a?.[key];
      let vb = b?.[key];
      if (key === "created_at") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else if (["id", "user_id"].includes(key)) {
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
    return rows;
  }, [
    notifications,
    search,
    filterChannel,
    filterStatus,
    sortKey,
    sortDir,
    userLabel,
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

  function openEdit(x) {
    setEditingId(x.id);
    setEditForm({
      user_id: x.user_id != null ? String(x.user_id) : "",
      message: x.message ?? "",
      channel: x.channel ?? "sms",
      status: x.status ?? "pending",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({
      user_id: "",
      message: "",
      channel: "sms",
      status: "pending",
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (!cMsg.trim()) {
      setError("Message is required.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        message: cMsg.trim(),
        channel: cChannel,
        status: cStatus,
      };
      if (cUser) body.user_id = Number(cUser);
      await notificationsService.create(body);
      setNotice("Notification created.");
      setCUser("");
      setCMsg("");
      setCChannel("sms");
      setCStatus("pending");
      setAddNotificationOpen(false);
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
    const { message, channel, status, user_id } = editForm;
    if (!message.trim() || !channel || !status) {
      setError("Message, channel, and status are required.");
      return;
    }
    setSavingEdit(true);
    try {
      await notificationsService.update(editingId, {
        user_id: user_id ? Number(user_id) : null,
        message: message.trim(),
        channel,
        status,
      });
      setNotice("Notification updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    setDeleteModal({ isOpen: true, id, name: `Notification #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    if (editingId === id) closeEdit();
    
    try {
      await notificationsService.remove(id);
      setNotice("Notification deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      console.error("Delete notification error:", err);
      let errorMessage = "Failed to delete notification.";
      
      if (err.status === 500) {
        errorMessage = "Server error occurred. The notification may have associated user deliveries.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this notification.";
      } else if (err.status === 404) {
        errorMessage = "Notification not found. It may have already been deleted.";
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

  if (loading && !notifications.length) {
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
            Notifications
          </h1>
          <p className="text-p-muted max-w-xl text-sm sm:text-[0.95rem]">
            Send SMS, email, or push records. Use{" "}
            <strong className="font-semibold text-p-heading">Add notification</strong> to open
            the form. Leave user empty for a broadcast-style row (no specific recipient).
          </p>
        </div>
        <Button
          type="button"
          variant={addNotificationOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddNotificationOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addNotificationOpen}
          aria-controls="admin-add-notification-panel"
        >
          {addNotificationOpen ? "Close form" : "Add notification"}
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

      {addNotificationOpen ? (
        <div id="admin-add-notification-panel">
          <Card
            title="Create notification"
            subtitle="Message is required. Optional user targets one account; otherwise use broadcast."
          >
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Select
                label="User (optional)"
                name="notif_user"
                value={cUser}
                onChange={(e) => setCUser(e.target.value)}
              >
                <option value="">Broadcast (no user)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} (#{u.id})
                  </option>
                ))}
              </Select>
              <Input
                label="Message"
                name="notif_message"
                value={cMsg}
                onChange={(e) => setCMsg(e.target.value)}
                required
              />
              <Select
                label="Channel"
                name="notif_channel"
                value={cChannel}
                onChange={(e) => setCChannel(e.target.value)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Select
                label="Status"
                name="notif_status"
                value={cStatus}
                onChange={(e) => setCStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create notification"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddNotificationOpen(false);
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
        title="All notifications"
        subtitle="Search and filter. Sort columns by clicking the table headers (▲/▼)."
      >
        <div className="mb-4 flex flex-col gap-4 border-b border-primary-200/90 pb-4 dark:border-primary-900/25 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="max-w-md min-w-[200px] flex-1">
            <Input
              label="Search"
              type="search"
              name="notifications_table_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Id, user, message, channel, status…"
              autoComplete="off"
              className="w-full"
            />
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:max-w-md">
            <Select
              label="Channel"
              name="notif_filter_channel"
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="w-full"
            >
              <option value="">All channels</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              label="Status"
              name="notif_filter_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
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
            {notifications.length}
          </span>{" "}
          notifications
          {search.trim() || filterChannel || filterStatus ? " (filtered)" : ""}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                {NOTIFICATION_SORT_KEYS.map(({ key, label }) => {
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
              {notifications.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No notifications — use Add notification above to create one.
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No notifications match your search or filters.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      onClick={() => {
                        setSearch("");
                        setFilterChannel("");
                        setFilterStatus("");
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSorted.map((n) => (
                  <Fragment key={n.id}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                        "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {n.id}
                      </td>
                      <td className="max-w-[160px] truncate px-2 py-2.5 text-slate-800 dark:text-slate-200">
                        {userLabel(n.user_id)}
                      </td>
                      <td className="max-w-[220px] truncate px-2 py-2.5 font-medium text-apptext dark:text-slate-100">
                        {n.message}
                      </td>
                      <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {n.channel}
                      </td>
                      <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {n.status}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(n.created_at)}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit"
                            onClick={() => openEdit(n)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete"
                            onClick={() => handleRemove(n.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === n.id ? (
                      <tr className="border-b border-slate-100 bg-primary-50/90 dark:border-slate-800/60 dark:bg-primary-950/25">
                        <td colSpan={7} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
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
                              <Select
                                label="Channel"
                                value={editForm.channel}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    channel: e.target.value,
                                  }))
                                }
                                required
                              >
                                {CHANNELS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
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
                                required
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                              <div className="sm:col-span-2">
                                <Input
                                  label="Message"
                                  value={editForm.message}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      message: e.target.value,
                                    }))
                                  }
                                  required
                                />
                              </div>
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
        title="Delete Notification"
        message={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone and may affect associated user deliveries.`}
        itemName={deleteModal.name}
        loading={deleting}
      />
    </div>
  );
}
