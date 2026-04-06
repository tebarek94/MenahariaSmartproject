import { useCallback, useEffect, useState } from "react";
import { rolesService } from "@/services/roles.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { CheckIcon, TrashIcon } from "@/ui/icons.jsx";

export function AdminRolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newName, setNewName] = useState("");
  const [edits, setEdits] = useState({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await rolesService.list();
      const list = Array.isArray(r) ? r : [];
      setRoles(list);
      const next = {};
      list.forEach((x) => {
        next[x.id] = x.name;
      });
      setEdits(next);
    } catch (e) {
      setError(e?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    const name = newName.trim();
    if (!name) return;
    try {
      await rolesService.create({ name });
      setNotice("Role created.");
      setNewName("");
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Create failed");
    }
  }

  async function handleUpdate(id) {
    setNotice("");
    setError("");
    const name = (edits[id] ?? "").trim();
    if (!name) {
      setError("Role name cannot be empty.");
      return;
    }
    try {
      await rolesService.update(id, { name });
      setNotice("Role updated.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Update failed");
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Delete this role? Linked users may break.")) return;
    setError("");
    setNotice("");
    try {
      await rolesService.remove(id);
      setNotice("Role deleted.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  if (loading && !roles.length) {
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

      <Card title="Create role">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Role name"
              name="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. dispatcher"
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Add role
          </Button>
        </form>
      </Card>

      <Card title="Roles">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="space-y-3">
          {roles.length === 0 ? (
            <p className="text-sm text-slate-500">No roles</p>
          ) : (
            roles.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="w-12 shrink-0 font-mono text-xs text-slate-500">
                  #{r.id}
                </span>
                <Input
                  className="flex-1"
                  aria-label={`Role ${r.id} name`}
                  value={edits[r.id] ?? ""}
                  onChange={(e) =>
                    setEdits((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                />
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    variant="primary"
                    label="Save role"
                    onClick={() => handleUpdate(r.id)}
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton
                    variant="danger"
                    label="Delete role"
                    onClick={() => handleRemove(r.id)}
                  >
                    <TrashIcon />
                  </IconButton>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
