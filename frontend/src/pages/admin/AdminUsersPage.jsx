import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { rolesService } from "@/services/roles.service.js";
import { PasswordFieldWithToggle } from "@/components/auth/PasswordFieldWithToggle.jsx";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";

import { cn } from "@/utils/cn.js";
import { isAdminRole, isDriverRole, isPassengerRole } from "@/utils/roles.js";

const USER_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "full_name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "role_id", label: "Role" },
  { key: "status", label: "Status" },
];

const CATEGORY_ORDER = ["passenger", "driver", "admin", "other"];

const CATEGORY_META = {
  passenger: {
    label: "Passengers",
    description: "Book trips, tickets, and cargo",
  },
  driver: {
    label: "Drivers",
    description: "Trips, passengers, and cargo on the road",
  },
  admin: {
    label: "Administrators",
    description: "Manage routes, vehicles, and settings",
  },
  other: {
    label: "Other roles",
    description: "Any role name not matched above",
  },
};

function categorizeUser(u, roleNameById) {
  const rn = roleNameById.get(Number(u.role_id)) ?? "";
  if (isAdminRole(rn)) return "admin";
  if (isDriverRole(rn)) return "driver";
  if (isPassengerRole(rn)) return "passenger";
  return "other";
}

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    name: "",
  });
  const [deleting, setDeleting] = useState(false);
  const [driverAssignments, setDriverAssignments] = useState([]);
  const [assigningPassenger, setAssigningPassenger] = useState(false);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role_id, setRoleId] = useState("");
  const [status, setStatus] = useState("active");
  const [assignmentPassengerId, setAssignmentPassengerId] = useState("");
  const [assignmentDriverId, setAssignmentDriverId] = useState("");

  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState("full_name");
  const [sortDir, setSortDir] = useState("asc");

  const [openCategory, setOpenCategory] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    role_id: "",
    status: "active",
    password: "",
  });
  const isValidFullName = (name) => {
    if (!name) return false;
    return /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(name.trim());
  };
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, r] = await Promise.all([
        adminUsersService.list(),
        rolesService.list(),
      ]);
      const assignments = await adminUsersService.listDriverAssignments();
      const listU = Array.isArray(u) ? u : Array.isArray(u?.data) ? u.data : [];
      const rawRoles = Array.isArray(r)
        ? r
        : Array.isArray(r?.data)
          ? r.data
          : [];
      const listR = [...rawRoles].sort((a, b) =>
        String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
          sensitivity: "base",
        }),
      );
      setUsers(listU);
      setRoles(listR);
      setDriverAssignments(Array.isArray(assignments) ? assignments : []);
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

  const roleNameById = useMemo(() => {
    const m = new Map();
    for (const r of roles) {
      m.set(Number(r.id), String(r.name ?? "").trim());
    }
    return m;
  }, [roles]);

  const filteredSortedUsers = useMemo(() => {
    let rows = [...users];
    const q = tableSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((u) => {
        const rn = roleNameById.get(Number(u.role_id)) ?? "";
        const hay = [
          u.id,
          u.full_name,
          u.phone,
          u.email,
          u.role_id,
          rn,
          u.status,
        ]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return hay.some((s) => s.includes(q));
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const key = sortKey;
    rows.sort((a, b) => {
      let va;
      let vb;
      if (key === "id" || key === "role_id") {
        va = Number(a[key]);
        vb = Number(b[key]);
        if (!Number.isFinite(va)) va = 0;
        if (!Number.isFinite(vb)) vb = 0;
      } else {
        va = String(a[key] ?? "").toLowerCase();
        vb = String(b[key] ?? "").toLowerCase();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [users, tableSearch, sortKey, sortDir, roleNameById]);

  const usersByCategory = useMemo(() => {
    const buckets = {
      admin: [],
      driver: [],
      passenger: [],
      other: [],
    };
    for (const u of filteredSortedUsers) {
      const cat = categorizeUser(u, roleNameById);
      buckets[cat].push(u);
    }
    return buckets;
  }, [filteredSortedUsers, roleNameById]);

  const passengerUsers = useMemo(
    () =>
      users.filter((u) => {
        const rn = roleNameById.get(Number(u.role_id)) ?? "";
        const active =
          String(u.status ?? "")
            .trim()
            .toLowerCase() !== "inactive";
        return isPassengerRole(rn) && active;
      }),
    [users, roleNameById],
  );

  const driverUsers = useMemo(
    () =>
      users.filter((u) => {
        const rn = roleNameById.get(Number(u.role_id)) ?? "";
        const active =
          String(u.status ?? "")
            .trim()
            .toLowerCase() !== "inactive";
        return isDriverRole(rn) && active;
      }),
    [users, roleNameById],
  );

  const assignedPassengerIds = useMemo(
    () => new Set(driverAssignments.map((a) => Number(a.passenger_user_id))),
    [driverAssignments],
  );

  const availablePassengerUsers = useMemo(
    () => passengerUsers.filter((u) => !assignedPassengerIds.has(Number(u.id))),
    [passengerUsers, assignedPassengerIds],
  );

  async function handleAssignPassengerToDriver(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    const passengerId = Number(assignmentPassengerId);
    const driverId = Number(assignmentDriverId);
    if (!Number.isInteger(passengerId) || passengerId <= 0) {
      setError("Select a passenger to assign.");
      return;
    }
    if (!Number.isInteger(driverId) || driverId <= 0) {
      setError("Select a driver.");
      return;
    }
    setAssigningPassenger(true);
    try {
      await adminUsersService.assignPassengerToDriver(passengerId, driverId);
      setNotice("Passenger assigned to driver.");
      setAssignmentPassengerId("");
      setAssignmentDriverId("");
      await refresh();
    } catch (e) {
      setError(
        e?.data?.sqlMessage ||
          e?.data?.message ||
          e?.message ||
          "Assignment failed",
      );
    } finally {
      setAssigningPassenger(false);
    }
  }

  async function handleUnassignPassengerFromDriver(passengerId) {
    setError("");
    setNotice("");
    setAssigningPassenger(true);
    try {
      await adminUsersService.unassignPassengerFromDriver(passengerId);
      setNotice("Passenger unassigned from driver.");
      await refresh();
    } catch (e) {
      setError(
        e?.data?.sqlMessage ||
          e?.data?.message ||
          e?.message ||
          "Unassign failed",
      );
    } finally {
      setAssigningPassenger(false);
    }
  }

  const visibleCategoryKeys = useMemo(() => {
    return CATEGORY_ORDER.filter(
      (k) => k !== "other" || usersByCategory.other.length > 0,
    );
  }, [usersByCategory.other.length]);

  function handleColumnSort(columnKey) {
    if (sortKey === columnKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(columnKey);
      setSortDir("asc");
    }
  }

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
    const rawPhone = editForm.phone.trim();
    if (!fn || !rawPhone) {
      setError("Name and phone are required.");
      return;
    }
    if (!isValidFullName(fn)) {
      setError(
        "Full name must contain only letters and at least first and last name.",
      );
      return;
    }
    if (!/^(09|07)\d{8}$/.test(rawPhone)) {
      setError("Only Ethiopian numbers starting with 09 or 07 are allowed.");
      return;
    }
    setSavingEdit(true);
    try {
      const body = {
        full_name: fn,
        phone: rawPhone,
        email: editForm.email.trim() || null,
      };

      if (editForm.role_id !== "") {
        body.role_id = Number(editForm.role_id);
      }

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
        e?.data?.sqlMessage ||
          e?.data?.message ||
          e?.message ||
          "Update failed",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    const rawPhone = phone.trim();
    if (!full_name.trim() || !rawPhone || !password) {
      setError("Name, phone, and password are required.");
      return;
    }
    if (!isValidFullName(full_name)) {
      setError(
        "Full name must contain only letters and at least first and last name.",
      );
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirmation do not match.");
      return;
    }
    if (!/^(09|07)\d{8}$/.test(rawPhone)) {
      setError(
        "Phone number is Only Ethiopian phone numbers starting with 09 or 07 are allowed.",
      );
      return;
    }
    if (role_id === "") {
      setError("Choose a role from the list.");
      return;
    }
    setSubmitting(true);
    try {
      await adminUsersService.create({
        full_name: full_name.trim(),
        phone: rawPhone,
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
      setConfirmPassword("");
      setRegisterOpen(false);
      await refresh();
    } catch (e) {
      setError(
        e?.data?.sqlMessage ||
          e?.data?.message ||
          e?.message ||
          "Create failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id) {
    const user = users.find((u) => u.id === id);
    setDeleteModal({
      isOpen: true,
      id,
      name: user?.full_name || `User #${id}`,
    });
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
        errorMessage =
          "Server error occurred. The user may have associated data that needs to be removed first.";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
            Admin Users Management
          </h1>
        </div>
        <Button
          type="button"
          variant={registerOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setRegisterOpen((o) => !o);
            setError("");
          }}
          aria-expanded={registerOpen}
          aria-controls="admin-register-user-panel"
        >
          {registerOpen ? "Close registration" : "Add user"}
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

      {registerOpen ? (
        <div id="admin-register-user-panel">
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Full name"
                name="full_name"
                autoComplete="name"
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Phone (login)"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setPhone(value);
                }}
                placeholder="09XXXXXXXX or 07XXXXXXXX"
                maxLength={10}
                minLength={10}
                required
              />
              <Input
                label="Email (optional)"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              <div className="sm:col-span-2 lg:col-span-1">
                <Select
                  label="Role (from database)"
                  name="role_id"
                  value={role_id || ""}
                  onChange={(e) => setRoleId(e.target.value)}
                  required
                >
                  <option value="">Select a role…</option>
                  {roles.map((r) => {
                    const label = `${String(r.name ?? "role")} (id ${r.id})`;
                    return (
                      <option key={r.id} value={r.id} title={label}>
                        {label}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <Select
                label="Account status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active — can sign in</option>
                <option value="inactive">Inactive — blocked</option>
              </Select>
            </div>

            <div className="grid gap-4 border-t border-primary-900/20 pt-4 dark:border-white/10 sm:grid-cols-2">
              <PasswordFieldWithToggle
                id="admin-new-user-password"
                label="Temporary password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
              />
              <PasswordFieldWithToggle
                id="admin-new-user-confirm"
                label="Confirm password"
                name="confirm_password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Creating…" : "Create user"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => {
                  setRegisterOpen(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <h2 className="text-p-heading text-lg font-bold sm:text-xl">
            Pick a group to show its table.
          </h2>
        </div>

        <div className="mb-2 max-w-md">
          <Input
            label="Search"
            type="search"
            name="user_table_search"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Id, name, phone, email, role, status…"
            autoComplete="off"
            className="w-full"
          />
        </div>

        <div
          className={cn(
            "grid gap-3",
            visibleCategoryKeys.length >= 4
              ? "sm:grid-cols-2 xl:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {visibleCategoryKeys.map((key) => {
            const meta = CATEGORY_META[key];
            const count = usersByCategory[key].length;
            const open = openCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setOpenCategory((prev) => (prev === key ? null : key))
                }
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50",
                  open
                    ? "border-primary-500 bg-primary-50/90 shadow-md ring-2 ring-primary-500/25 dark:border-primary-500/80 dark:bg-primary-950/40 dark:ring-primary-500/30"
                    : "border-primary-200/90 bg-white hover:border-primary-400 hover:shadow-sm dark:border-primary-900/50 dark:bg-slate-950/30 dark:hover:border-primary-700",
                )}
                aria-expanded={open}
                aria-controls={`admin-users-table-${key}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {meta.label}
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-apptext dark:text-slate-100">
                      {count}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">
                      {meta.description}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-lg text-slate-400 dark:text-slate-500"
                    aria-hidden
                  >
                    {open ? "▼" : "▶"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-500">
          {users.length === 0 ? (
            <>No users loaded.</>
          ) : (
            <>
              <span className="font-semibold text-slate-800 dark:text-slate-300">
                {filteredSortedUsers.length}
              </span>{" "}
              account
              {filteredSortedUsers.length === 1 ? "" : "s"} match
              {tableSearch.trim() ? " your search" : ""} of{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-300">
                {users.length}
              </span>{" "}
              total
            </>
          )}
        </p>
      </div>

      {openCategory ? (
        <Card
          title={CATEGORY_META[openCategory].label}
          subtitle="Password hashes are never loaded in the UI. Sort columns by clicking the table headers (▲/▼)."
        >
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-300">
              {usersByCategory[openCategory].length}
            </span>{" "}
            {CATEGORY_META[openCategory].label.toLowerCase()}
            {tableSearch.trim() ? " matching search" : ""}.
          </p>
          <div
            id={`admin-users-table-${openCategory}`}
            className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none"
          >
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
                <tr>
                  {USER_SORT_KEYS.map(({ key, label }) => {
                    const active = sortKey === key;
                    return (
                      <th
                        key={key}
                        scope="col"
                        className="px-2 py-2.5 font-semibold"
                      >
                        <button
                          type="button"
                          onClick={() => handleColumnSort(key)}
                          className={cn(
                            "flex w-full min-w-0 items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left transition-colors",
                            "text-slate-700 hover:bg-primary-100/90 hover:text-primary-950",
                            "dark:text-primary-300/95 dark:hover:bg-white/10 dark:hover:text-primary-50",
                            active &&
                              "bg-primary-100/80 font-semibold text-primary-950 dark:bg-white/10 dark:font-semibold dark:text-primary-100",
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
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                    >
                      No users
                    </td>
                  </tr>
                ) : filteredSortedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                    >
                      No users match your search.{" "}
                      <button
                        type="button"
                        className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        onClick={() => setTableSearch("")}
                      >
                        Clear search
                      </button>
                    </td>
                  </tr>
                ) : usersByCategory[openCategory].length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                    >
                      No accounts in this group
                      {tableSearch.trim()
                        ? " for your current search."
                        : "."}{" "}
                      <button
                        type="button"
                        className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        onClick={() => setOpenCategory(null)}
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ) : (
                  usersByCategory[openCategory].map((u) => (
                    <Fragment key={u.id}>
                      <tr className="border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70 dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35">
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600 dark:text-slate-400">
                          {u.id}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-apptext dark:text-slate-100">
                          {u.full_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-300">
                          {u.phone}
                        </td>
                        <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-600 dark:text-slate-400">
                          {u.email ?? "—"}
                        </td>
                        <td
                          className="px-3 py-2.5 text-slate-700 dark:text-slate-300"
                          title={
                            roleNameById.get(Number(u.role_id)) || undefined
                          }
                        >
                          {u.role_id}
                          {roleNameById.get(Number(u.role_id)) ? (
                            <span className="ml-1 text-[0.7rem] text-slate-500 dark:text-slate-500">
                              ({roleNameById.get(Number(u.role_id))})
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-300">
                          {u.status}
                        </td>
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
                        <tr className="bg-primary-50/90 dark:bg-primary-950/25">
                          <td
                            colSpan={7}
                            className="border-t border-primary-200/80 p-4 dark:border-primary-900/40"
                          >
                            <form
                              onSubmit={handleUpdateUser}
                              className="space-y-4"
                            >
                              <p className="text-xs font-semibold text-primary-900 dark:text-primary-300">
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
                                  onChange={(e) => {
                                    const value = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setEditForm((f) => ({
                                      ...f,
                                      phone: value,
                                    }));
                                  }}
                                  placeholder="Enter phone number"
                                  className="phone-input"
                                  maxLength={10}
                                  minLength={10}
                                  required
                                />
                                <Input
                                  label="Email"
                                  type="email"
                                  className="email-input"
                                  placeholder="Enter email"
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
      ) : (
        <div className="rounded-xl border border-dashed border-primary-200/80 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-600 dark:border-primary-900/50 dark:bg-slate-950/20 dark:text-slate-400">
          Select <strong className="text-p-heading">Passengers</strong>,{" "}
          <strong className="text-p-heading">Drivers</strong>, or{" "}
          <strong className="text-p-heading">Administrators</strong> above to
          load that list.
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })
        }
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${deleteModal.name}"? This action cannot be undone and will permanently remove all user data.`}
        itemName={`User "${deleteModal.name}"`}
        loading={deleting}
      />
    </div>
  );
}
