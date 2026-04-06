import { useCallback, useEffect, useState } from "react";
import { permissionsService } from "@/services/permissions.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { CheckIcon, TrashIcon } from "@/ui/icons.jsx";

export function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newName, setNewName] = useState("");
  const [edits, setEdits] = useState({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await permissionsService.list();
      const list = Array.isArray(rows) ? rows : [];
      setPermissions(list);
      const next = {};
      list.forEach((x) => {
        next[x.id] = x.name;
      });
      setEdits(next);
    } catch (e) {
      setError(e?.message || "Failed to load permissions");
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
      await permissionsService.create({ name });
      setNotice("Permission created.");
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
      setError("Permission name cannot be empty.");
      return;
    }
    try {
      await permissionsService.update(id, { name });
      setNotice("Permission updated.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Update failed");
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Delete this permission?")) return;
    setError("");
    setNotice("");
    try {
      await permissionsService.remove(id);
      setNotice("Permission deleted.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  if (loading && !permissions.length) {
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

      <Card title="Create permission">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Permission name"
              name="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. trips.read"
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Add permission
          </Button>
        </form>
      </Card>

      <Card title="Permissions">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="space-y-3">
          {permissions.length === 0 ? (
            <p className="text-sm text-slate-500">No permissions</p>
          ) : (
            permissions.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="w-12 shrink-0 font-mono text-xs text-slate-500">
                  #{p.id}
                </span>
                <Input
                  className="flex-1"
                  aria-label={`Permission ${p.id} name`}
                  value={edits[p.id] ?? ""}
                  onChange={(e) =>
                    setEdits((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    variant="primary"
                    label="Save permission"
                    onClick={() => handleUpdate(p.id)}
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton
                    variant="danger"
                    label="Delete permission"
                    onClick={() => handleRemove(p.id)}
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
