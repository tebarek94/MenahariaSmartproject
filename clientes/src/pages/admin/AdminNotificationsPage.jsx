import { Fragment, useCallback, useEffect, useState } from "react";
import { notificationsService } from "@/services/notifications.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { formatDate } from "@/utils/format.js";

const CHANNELS = ["sms", "email", "push"];
const STATUSES = ["pending", "sent", "failed"];

export function AdminNotificationsPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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
      setRows(Array.isArray(n) ? n : []);
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
    if (!window.confirm("Delete this notification?")) return;
    setError("");
    setNotice("");
    if (editingId === id) closeEdit();
    try {
      await notificationsService.remove(id);
      setNotice("Deleted.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  if (loading && !rows.length) {
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

      <Card title="Create notification">
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Select label="User (optional)" value={cUser} onChange={(e) => setCUser(e.target.value)}>
            <option value="">Broadcast (no user)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} (#{u.id})
              </option>
            ))}
          </Select>
          <Input
            label="Message"
            value={cMsg}
            onChange={(e) => setCMsg(e.target.value)}
            required
          />
          <Select
            label="Channel"
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
            value={cStatus}
            onChange={(e) => setCStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="All notifications">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2">Id</th>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Message</th>
                <th className="px-2 py-2">Channel</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Created</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No notifications
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                      <td className="px-2 py-2 text-slate-400">
                        {r.user_id ?? "—"}
                      </td>
                      <td className="max-w-[220px] truncate px-2 py-2 text-slate-300">
                        {r.message}
                      </td>
                      <td className="px-2 py-2">{r.channel}</td>
                      <td className="px-2 py-2">{r.status}</td>
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
    </div>
  );
}
