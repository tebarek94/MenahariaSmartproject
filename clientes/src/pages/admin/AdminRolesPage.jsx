import { useCallback, useEffect, useState } from "react";
import { rolesService } from "@/services/roles.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { CheckIcon, TrashIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";

export function AdminRolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newName, setNewName] = useState("");
  const [edits, setEdits] = useState({});
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);

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
    const role = roles.find(r => r.id === id);
    setDeleteModal({ isOpen: true, id, name: role?.name || `Role #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    try {
      await rolesService.remove(id);
      setNotice("Role deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      console.error("Delete role error:", err);
      let errorMessage = "Failed to delete role.";
      
      // Handle different error types
      if (err.status === 500) {
        errorMessage = "Server error occurred. The role may be in use by users or there might be a database constraint. Please contact support or try removing users from this role first.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this role.";
      } else if (err.status === 404) {
        errorMessage = "Role not found. It may have already been deleted.";
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
        <div className="rounded-lg border border-green-500/30 bg-green-900/20 px-4 py-3 text-sm text-green-400">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-red-300">Error</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="ml-3 text-red-400 hover:text-red-300"
              aria-label="Dismiss error"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
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

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={confirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${deleteModal.name}"? This action cannot be undone and may affect users assigned to this role.`}
        itemName={`Role "${deleteModal.name}"`}
        loading={deleting}
      />
    </div>
  );
}
