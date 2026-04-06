import { Fragment, useCallback, useEffect, useState } from "react";
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

export function AdminLoginHistoryPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [cUser, setCUser] = useState("");
  const [cDevice, setCDevice] = useState("");
  const [cIp, setCIp] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    user_id: "",
    device_info: "",
    ip_address: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [h, u] = await Promise.all([
        loginHistoryService.list(),
        adminUsersService.list(),
      ]);
      setRows(Array.isArray(h) ? h : []);
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
      device_info: x.device_info ?? "",
      ip_address: x.ip_address ?? "",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({ user_id: "", device_info: "", ip_address: "" });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    setSubmitting(true);
    try {
      const body = {};
      if (cUser) body.user_id = Number(cUser);
      if (cDevice.trim()) body.device_info = cDevice.trim();
      if (cIp.trim()) body.ip_address = cIp.trim();
      await loginHistoryService.create(body);
      setNotice("Record created.");
      setCUser("");
      setCDevice("");
      setCIp("");
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
    if (!window.confirm("Delete this login history row?")) return;
    setError("");
    setNotice("");
    if (editingId === id) closeEdit();
    try {
      await loginHistoryService.remove(id);
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

      <Card title="Create login history row">
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Select label="User (optional)" value={cUser} onChange={(e) => setCUser(e.target.value)}>
            <option value="">—</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} (#{u.id})
              </option>
            ))}
          </Select>
          <Input
            label="Device info (optional)"
            value={cDevice}
            onChange={(e) => setCDevice(e.target.value)}
          />
          <Input
            label="IP (optional)"
            value={cIp}
            onChange={(e) => setCIp(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="All login history">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2">Id</th>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Device</th>
                <th className="px-2 py-2">IP</th>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No rows
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
                      <td className="max-w-[160px] truncate px-2 py-2 text-slate-500">
                        {r.device_info ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-500">
                        {r.ip_address ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(r.login_time)}
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
                        <td colSpan={6} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3">
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
                                label="Device"
                                value={editForm.device_info}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    device_info: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                label="IP"
                                value={editForm.ip_address}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    ip_address: e.target.value,
                                  }))
                                }
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
