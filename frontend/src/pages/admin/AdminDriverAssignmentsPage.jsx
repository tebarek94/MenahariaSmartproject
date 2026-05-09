import { useCallback, useEffect, useMemo, useState } from "react";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { rolesService } from "@/services/roles.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { isDriverRole, isPassengerRole } from "@/utils/roles.js";

export function AdminDriverAssignmentsPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passengerUserId, setPassengerUserId] = useState("");
  const [driverUserId, setDriverUserId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersData, rolesData, assignmentsData] = await Promise.all([
        adminUsersService.list(),
        rolesService.list(),
        adminUsersService.listDriverAssignments(),
      ]);
      const listUsers = Array.isArray(usersData)
        ? usersData
        : Array.isArray(usersData?.data)
          ? usersData.data
          : [];
      const listRoles = Array.isArray(rolesData)
        ? rolesData
        : Array.isArray(rolesData?.data)
          ? rolesData.data
          : [];
      const listAssignments = Array.isArray(assignmentsData) ? assignmentsData : [];

      setUsers(listUsers);
      setRoles(listRoles);
      setAssignments(listAssignments);
    } catch (e) {
      setError(e?.message || "Failed to load assignments");
      setUsers([]);
      setRoles([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const roleNameById = useMemo(() => {
    const map = new Map();
    for (const role of roles) {
      map.set(Number(role.id), String(role.name ?? "").trim());
    }
    return map;
  }, [roles]);

  const passengerUsers = useMemo(
    () =>
      users.filter((u) => {
        const rn = roleNameById.get(Number(u.role_id)) ?? "";
        const isActive = String(u.status ?? "").trim().toLowerCase() !== "inactive";
        return isPassengerRole(rn) && isActive;
      }),
    [users, roleNameById]
  );

  const driverUsers = useMemo(
    () =>
      users.filter((u) => {
        const rn = roleNameById.get(Number(u.role_id)) ?? "";
        const isActive = String(u.status ?? "").trim().toLowerCase() !== "inactive";
        return isDriverRole(rn) && isActive;
      }),
    [users, roleNameById]
  );

  const assignedPassengerIds = useMemo(
    () => new Set(assignments.map((a) => Number(a.passenger_user_id))),
    [assignments]
  );

  const availablePassengerUsers = useMemo(
    () =>
      passengerUsers.filter((u) => !assignedPassengerIds.has(Number(u.id))),
    [passengerUsers, assignedPassengerIds]
  );

  async function handleAssign(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    const pid = Number(passengerUserId);
    const did = Number(driverUserId);
    if (!Number.isInteger(pid) || pid <= 0) {
      setError("Select a passenger.");
      return;
    }
    if (!Number.isInteger(did) || did <= 0) {
      setError("Select a driver.");
      return;
    }
    setWorking(true);
    try {
      await adminUsersService.assignPassengerToDriver(pid, did);
      setPassengerUserId("");
      setDriverUserId("");
      setNotice("Passenger assigned to driver.");
      await refresh();
    } catch (e) {
      setError(
        e?.data?.message || e?.message || "Could not assign passenger to driver."
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleUnassign(passengerId) {
    setError("");
    setNotice("");
    setWorking(true);
    try {
      await adminUsersService.unassignPassengerFromDriver(passengerId);
      setNotice("Passenger unassigned from driver.");
      await refresh();
    } catch (e) {
      setError(
        e?.data?.message || e?.message || "Could not remove passenger assignment."
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading && !assignments.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
          Admin Manegements Passenger assignments
        </h1>
       
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
        title="Assign passenger to driver"
        subtitle="Assigned passengers are hidden until the assignment expires."
      >
        <form onSubmit={handleAssign} className="grid gap-4 lg:grid-cols-3">
          <Select
            label="Passenger"
            value={passengerUserId}
            onChange={(e) => setPassengerUserId(e.target.value)}
            required
          >
            <option value="">Select passenger…</option>
            {availablePassengerUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.phone || "no phone"})
              </option>
            ))}
          </Select>
          <Select
            label="Driver"
            value={driverUserId}
            onChange={(e) => setDriverUserId(e.target.value)}
            required
          >
            <option value="">Select driver…</option>
            {driverUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.phone || "no phone"})
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button type="submit" variant="primary" className="w-full" disabled={working}>
              {working ? "Assigning…" : "Assign passenger"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={`Current assignments (${assignments.length})`}>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Passenger</th>
                <th className="px-3 py-2.5 font-semibold">Passenger phone</th>
                <th className="px-3 py-2.5 font-semibold">Driver</th>
                <th className="px-3 py-2.5 font-semibold">Driver phone</th>
                <th className="px-3 py-2.5 font-semibold">Expires at</th>
                <th className="px-3 py-2.5 font-semibold">Assigned at</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-600 dark:text-slate-400"
                  >
                    No assignments yet.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200">
                      {a.passenger_name || `Passenger #${a.passenger_user_id}`}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {a.passenger_phone || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200">
                      {a.driver_name || `Driver #${a.driver_user_id}`}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {a.driver_phone || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {a.expires_at ? new Date(a.expires_at).toLocaleString() : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {a.updated_at ? new Date(a.updated_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        disabled={working}
                        onClick={() => handleUnassign(a.passenger_user_id)}
                      >
                        Unassign
                      </Button>
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
