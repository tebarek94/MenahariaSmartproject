import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { paymentsService } from "@/services/payments.service.js";
import { ticketsService } from "@/services/tickets.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { formatDate, formatMoney, localInputToSqlDatetime, toDatetimeLocalValue } from "@/utils/format.js";

const METHODS = ["cash", "mobile", "bank"];
const STATUSES = ["pending", "completed", "failed", "refunded"];

function generateTransactionRef() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TXN-${ts}-${rand}`;
}

function paidAtToBody(localVal) {
  if (!localVal) return null;
  const d = new Date(localVal);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace("T", " ");
  return localInputToSqlDatetime(localVal);
}

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [cTicket, setCTicket] = useState("");
  const [cAmount, setCAmount] = useState("");
  const [cMethod, setCMethod] = useState("cash");
  const [cRef, setCRef] = useState("");
  const [cStatus, setCStatus] = useState("pending");
  const [cPaidAt, setCPaidAt] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    ticket_id: "",
    amount: "",
    method: "cash",
    transaction_ref: "",
    status: "pending",
    paid_at: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, t] = await Promise.all([
        paymentsService.list(),
        ticketsService.list(),
      ]);
      setPayments(Array.isArray(p) ? p : []);
      setTickets(Array.isArray(t) ? t : []);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ticketOptions = useMemo(() => {
    return tickets.map((t) => {
      const passenger =
        String(t?.passenger_name ?? "").trim() ||
        String(t?.user_full_name ?? "").trim() ||
        (t?.user_id != null ? `User #${t.user_id}` : "Unknown passenger");
      const route =
        t?.origin && t?.destination ? ` · ${t.origin} → ${t.destination}` : "";
      return {
        id: t.id,
        label: `#${t.id} · ${passenger}${route}`,
      };
    });
  }, [tickets]);

  function openEdit(x) {
    setEditingId(x.id);
    setEditForm({
      ticket_id: x.ticket_id != null ? String(x.ticket_id) : "",
      amount: String(x.amount ?? ""),
      method: x.method ?? "cash",
      transaction_ref: x.transaction_ref ?? "",
      status: x.status ?? "pending",
      paid_at: toDatetimeLocalValue(x.paid_at),
    });
    setError("");
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm({
      ticket_id: "",
      amount: "",
      method: "cash",
      transaction_ref: "",
      status: "pending",
      paid_at: "",
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (cAmount === "" || !cMethod) {
      setError("Amount and method are required.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        amount: Number(cAmount),
        method: cMethod,
        status: cStatus,
      };
      if (cTicket) body.ticket_id = Number(cTicket);
      const ref = cRef.trim();
      body.transaction_ref = ref || generateTransactionRef();
      const paid = paidAtToBody(cPaidAt);
      if (paid) body.paid_at = paid;
      await paymentsService.create(body);
      setNotice("Payment created.");
      setCTicket("");
      setCAmount("");
      setCMethod("cash");
      setCRef("");
      setCStatus("pending");
      setCPaidAt("");
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
    const { ticket_id, amount, method, transaction_ref, status, paid_at } =
      editForm;
    if (amount === "" || !method || !status) {
      setError("Amount, method, and status are required.");
      return;
    }
    setSavingEdit(true);
    try {
      const body = {
        ticket_id: ticket_id ? Number(ticket_id) : null,
        amount: Number(amount),
        method,
        transaction_ref: transaction_ref.trim() || generateTransactionRef(),
        status,
        paid_at: paidAtToBody(paid_at),
      };
      await paymentsService.update(editingId, body);
      setNotice("Payment updated.");
      closeEdit();
      await refresh();
    } catch (e) {
      setError(e?.data?.message || e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Delete this payment?")) return;
    setError("");
    setNotice("");
    if (editingId === id) closeEdit();
    try {
      await paymentsService.remove(id);
      setNotice("Payment deleted.");
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  if (loading && !payments.length) {
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

      <Card title="Create payment">
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Select
            label="Ticket (optional)"
            value={cTicket}
            onChange={(e) => setCTicket(e.target.value)}
          >
            <option value="">—</option>
            {ticketOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            value={cAmount}
            onChange={(e) => setCAmount(e.target.value)}
            required
          />
          <Select
            label="Method"
            value={cMethod}
            onChange={(e) => setCMethod(e.target.value)}
            required
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Input
            label="Transaction ref (optional)"
            value={cRef}
            onChange={(e) => setCRef(e.target.value)}
          />
          <Select
            label="Status"
            value={cStatus}
            onChange={(e) => setCStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            label="Paid at (optional)"
            type="datetime-local"
            value={cPaidAt}
            onChange={(e) => setCPaidAt(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="All payments">
        <div className="mb-3">
          <Button variant="ghost" className="!text-xs" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-primary-900/30">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="bg-slate-900/95 text-xs uppercase text-primary-400/90">
              <tr className="border-b border-primary-900/40">
                <th className="px-2 py-2">Id</th>
                <th className="px-2 py-2">Ticket</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Method</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Paid</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No payments
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-2 py-2 font-mono text-xs">{p.id}</td>
                      <td className="px-2 py-2 text-slate-400">
                        {p.ticket_id ?? "—"}
                      </td>
                      <td className="px-2 py-2">{formatMoney(p.amount)}</td>
                      <td className="px-2 py-2">{p.method}</td>
                      <td className="px-2 py-2">{p.status}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
                        {formatDate(p.paid_at)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="Edit"
                            onClick={() => openEdit(p)}
                          >
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            label="Delete"
                            onClick={() => handleRemove(p.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === p.id ? (
                      <tr className="bg-primary-950/20">
                        <td colSpan={7} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <Select
                                label="Ticket"
                                value={editForm.ticket_id}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    ticket_id: e.target.value,
                                  }))
                                }
                              >
                                <option value="">—</option>
                                {ticketOptions.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.label}
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
                                required
                              />
                              <Select
                                label="Method"
                                value={editForm.method}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    method: e.target.value,
                                  }))
                                }
                                required
                              >
                                {METHODS.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                label="Transaction ref"
                                value={editForm.transaction_ref}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    transaction_ref: e.target.value,
                                  }))
                                }
                              />
                              <Select
                                label="Status"
                                value={editForm.status}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    status: e.target.value,
                                  }))
                                }
                                required
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                label="Paid at"
                                type="datetime-local"
                                value={editForm.paid_at}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    paid_at: e.target.value,
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
