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
      const listA = Array.isArray(a) ? a : [];
      const listR = Array.isArray(r) ? r : [];
      const listP = Array.isArray(p) ? p : [];
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

      <Card title="Assign permission to role">
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

      <Card title="Current assignments">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Permission</th>
                <th className="px-3 py-2 font-semibold">Ids</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No assignments
                  </td>
                </tr>
              ) : (
                assignments.map((row, i) => (
                  <tr
                    key={`${row.role_id}-${row.permission_id}-${i}`}
                    className="bg-slate-950/30 hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-2 text-slate-200">
                      {row.role_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-200">
                      {row.permission_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      r{row.role_id} · p{row.permission_id}
                    </td>
                    <td className="px-3 py-2">
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
