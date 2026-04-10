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
import { DeleteModal } from "@/components/DeleteModal.jsx";

export function AdminLoginHistoryPage() {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("all");

  const [cUser, setCUser] = useState("");
  const [cDevice, setCDevice] = useState("");
  const [cIp, setCIp] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    user_id: "",
    device_info: "",
    ip_address: "",
  });

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  // Filter and search functionality
  useEffect(() => {
    let filtered = [...rows];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(row => 
        (row.device_info && row.device_info.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (row.ip_address && row.ip_address.includes(searchTerm)) ||
        (row.user_id && row.user_id.toString().includes(searchTerm))
      );
    }

    // User filter
    if (filterUser) {
      filtered = filtered.filter(row => row.user_id == filterUser);
    }

    // Date range filter
    if (filterDateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch(filterDateRange) {
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
        filtered = filtered.filter(row => {
          const loginDate = new Date(row.login_time);
          return loginDate >= filterDate;
        });
      }
    }

    setFilteredRows(filtered);
  }, [rows, searchTerm, filterUser, filterDateRange]);

  const refresh = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const [h, u] = await Promise.all([
        loginHistoryService.list(),
        adminUsersService.list(),
      ]);
      const list = Array.isArray(h) ? h : Array.isArray(h?.data) ? h.data : [];
      setRows(list);
      setUsers(Array.isArray(u) ? u : Array.isArray(u?.data) ? u.data : []);
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

  /** Keep the table current while this page is open (no manual refresh needed). */
  useEffect(() => {
    const id = window.setInterval(() => {
      refresh({ silent: true });
    }, 60_000);

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
      setNotice("Login history record created successfully.");
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
      setNotice("Login history record updated successfully.");
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
    try {
      await loginHistoryService.remove(id);
      setNotice("Login history record deleted successfully.");
      setDeleteModal({ isOpen: false, id: null });
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
          Login History
        </h2>
        <p className="text-sm text-primary-400/80">
          Logins are recorded automatically when users sign in. This list refreshes on load, every
          minute while you stay on this page, and when you return to the tab.
        </p>
      </div>

      {notice ? (
        <div className="rounded-lg border border-green-500/30 bg-green-900/20 px-4 py-3 text-sm text-green-400">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Search and Filter Controls */}
      <Card title="Search & Filter" className="!p-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search by device, IP, or user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <Select 
            label="Filter by User" 
            value={filterUser} 
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </Select>

          <Select 
            label="Date Range" 
            value={filterDateRange} 
            onChange={(e) => setFilterDateRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </Select>

          <div className="flex items-end">
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearchTerm("");
                setFilterUser("");
                setFilterDateRange("all");
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Create New Record */}
      <Card title="Create Login History Record" className="!p-6">
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
            placeholder="e.g., Chrome on Windows"
          />
          <Input
            label="IP Address (optional)"
            value={cIp}
            onChange={(e) => setCIp(e.target.value)}
            placeholder="e.g., 192.168.1.1"
          />
          <div className="flex items-end">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating…" : "Create Record"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Login History Table */}
      <Card title="Login History Records" className="!p-6">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-primary-400/80">
            Showing {filteredRows.length} of {rows.length} records
          </div>
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh now
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Device Info</th>
                <th className="px-4 py-3 text-left font-medium">IP Address</th>
                <th className="px-4 py-3 text-left font-medium">Login Time</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="space-y-2">
                      <p className="text-lg font-medium">No login history records found</p>
                      <p className="text-sm">Try adjusting your search filters or create a new record</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary-300">#{r.id}</td>
                      <td className="px-4 py-3">
                        {r.user_id ? (
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-300">
                                {getUserName(r.user_id).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-slate-300">{getUserName(r.user_id)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-400">
                        {r.device_info || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-400">
                          {r.ip_address || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                        {formatDate(r.login_time)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit"
                            onClick={() => openEdit(r)}
                            className="hover:bg-primary-800/30"
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete"
                            onClick={() => handleRemove(r.id)}
                            className="hover:bg-red-900/30"
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === r.id ? (
                      <tr className="bg-primary-950/20">
                        <td colSpan={6} className="p-4">
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
                                label="Device Info"
                                value={editForm.device_info}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    device_info: e.target.value,
                                  }))
                                }
                                placeholder="Device information"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Login History Record"
        message="Are you sure you want to delete this login history record? This action cannot be undone."
        itemName="Login History Record"
        loading={savingEdit}
      />
    </div>
  );
}
