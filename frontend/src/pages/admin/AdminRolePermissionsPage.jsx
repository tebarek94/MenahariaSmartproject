import { useCallback, useEffect, useState } from "react";
import { rolePermissionsService } from "@/services/rolePermissions.service.js";
import { rolesService } from "@/services/roles.service.js";
import { permissionsService } from "@/services/permissions.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { TrashIcon } from "@/ui/icons.jsx";
import { cn } from "@/utils/cn.js";

export function AdminRolePermissionsPage() {
  const [assignments, setAssignments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [role_id, setRoleId] = useState("");
  const [permission_id, setPermissionId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, r, p] = await Promise.all([
        rolePermissionsService.list(),
        rolesService.list(),
        permissionsService.list(),
      ]);
      const listA = Array.isArray(a) ? a : Array.isArray(a?.data) ? a.data : [];
      const listR = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
      const listP = Array.isArray(p) ? p : Array.isArray(p?.data) ? p.data : [];
      setAssignments(listA);
      setRoles(listR);
      setPermissions(listP);
      setRoleId((prev) => {
        if (prev !== "") return prev;
        return listR.length ? String(listR[0].id) : "";
      });
      setPermissionId((prev) => {
        if (prev !== "") return prev;
        return listP.length ? String(listP[0].id) : "";
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

  async function handleAssign(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (role_id === "" || permission_id === "") {
      setError("Select both role and permission.");
      return;
    }
    setAssigning(true);
    try {
      await rolePermissionsService.assign({
        role_id: Number(role_id),
        permission_id: Number(permission_id),
      });
      setNotice("Permission assigned to role.");
      await refresh();
    } catch (e) {
      setError(
        e?.data?.sqlMessage || e?.data?.message || e?.message || "Assign failed"
      );
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(roleId, permissionId) {
    if (!window.confirm("Remove this assignment?")) return;
    setError("");
    setNotice("");
    try {
      await rolePermissionsService.remove(roleId, permissionId);
      setNotice("Assignment removed.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Remove failed");
    }
  }

  if (loading && !assignments.length && !roles.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
          Role permissions
        </h1>
        <p className="text-p-muted max-w-xl text-sm sm:text-[0.95rem]">
          Link roles to permissions. The table below lists every role–permission pair in the
          database.
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
        title="Assign permission to role"
        subtitle="Pick a role and a permission, then Assign. Duplicate pairs are rejected by the server."
      >
        <form
          onSubmit={handleAssign}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Select
            label="Role"
            name="role_id"
            value={role_id}
            onChange={(e) => setRoleId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
          </Select>
          <Select
            label="Permission"
            name="permission_id"
            value={permission_id}
            onChange={(e) => setPermissionId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {permissions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id})
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto" disabled={assigning}>
              {assigning ? "Saving…" : "Assign"}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Current assignments"
        subtitle="Remove a row to revoke that permission for that role."
      >
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" className="!text-xs" type="button" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Role</th>
                <th className="px-3 py-2.5 font-semibold">Permission</th>
                <th className="px-3 py-2.5 font-semibold">Ids</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-primary-400/95">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No assignments — use the form above to add one.
                  </td>
                </tr>
              ) : (
                assignments.map((row, i) => (
                  <tr
                    key={`${row.role_id}-${row.permission_id}-${i}`}
                    className={cn(
                      "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                      "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium text-apptext dark:text-slate-100">
                      {row.role_name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200">
                      {row.permission_name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                      r{row.role_id} · p{row.permission_id}
                    </td>
                    <td className="px-3 py-2.5">
                      <IconButton
                        variant="danger"
                        label="Remove assignment"
                        onClick={() =>
                          handleRemove(row.role_id, row.permission_id)
                        }
                      >
                        <TrashIcon />
                      </IconButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
