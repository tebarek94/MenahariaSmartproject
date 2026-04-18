import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { paymentsService } from "@/services/payments.service.js";
import { ticketsService } from "@/services/tickets.service.js";
import { adminUsersService } from "@/services/adminUsers.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { IconButton } from "@/ui/IconButton.jsx";
import { PencilIcon, CheckIcon, XIcon } from "@/ui/icons.jsx";
import { formatDate, formatMoney, localInputToSqlDatetime, toDatetimeLocalValue } from "@/utils/format.js";
import { cn } from "@/utils/cn.js";

const METHODS = ["cash", "mobile", "bank"];
const STATUSES = ["pending", "completed", "failed", "refunded"];

const PAYMENT_SORT_KEYS = [
  { key: "id", label: "Id" },
  { key: "ticket_id", label: "Ticket" },
  { key: "amount", label: "Amount" },
  { key: "method", label: "Method" },
  { key: "status", label: "Status" },
  { key: "paid_at", label: "Paid" },
];

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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [sortKey, setSortKey] = useState("paid_at");
  const [sortDir, setSortDir] = useState("desc");

  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [cTicketId, setCTicketId] = useState("");
  const [cAmount, setCAmount] = useState("");
  const [cMethod, setCMethod] = useState("cash");
  const [cTransactionRef, setCTransactionRef] = useState("");
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
      const [p, t, u] = await Promise.all([
        paymentsService.list(),
        ticketsService.list(),
        adminUsersService.list(),
      ]);
      const normalize = (x) =>
        Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
      setPayments(normalize(p));
      setTickets(normalize(t));
      setUsers(normalize(u));
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleViewDetails = async (payment) => {
    try {
      const paymentDetails = await paymentsService.get(payment.id);
      setSelectedPayment(paymentDetails);
      setShowDetails(true);
    } catch (err) {
      console.error("Failed to load payment details:", err);
      setError("Failed to load payment details");
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedPayment(null);
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || `User #${userId}`;
  };

  const getTicketInfo = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket ? `Ticket #${ticket.id}` : "N/A";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-emerald-700 dark:text-emerald-400";
      case "pending":
        return "text-amber-700 dark:text-amber-400";
      case "failed":
        return "text-red-700 dark:text-red-400";
      case "refunded":
        return "text-sky-700 dark:text-sky-400";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const statusQ = filterStatus.trim().toLowerCase();
    const methodQ = filterMethod.trim().toLowerCase();
    let rows = [...payments];

    if (statusQ) {
      rows = rows.filter(
        (p) => String(p?.status ?? "").toLowerCase() === statusQ
      );
    }
    if (methodQ) {
      rows = rows.filter(
        (p) => String(p?.method ?? "").toLowerCase() === methodQ
      );
    }
    if (q) {
      rows = rows.filter((p) => {
        const parts = [
          p?.id,
          p?.ticket_id,
          p?.user_id,
          p?.amount,
          p?.method,
          p?.status,
          p?.transaction_ref,
          p?.paid_at,
          p?.created_at,
          p?.updated_at,
          getUserName(p?.user_id),
          getTicketInfo(p?.ticket_id),
        ]
          .filter((x) => x != null && x !== "")
          .map((x) => String(x).toLowerCase());
        return parts.some((s) => s.includes(q));
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let va = a?.[sortKey];
      let vb = b?.[sortKey];
      if (["id", "ticket_id", "amount"].includes(sortKey)) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else if (sortKey === "paid_at") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else {
        va = String(va ?? "").toLowerCase();
        vb = String(vb ?? "").toLowerCase();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [payments, search, filterStatus, filterMethod, sortKey, sortDir, users, tickets]);

  function handleColumnSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    if (cAmount === "" || Number.isNaN(Number(cAmount))) {
      setError("Amount is required (number).");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        amount: Number(cAmount),
        method: cMethod,
        transaction_ref: cTransactionRef.trim() || generateTransactionRef(),
        status: cStatus,
        paid_at: paidAtToBody(cPaidAt),
      };
      if (cTicketId) body.ticket_id = Number(cTicketId);
      await paymentsService.create(body);
      setNotice("Payment created.");
      setCTicketId("");
      setCAmount("");
      setCMethod("cash");
      setCTransactionRef("");
      setCStatus("pending");
      setCPaidAt("");
      setAddPaymentOpen(false);
      await refresh();
    } catch (err) {
      setError(err?.data?.message || err?.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

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

  if (loading && !payments.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl">
            Payments
          </h1>
          <p className="text-p-muted max-w-xl text-sm sm:text-[0.95rem]">
            Record and review ticket payments. Use{" "}
            <strong className="font-semibold text-p-heading">Add payment</strong> to open the
            form. Link a ticket when applicable.
          </p>
        </div>
        <Button
          type="button"
          variant={addPaymentOpen ? "secondary" : "primary"}
          className="shrink-0"
          onClick={() => {
            setAddPaymentOpen((o) => !o);
            setError("");
          }}
          aria-expanded={addPaymentOpen}
          aria-controls="admin-add-payment-panel"
        >
          {addPaymentOpen ? "Close form" : "Add payment"}
        </Button>
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

      {addPaymentOpen ? (
        <div id="admin-add-payment-panel">
          <Card
            title="Create payment"
            subtitle="Amount and method are required. Ticket is optional. Leave reference empty to auto-generate."
          >
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Select
                label="Ticket (optional)"
                name="payment_ticket"
                value={cTicketId}
                onChange={(e) => setCTicketId(e.target.value)}
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
                name="payment_amount"
                value={cAmount}
                onChange={(e) => setCAmount(e.target.value)}
                required
              />
              <Select
                label="Method"
                name="payment_method"
                value={cMethod}
                onChange={(e) => setCMethod(e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              <Input
                label="Transaction ref (optional)"
                name="payment_ref"
                value={cTransactionRef}
                onChange={(e) => setCTransactionRef(e.target.value)}
                placeholder="Auto if empty"
              />
              <Select
                label="Status"
                name="payment_status"
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
                name="payment_paid_at"
                value={cPaidAt}
                onChange={(e) => setCPaidAt(e.target.value)}
              />
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create payment"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddPaymentOpen(false);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      <Card
        title="All payments"
        subtitle="Search and filter. Sort columns by clicking the table headers (▲/▼)."
      >
        <div className="mb-4 flex flex-col gap-4 border-b border-primary-200/90 pb-4 dark:border-primary-900/25 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="max-w-md min-w-[200px] flex-1">
            <Input
              label="Search"
              type="search"
              name="payments_table_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Id, ticket, user, method, status, ref…"
              autoComplete="off"
              className="w-full"
            />
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:max-w-md">
            <Select
              label="Status"
              name="payments_filter_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              label="Method"
              name="payments_filter_method"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full"
            >
              <option value="">All methods</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mb-2 text-xs text-slate-600 dark:text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-300">
            {filteredSorted.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-300">
            {payments.length}
          </span>{" "}
          payments
          {search.trim() || filterStatus || filterMethod ? " (filtered)" : ""}
        </p>
        <div className="overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm dark:border-primary-900/40 dark:bg-slate-950/40 dark:shadow-none">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-primary-200 bg-slate-50/95 text-xs uppercase tracking-wide text-primary-900 shadow-sm backdrop-blur-sm dark:border-primary-900/40 dark:bg-slate-900/95 dark:text-primary-400/95 dark:shadow-none">
              <tr>
                {PAYMENT_SORT_KEYS.map(({ key, label }) => {
                  const active = sortKey === key;
                  return (
                    <th key={key} scope="col" className="px-2 py-2.5 font-semibold">
                      <button
                        type="button"
                        onClick={() => handleColumnSort(key)}
                        className={cn(
                          "flex w-full min-w-0 items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left transition-colors",
                          "text-slate-700 hover:bg-primary-100/90 hover:text-primary-950",
                          "dark:text-primary-300/95 dark:hover:bg-white/10 dark:hover:text-primary-50",
                          active &&
                            "bg-primary-100/80 font-semibold text-primary-950 dark:bg-white/10 dark:font-semibold dark:text-primary-100"
                        )}
                        aria-sort={
                          active
                            ? sortDir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <span className="truncate">{label}</span>
                        <span
                          className="shrink-0 tabular-nums text-[0.65rem] text-slate-500 opacity-90 dark:text-primary-400/80"
                          aria-hidden
                        >
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "◇"}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th
                  scope="col"
                  className="px-3 py-2.5 font-semibold text-slate-700 dark:text-primary-400/95"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No payments — use the Add payment button above to create one.
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="bg-white px-3 py-10 text-center text-slate-600 dark:bg-slate-950/20 dark:text-slate-400"
                  >
                    No payments match your search or filters.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("");
                        setFilterMethod("");
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSorted.map((p) => (
                  <Fragment key={p.id}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 bg-white transition-colors hover:bg-primary-50/70",
                        "dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-800/35"
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                        {p.id}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-slate-800 dark:text-slate-300">
                        {p.ticket_id ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 font-medium text-apptext dark:text-slate-100">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="px-2 py-2.5 text-slate-800 dark:text-slate-300">
                        {p.method}
                      </td>
                      <td className="px-2 py-2.5 capitalize text-slate-800 dark:text-slate-300">
                        {p.status}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(p.paid_at)}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1">
                          <IconButton
                            variant="ghost"
                            label="View Details"
                            onClick={() => handleViewDetails(p)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            label="Update Status"
                            onClick={() => openEdit(p)}
                          >
                            <PencilIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    {editingId === p.id ? (
                      <tr className="border-b border-slate-100 bg-primary-50/90 dark:border-slate-800/60 dark:bg-primary-950/25">
                        <td colSpan={7} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <p className="text-xs font-medium text-slate-700 dark:text-primary-300">
                              Update Payment Status - Payment #{p.id}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Select
                                label="Status"
                                value={editForm.status}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    status: e.target.value,
                                  }))
                                }
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                label="Paid At"
                                type="datetime-local"
                                value={toDatetimeLocalValue(editForm.paid_at)}
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
                                label="Update Status"
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

      {/* Payment Details Modal */}
      {showDetails && selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-details-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="payment-details-title"
                    className="text-xl font-bold text-slate-900 dark:text-white"
                  >
                    Payment Details
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Transaction ID: #{selectedPayment.id}
                  </p>
                </div>
                <Button variant="ghost" type="button" onClick={handleCloseDetails} aria-label="Close">
                  <XIcon />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50/95 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                    Payment Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Amount</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {formatMoney(selectedPayment.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Status</p>
                      <span
                        className={`text-sm font-medium ${getStatusColor(selectedPayment.status)}`}
                      >
                        {selectedPayment.status?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Payment Method</p>
                      <p className="text-slate-900 dark:text-white">
                        {selectedPayment.method?.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Transaction Reference
                      </p>
                      <p className="text-slate-900 dark:text-white">
                        {selectedPayment.transaction_ref || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/95 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                    User Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Customer Name</p>
                      <p className="text-slate-900 dark:text-white">
                        {getUserName(selectedPayment.user_id)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">User ID</p>
                      <p className="text-slate-900 dark:text-white">#{selectedPayment.user_id}</p>
                    </div>
                    {selectedPayment.ticket_id ? (
                      <>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Associated Ticket
                          </p>
                          <p className="text-slate-900 dark:text-white">
                            {getTicketInfo(selectedPayment.ticket_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Ticket ID</p>
                          <p className="text-slate-900 dark:text-white">
                            #{selectedPayment.ticket_id}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/95 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                    Transaction Timeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600 dark:text-slate-400">Created</span>
                      <span className="text-slate-900 dark:text-white">
                        {formatDate(selectedPayment.created_at)}
                      </span>
                    </div>
                    {selectedPayment.paid_at ? (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600 dark:text-slate-400">Paid At</span>
                        <span className="text-slate-900 dark:text-white">
                          {formatDate(selectedPayment.paid_at)}
                        </span>
                      </div>
                    ) : null}
                    {selectedPayment.updated_at ? (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-600 dark:text-slate-400">Last Updated</span>
                        <span className="text-slate-900 dark:text-white">
                          {formatDate(selectedPayment.updated_at)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {selectedPayment.status === "pending" ? (
                    <Button variant="primary" type="button" disabled>
                      Mark as Completed
                    </Button>
                  ) : null}
                  {selectedPayment.status === "completed" ? (
                    <Button variant="secondary" type="button" disabled>
                      Process Refund
                    </Button>
                  ) : null}
                  <Button variant="ghost" type="button" onClick={handleCloseDetails}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
