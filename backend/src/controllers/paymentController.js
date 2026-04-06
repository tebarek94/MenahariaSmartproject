import * as paymentModel from "../models/paymentModel.js";
import { queryAsync } from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isPassenger } from "../constants/roles.js";

async function ticketOwnedBy(ticketId, userId) {
  if (ticketId == null) return false;
  const rows = await queryAsync(
    "SELECT user_id FROM tickets WHERE id = ?",
    [ticketId]
  );
  return rows.length && Number(rows[0].user_id) === Number(userId);
}

export const create = async (req, res) => {
  try {
    const { ticket_id, amount, method, transaction_ref, status, paid_at } =
      req.body;
    if (amount == null || !method) {
      return sendError(res, "amount and method are required", 400);
    }
    if (!isAdmin(req.roleName)) {
      if (!isPassenger(req.roleName)) {
        return sendError(res, "Forbidden", 403);
      }
      const ok = await ticketOwnedBy(
        ticket_id != null ? Number(ticket_id) : null,
        req.user.id
      );
      if (!ok) return sendError(res, "Ticket not found or not yours", 403);
    }
    const result = await paymentModel.createPayment(
      ticket_id != null ? Number(ticket_id) : null,
      Number(amount),
      method,
      transaction_ref,
      status,
      paid_at ?? null
    );
    return sendSuccess(res, { message: "Payment created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create payment", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    if (isAdmin(req.roleName)) {
      const rows = await paymentModel.getAllPayments();
      return sendSuccess(res, rows);
    }
    if (isPassenger(req.roleName)) {
      const rows = await paymentModel.getPaymentsForPassenger(req.user.id);
      return sendSuccess(res, rows);
    }
    return sendError(res, "Forbidden", 403);
  } catch (err) {
    return sendError(res, "Failed to list payments", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await paymentModel.getPaymentByIdWithTicketUser(req.params.id);
    if (!rows.length) return sendError(res, "Payment not found", 404);
    if (isAdmin(req.roleName)) {
      return sendSuccess(res, rows[0]);
    }
    if (
      isPassenger(req.roleName) &&
      rows[0].ticket_user_id != null &&
      Number(rows[0].ticket_user_id) === Number(req.user.id)
    ) {
      return sendSuccess(res, rows[0]);
    }
    return sendError(res, "Forbidden", 403);
  } catch (err) {
    return sendError(res, "Failed to get payment", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const { ticket_id, amount, method, transaction_ref, status, paid_at } =
      req.body;
    if (amount == null || !method || !status) {
      return sendError(res, "amount, method, and status are required", 400);
    }
    await paymentModel.updatePayment(
      req.params.id,
      ticket_id != null ? Number(ticket_id) : null,
      Number(amount),
      method,
      transaction_ref,
      status,
      paid_at ?? null
    );
    return sendSuccess(res, { message: "Payment updated" });
  } catch (err) {
    return sendError(res, "Failed to update payment", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    await paymentModel.deletePayment(req.params.id);
    return sendSuccess(res, { message: "Payment deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete payment", 500, err);
  }
};
