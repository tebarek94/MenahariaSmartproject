import { useCallback, useEffect, useState } from "react";
import { permissionsService } from "@/services/permissions.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";

export function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);
  const [newName, setNewName] = useState("");
  const [edits, setEdits] = useState({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await permissionsService.list();
      const list = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : [];
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
    const permission = permissions.find(p => p.id === id);
    setDeleteModal({ isOpen: true, id, name: permission?.name || `Permission #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    try {
      await permissionsService.remove(id);
      setNotice("Permission deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      console.error("Delete permission error:", err);
      let errorMessage = "Failed to delete permission.";
      
      if (err.status === 500) {
        errorMessage = "Server error occurred. The permission may be assigned to roles and cannot be deleted.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this permission.";
      } else if (err.status === 404) {
        errorMessage = "Permission not found. It may have already been deleted.";
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

  if (loading && !permissions.length) {
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
          Permissions
        </h1>
        <p className="text-p-muted max-w-xl text-sm sm:text-[0.95rem]">
          Define permission names for RBAC, then attach them to roles on Role permissions.
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

      <Card
        title="All permissions"
        subtitle="Edit names inline, then save. Deleting may fail if a role still references the permission."
      >
        <div className="mb-3 flex justify-end">
          <Button variant="ghost" className="!text-xs" type="button" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="space-y-3">
          {permissions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-primary-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600 dark:border-primary-900/40 dark:bg-slate-950/30 dark:text-slate-400">
              No permissions yet — create one above.
            </p>
          ) : (
            permissions.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-primary-200/90 bg-white p-3 shadow-sm transition-colors hover:bg-primary-50/40 dark:border-slate-700/90 dark:bg-slate-950/35 dark:shadow-none dark:hover:bg-slate-900/45 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-500">
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

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={confirmDelete}
        title="Delete Permission"
        message={`Are you sure you want to delete the permission "${deleteModal.name}"? This action cannot be undone and may affect roles that use this permission.`}
        itemName={`Permission "${deleteModal.name}"`}
        loading={deleting}
      />
    </div>
  );
}
