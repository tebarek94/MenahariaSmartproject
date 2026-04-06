import { queryAsync } from "../config/db.js";

export const createPayment = (
  ticketId,
  amount,
  method,
  transactionRef,
  status,
  paidAt
) =>
  queryAsync(
    `INSERT INTO payments (ticket_id, amount, method, transaction_ref, status, paid_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ticketId ?? null,
      amount,
      method,
      transactionRef ?? null,
      status ?? "pending",
      paidAt ?? null,
    ]
  );

export const getAllPayments = () =>
  queryAsync("SELECT * FROM payments ORDER BY id DESC");

export const getPaymentById = (id) =>
  queryAsync("SELECT * FROM payments WHERE id = ?", [id]);

export const getPaymentByIdWithTicketUser = (id) =>
  queryAsync(
    `SELECT p.*, t.user_id AS ticket_user_id
     FROM payments p
     LEFT JOIN tickets t ON t.id = p.ticket_id
     WHERE p.id = ?`,
    [id]
  );

export const updatePayment = (
  id,
  ticketId,
  amount,
  method,
  transactionRef,
  status,
  paidAt
) =>
  queryAsync(
    `UPDATE payments SET ticket_id = ?, amount = ?, method = ?, transaction_ref = ?,
     status = ?, paid_at = ? WHERE id = ?`,
    [
      ticketId ?? null,
      amount,
      method,
      transactionRef ?? null,
      status,
      paidAt ?? null,
      id,
    ]
  );

export const deletePayment = (id) =>
  queryAsync("DELETE FROM payments WHERE id = ?", [id]);

export const getPaymentsForPassenger = (userId) =>
  queryAsync(
    `SELECT p.* FROM payments p
     INNER JOIN tickets t ON t.id = p.ticket_id
     WHERE t.user_id = ?
     ORDER BY p.id DESC`,
    [userId]
  );
