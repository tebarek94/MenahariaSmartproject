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
import { PencilIcon, CheckIcon, TrashIcon, XIcon } from "@/ui/icons.jsx";
import { DeleteModal } from "@/components/DeleteModal.jsx";
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

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
      setPayments(Array.isArray(p) ? p : []);
      setTickets(Array.isArray(t) ? t : []);
      setUsers(Array.isArray(u) ? u : []);
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
      const paymentDetails = await paymentsService.getById(payment.id);
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
      case "completed": return "text-green-400";
      case "pending": return "text-yellow-400";
      case "failed": return "text-red-400";
      case "refunded": return "text-blue-400";
      default: return "text-gray-400";
    }
  };

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

      <Card title="Payments">
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
                      <tr className="bg-primary-950/20">
                        <td colSpan={7} className="p-4">
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <p className="text-xs font-medium text-primary-300">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Payment Details</h2>
                  <p className="text-slate-400">Transaction ID: #{selectedPayment.id}</p>
                </div>
                <Button variant="ghost" onClick={handleCloseDetails}>
                  <XIcon />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Payment Summary */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Payment Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Amount</p>
                      <p className="text-lg font-bold text-green-400">{formatMoney(selectedPayment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <span className={`text-sm font-medium ${getStatusColor(selectedPayment.status)}`}>
                        {selectedPayment.status?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Payment Method</p>
                      <p className="text-white">{selectedPayment.method?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Transaction Reference</p>
                      <p className="text-white">{selectedPayment.transaction_ref || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* User Information */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">User Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Customer Name</p>
                      <p className="text-white">{getUserName(selectedPayment.user_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">User ID</p>
                      <p className="text-white">#{selectedPayment.user_id}</p>
                    </div>
                    {selectedPayment.ticket_id && (
                      <>
                        <div>
                          <p className="text-sm text-slate-400">Associated Ticket</p>
                          <p className="text-white">{getTicketInfo(selectedPayment.ticket_id)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Ticket ID</p>
                          <p className="text-white">#{selectedPayment.ticket_id}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Transaction Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-white">{formatDate(selectedPayment.created_at)}</span>
                    </div>
                    {selectedPayment.paid_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Paid At</span>
                        <span className="text-white">{formatDate(selectedPayment.paid_at)}</span>
                      </div>
                    )}
                    {selectedPayment.updated_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Updated</span>
                        <span className="text-white">{formatDate(selectedPayment.updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedPayment.status === 'pending' && (
                    <Button variant="primary">
                      Mark as Completed
                    </Button>
                  )}
                  {selectedPayment.status === 'completed' && (
                    <Button variant="secondary">
                      Process Refund
                    </Button>
                  )}
                  <Button variant="ghost" onClick={handleCloseDetails}>
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
