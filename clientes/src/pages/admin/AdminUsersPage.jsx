import { Fragment, useCallback, useEffect, useState } from "react";
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
import {
  ETHIOPIAN_PHONE_ERROR,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from "@/utils/ethiopianPhone.js";

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role_id, setRoleId] = useState("");
  const [status, setStatus] = useState("active");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    role_id: "",
    status: "active",
    password: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, r] = await Promise.all([
        adminUsersService.list(),
        rolesService.list(),
      ]);
      const listU = Array.isArray(u) ? u : [];
      const listR = Array.isArray(r) ? r : [];
      setUsers(listU);
      setRoles(listR);
      setRoleId((prev) => {
        if (prev !== "") return prev;
        return listR.length ? String(listR[0].id) : "";
      });
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openEdit(u) {
    setEditingId(u.id);
    setEditForm({
      full_name: u.full_name ?? "",
      phone: u.phone ?? "",
      email: u.email ?? "",
      role_id: String(u.role_id ?? ""),
      status: u.status ?? "active",
      password: "",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({
      full_name: "",
      phone: "",
      email: "",
      role_id: "",
      status: "active",
      password: "",
    });
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    if (editingId == null) return;
    setNotice("");
    setError("");
    const fn = editForm.full_name.trim();
    const ph = normalizeEthiopianPhone(editForm.phone);
    if (!fn || !ph) {
      setError("Name and phone are required.");
      return;
    }
    if (!isValidEthiopianPhone(ph)) {
      setError(ETHIOPIAN_PHONE_ERROR);
      return;
    }
    setSavingEdit(true);
    try {
      const body = {
        full_name: fn,
        phone: ph,
        email: editForm.email.trim() || null,
      };
      
      // Only include role_id if it's selected (allows removing admin role)
      if (editForm.role_id !== "") {
        body.role_id = Number(editForm.role_id);
      }
      
      // Only include status if it's selected (allows disabling account)
      if (editForm.status !== "") {
        body.status = editForm.status;
      }
      
      if (editForm.password.trim()) {
        body.password = editForm.password;
      }
      await adminUsersService.update(editingId, body);
      setNotice("User updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(
        e?.data?.sqlMessage || e?.data?.message || e?.message || "Update failed"
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    const ph = normalizeEthiopianPhone(phone);
    if (!full_name.trim() || !ph || !password) {
      setError("Name, phone, and password are required.");
      return;
    }
    if (!isValidEthiopianPhone(ph)) {
      setError(ETHIOPIAN_PHONE_ERROR);
      return;
    }
    if (role_id === "") {
      setError("Choose a role.");
      return;
    }
    setSubmitting(true);
    try {
      await adminUsersService.create({
        full_name: full_name.trim(),
        phone: ph,
        email: email.trim() || null,
        password,
        role_id: Number(role_id),
        status,
      });
      setNotice("User created.");
      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("");
      await refresh();
    } catch (e) {
      setError(
        e?.data?.sqlMessage || e?.data?.message || e?.message || "Create failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id) {
    const user = users.find(u => u.id === id);
    setDeleteModal({ isOpen: true, id, name: user?.full_name || `User #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    if (editingId === id) closeEdit();
    
    try {
      await adminUsersService.remove(id);
      setNotice("User removed successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      console.error("Delete user error:", err);
      let errorMessage = "Failed to delete user.";
      
      if (err.status === 500) {
        errorMessage = "Server error occurred. The user may have associated data that needs to be removed first.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this user.";
      } else if (err.status === 404) {
        errorMessage = "User not found. It may have already been deleted.";
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

  if (loading && !users.length && !roles.length) {
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
        title="Register user"
        subtitle="Assign any role from your database"
      >
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Input
            label="Full name"
            name="full_name"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912345678"
            required
          />
          <Input
            label="Email (optional)"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Temporary password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Select
            label="Role"
            name="role_id"
            value={role_id}
            onChange={(e) => setRoleId(e.target.value)}
            required
          >
            <option value="">Select role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </Select>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="All users" subtitle="Password hashes are never loaded in the UI">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-3 py-2 font-semibold">Id</th>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Phone</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Role id</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No users
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <Fragment key={u.id}>
                    <tr className="bg-slate-950/30 hover:bg-slate-800/30">
                      <td className="px-3 py-2 text-slate-300">{u.id}</td>
                      <td className="px-3 py-2 text-slate-200">{u.full_name}</td>
                      <td className="px-3 py-2 text-slate-300">{u.phone}</td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-slate-400">
                        {u.email ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{u.role_id}</td>
                      <td className="px-3 py-2 text-slate-300">{u.status}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit user"
                            onClick={() => openEdit(u)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete user"
                            onClick={() => handleRemove(u.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === u.id ? (
                      <tr className="bg-primary-950/20">
                        <td colSpan={7} className="p-4">
                          <form
                            onSubmit={handleUpdateUser}
                            className="space-y-4"
                          >
                            <p className="text-xs font-medium text-primary-300">
                              Edit user #{u.id}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <Input
                                label="Full name"
                                value={editForm.full_name}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    full_name: e.target.value,
                                  }))
                                }
                                required
                              />
                              <Input
                                label="Phone"
                                type="tel"
                                value={editForm.phone}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    phone: e.target.value,
                                  }))
                                }
                                placeholder="0912345678"
                                required
                              />
                              <Input
                                label="Email"
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    email: e.target.value,
                                  }))
                                }
                              />
                              <Select
                                label="Role"
                                value={editForm.role_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    role_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Remove Role</option>
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} ({r.id})
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
                              >
                                <option value="">Remove Status</option>
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                              </Select>
                              <Input
                                label="New password (optional)"
                                type="password"
                                autoComplete="new-password"
                                value={editForm.password}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    password: e.target.value,
                                  }))
                                }
                                placeholder="Leave blank to keep current"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <IconButton
                                variant="primary"
                                label="Save user"
                                type="submit"
                                disabled={savingEdit}
                                className="h-10 w-10"
                              >
                                <CheckIcon />
                              </IconButton>
                              <IconButton
                                variant="ghost"
                                label="Cancel edit"
                                type="button"
                                onClick={closeEdit}
                                className="h-10 w-10"
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
        title="Delete User"
        message={`Are you sure you want to delete the user "${deleteModal.name}"? This action cannot be undone and will permanently remove all user data.`}
        itemName={`User "${deleteModal.name}"`}
        loading={deleting}
      />
    </div>
  );
}
