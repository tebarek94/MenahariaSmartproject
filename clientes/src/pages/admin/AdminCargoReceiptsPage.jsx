import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { cargoReceiptsService } from "@/services/cargoReceipts.service.js";
import { cargoService } from "@/services/cargo.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon, DownloadIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
import { formatDate, formatMoney } from "@/utils/format.js";
import { downloadCargoReceiptHtml } from "@/utils/cargoReceiptDocument.js";

function paymentTone(s) {
  const v = String(s ?? "").toLowerCase();
  if (v === "paid" || v === "completed" || v === "success") {
    return "bg-emerald-500/20 text-emerald-300";
  }
  if (v === "pending") {
    return "bg-amber-500/20 text-amber-200";
  }
  if (v === "failed" || v === "cancelled") {
    return "bg-red-500/20 text-red-300";
  }
  return "bg-slate-500/20 text-slate-300";
}

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

function DetailRow({ r }) {
  return (
    <div className="grid gap-3 border-t border-primary-900/30 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Receipt
        </p>
        <p className="text-slate-200">{r.id}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Amount paid
        </p>
        <p className="text-lg font-semibold text-primary-300">
          {formatMoney(r.amount)}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Issued at
        </p>
        <p className="text-slate-200">{formatDate(r.issued_at)}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Cargo
        </p>
        <p className="text-slate-200">
          ID {r.cargo_id ?? "—"}
          {r.tracking_code ? (
            <span className="block text-xs text-slate-400">
              Tracking: {r.tracking_code}
            </span>
          ) : null}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Shipment
        </p>
        <p className="text-slate-300">
          Status: {r.cargo_status ?? "—"}
        </p>
        <p className="mt-1 text-slate-300">
          Payment:{" "}
          <span
            className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${paymentTone(r.cargo_payment_status)}`}
          >
            {r.cargo_payment_status ?? "pending"}
          </span>
        </p>
        <p className="text-xs text-slate-500">
          Weight: {r.cargo_weight_kg ?? "—"} kg · Fee:{" "}
          {formatMoney(r.cargo_fee)}
        </p>
        {r.cargo_content_brief ? (
          <p className="mt-1 text-xs text-slate-400">{r.cargo_content_brief}</p>
        ) : null}
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Passenger
        </p>
        <p className="text-slate-200">{r.owner_name ?? "—"}</p>
        <p className="text-xs text-slate-500">{r.owner_phone ?? ""}</p>
        {r.owner_email ? (
          <p className="text-xs text-slate-500">{r.owner_email}</p>
        ) : null}
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Trip & vehicle
        </p>
        <p className="text-slate-300">{r.route_summary?.trim() || "—"}</p>
        <p className="text-xs text-slate-500">
          Plate: {r.vehicle_plate ?? "—"}
          {r.trip_departure ? (
            <span className="ml-2">Departure: {r.trip_departure}</span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-3 sm:col-span-2 lg:col-span-3">
        <Button
          type="button"
          variant="secondary"
          className="inline-flex items-center gap-2"
          onClick={() => downloadCargoReceiptHtml(r)}
        >
          <DownloadIcon className="h-4 w-4" />
          Download receipt
        </Button>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "issued_at", label: "Issued" },
  { value: "id", label: "ID" },
  { value: "amount", label: "Amount" },
  { value: "cargo_id", label: "Cargo" },
  { value: "owner_name", label: "Owner" },
  { value: "cargo_payment_status", label: "Payment status" },
  { value: "tracking_code", label: "Tracking" },
];

const HEADER_SORT_KEYS = {
  Id: "id",
  Cargo: "cargo_id",
  Amount: "amount",
  Issued: "issued_at",
  Passenger: "owner_name",
  Payment: "cargo_payment_status",
};

export function AdminCargoReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [cargo, setCargo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: "" });
  const [deleting, setDeleting] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [sortKey, setSortKey] = useState("issued_at");
  const [sortDir, setSortDir] = useState("desc");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ cargo_id: "", amount: "" });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r, c] = await Promise.all([
        cargoReceiptsService.list(),
        cargoService.list(),
      ]);
      setReceipts(normalizeList(r));
      setCargo(normalizeList(c));
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const cargoOptions = useMemo(() => {
    return cargo.map((c) => {
      const tracking = String(c?.tracking_code ?? "").trim();
      const content = String(c?.content ?? "").trim();
      const owner = String(c?.owner_name ?? "").trim();
      const ownerPhone = String(c?.owner_phone ?? "").trim();
      const primary = tracking || content || "cargo";
      const ownerInfo = owner || ownerPhone ? ` · ${owner || "Unknown"}${ownerPhone ? ` (${ownerPhone})` : ""}` : "";
      return {
        id: c.id,
        label: `#${c.id} · ${primary}${ownerInfo}`,
      };
    });
  }, [cargo]);

  const filteredSorted = useMemo(() => {
    let rows = [...receipts];
    const q = search.trim().toLowerCase();
    const pay = filterPayment.trim().toLowerCase();
    if (pay) {
      rows = rows.filter(
        (r) => String(r?.cargo_payment_status ?? "").toLowerCase() === pay
      );
    }
    if (q) {
      rows = rows.filter((r) => {
        if (!r) return false;
        const parts = [
          r?.id,
          r?.cargo_id,
          r?.amount,
          r?.issued_at,
          r?.tracking_code,
          r?.owner_name,
          r?.owner_phone,
          r?.owner_email,
          r?.route_summary,
          r?.vehicle_plate,
          r?.cargo_status,
          r?.cargo_payment_status,
          r?.cargo_content_brief,
          r?.brief_description,
          r?.trip_departure,
          r?.cargo_weight_kg,
          r?.cargo_fee,
        ]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return parts.some((s) => s.includes(q));
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (!a || !b) return 0;
      if (!sortKey) return 0;
      let va = a?.[sortKey];
      let vb = b?.[sortKey];
      
      if (sortKey === "issued_at") {
        try {
          va = va ? new Date(va).getTime() : 0;
          vb = vb ? new Date(vb).getTime() : 0;
        } catch (dateError) {
          console.warn("Date parsing error:", dateError);
          va = 0;
          vb = 0;
        }
      } else if (["id", "cargo_id", "amount"].includes(sortKey)) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else {
        va = String(va ?? "").toLowerCase();
        vb = String(vb ?? "").toLowerCase();
      }
      
      // Additional safety check for comparison
      if (typeof va !== typeof vb) {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [receipts, search, filterPayment, sortKey, sortDir]);

  function openEdit(x) {
    setEditingId(x.id);
    setDetailId(null);
    setEditForm({
      cargo_id: x.cargo_id != null ? String(x.cargo_id) : "",
      amount: x.amount != null ? String(x.amount) : "",
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({ cargo_id: "", amount: "" });
  }

  function toggleDetail(id) {
    setDetailId((cur) => (cur === id ? null : id));
    if (editingId === id) closeEdit();
  }

  function handleHeaderSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function sortIndicator(key) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (editingId == null) return;
    setNotice("");
    setError("");
    setSavingEdit(true);
    try {
      const body = {
        cargo_id: editForm.cargo_id ? Number(editForm.cargo_id) : null,
        amount:
          editForm.amount !== "" && !Number.isNaN(Number(editForm.amount))
            ? Number(editForm.amount)
            : null,
      };
      await cargoReceiptsService.update(editingId, body);
      setNotice("Receipt updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    setDeleteModal({ isOpen: true, id, name: `Receipt #${id}` });
  }

  const confirmDelete = async () => {
    const { id } = deleteModal;
    setError("");
    setNotice("");
    setDeleting(true);
    
    if (editingId === id) closeEdit();
    
    try {
      await cargoReceiptsService.remove(id);
      setNotice("Cargo receipt deleted successfully.");
      setDeleteModal({ isOpen: false, id: null, name: "" });
      await refresh();
    } catch (err) {
      console.error("Delete cargo receipt error:", err);
      let errorMessage = "Failed to delete cargo receipt.";
      
      if (err.status === 500) {
        errorMessage = "Server error occurred. The cargo receipt may have associated payments.";
      } else if (err.status === 403) {
        errorMessage = "You don't have permission to delete this cargo receipt.";
      } else if (err.status === 404) {
        errorMessage = "Cargo receipt not found. It may have already been deleted.";
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

  const colCount = 9;

  if (loading && !receipts.length) {
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

      <Card title="Cargo Receipts">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, cargo, owner, amount, tracking…"
            />
          </div>
          <Select
            label="Sort by"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="min-w-[160px]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Payment"
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="min-w-[160px]"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select
            label="Order"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
            className="min-w-[120px]"
          >
            <option value="desc">Newest / high → low</option>
            <option value="asc">Oldest / low → high</option>
          </Select>
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
          <Button
            variant="ghost"
            className="!text-xs"
            onClick={() => {
              setSearch("");
              setFilterPayment("");
              setSortKey("issued_at");
              setSortDir("desc");
            }}
          >
            Clear filters
          </Button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Showing {filteredSorted.length} of {receipts.length}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                {["Id", "Cargo", "Amount", "Issued", "Passenger", "Payment"].map(
                  (label) => {
                    const key = HEADER_SORT_KEYS[label];
                    return (
                      <th key={label} className="px-2 py-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-primary-300"
                          onClick={() => handleHeaderSort(key)}
                          title={`Sort by ${label}`}
                        >
                          {label}
                          <span className="text-[10px] opacity-80">
                            {sortIndicator(key)}
                          </span>
                        </button>
                      </th>
                    );
                  }
                )}
                <th className="px-2 py-2">Download</th>
                <th className="px-2 py-2">Details</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {receipts.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No receipts
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No rows match your search
                  </td>
                </tr>
              ) : (
                filteredSorted.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                      <td className="px-2 py-2 text-slate-400">
                        {r.cargo_id ?? "—"}
                        {r.tracking_code ? (
                          <span className="block truncate text-[10px] text-slate-500">
                            {r.tracking_code}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 font-medium text-slate-200">
                        {formatMoney(r.amount)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(r.issued_at)}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2 text-slate-400">
                        {String(r.owner_name ?? "").trim() || "—"}
                        {r.owner_phone ? (
                          <span className="block truncate text-[10px] text-slate-500">
                            {r.owner_phone}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${paymentTone(r.cargo_payment_status)}`}
                        >
                          {r.cargo_payment_status ?? "pending"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 hover:underline"
                          onClick={() => downloadCargoReceiptHtml(r)}
                        >
                          <DownloadIcon className="h-3.5 w-3.5 shrink-0" />
                          Receipt
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-slate-400 hover:text-slate-200"
                          onClick={() => toggleDetail(r.id)}
                        >
                          {detailId === r.id ? "Hide" : "View"}
                        </button>
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
                    {detailId === r.id ? (
                      <tr className="bg-slate-950/80">
                        <td colSpan={colCount} className="p-4">
                          <DetailRow r={r} />
                        </td>
                      </tr>
                    ) : null}
                    {editingId === r.id ? (
                      <tr className="bg-primary-950/20">
                        <td colSpan={colCount} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Select
                                label="Cargo"
                                value={editForm.cargo_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    cargo_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">select cargo</option>
                                {cargoOptions.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                label="Amount"
                                type="number"
                                step="0.01"
                                value={editForm.amount}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    amount: e.target.value,
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

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: "" })}
        onConfirm={confirmDelete}
        title="Delete Cargo Receipt"
        message={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone and may affect associated payments.`}
        itemName={deleteModal.name}
        loading={deleting}
      />
    </div>
  );
}
