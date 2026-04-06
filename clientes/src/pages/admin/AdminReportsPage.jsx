import { Fragment, useCallback, useEffect, useState } from "react";
import { reportsService } from "@/services/reports.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { formatDate } from "@/utils/format.js";

export function AdminReportsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [cType, setCType] = useState("");
  const [cRange, setCRange] = useState("");
  const [cPath, setCPath] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    type: "",
    date_range: "",
    file_path: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await reportsService.list();
      setRows(Array.isArray(r) ? r : []);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openEdit(x) {
    setEditingId(x.id);
    setEditForm({
      type: x.type ?? "",
      date_range: x.date_range ?? "",
      file_path: x.file_path ?? "",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({ type: "", date_range: "", file_path: "" });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    setSubmitting(true);
    try {
      const body = {};
      if (cType.trim()) body.type = cType.trim();
      if (cRange.trim()) body.date_range = cRange.trim();
      if (cPath.trim()) body.file_path = cPath.trim();
      await reportsService.create(body);
      setNotice("Report created.");
      setCType("");
      setCRange("");
      setCPath("");
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
      await reportsService.update(editingId, {
        type: editForm.type.trim() || null,
        date_range: editForm.date_range.trim() || null,
        file_path: editForm.file_path.trim() || null,
      });
      setNotice("Report updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Delete this report?")) return;
    setError("");
    setNotice("");
    if (editingId === id) closeEdit();
    try {
      await reportsService.remove(id);
      setNotice("Deleted.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  if (loading && !rows.length) {
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

      <Card title="Create report row">
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Input
            label="Type (optional)"
            value={cType}
            onChange={(e) => setCType(e.target.value)}
            placeholder="e.g. revenue"
          />
          <Input
            label="Date range (optional)"
            value={cRange}
            onChange={(e) => setCRange(e.target.value)}
            placeholder="e.g. 2026-03"
          />
          <Input
            label="File path (optional)"
            value={cPath}
            onChange={(e) => setCPath(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="All reports">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2">Id</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Range</th>
                <th className="px-2 py-2">File</th>
                <th className="px-2 py-2">Generated</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No reports
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                      <td className="px-2 py-2 text-slate-300">{r.type ?? "—"}</td>
                      <td className="max-w-[140px] truncate px-2 py-2 text-slate-500">
                        {r.date_range ?? "—"}
                      </td>
                      <td className="max-w-[180px] truncate px-2 py-2 text-slate-500">
                        {r.file_path ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit"
                            onClick={() => openEdit(r)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete"
                            onClick={() => handleRemove(r.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === r.id ? (
                      <tr className="bg-primary-950/20">
                        <td colSpan={6} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <Input
                                label="Type"
                                value={editForm.type}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    type: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                label="Date range"
                                value={editForm.date_range}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    date_range: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                label="File path"
                                value={editForm.file_path}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    file_path: e.target.value,
                                  }))
                                }
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
    </div>
  );
}
