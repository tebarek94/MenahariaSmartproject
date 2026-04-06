import * as ticketModel from "../models/ticketModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { attachTicketQr } from "../utils/ticketQr.js";
import { isAdmin, isDriver, isPassenger } from "../constants/roles.js";

function canReadTicket(req, row) {
  if (isAdmin(req.roleName)) return true;
  if (isPassenger(req.roleName) && Number(row.user_id) === Number(req.user.id))
    return true;
  if (
    isDriver(req.roleName) &&
    row.trip_driver_id != null &&
    Number(row.trip_driver_id) === Number(req.user.id)
  )
    return true;
  return false;
}

export const create = async (req, res) => {
  try {
    if (isDriver(req.roleName)) {
      return sendError(res, "Drivers cannot create tickets", 403);
    }
    let { user_id, trip_id, seat_id, ticket_code, status, payment_status } =
      req.body;
    if (trip_id == null || seat_id == null) {
      return sendError(res, "trip_id and seat_id are required", 400);
    }
    if (isPassenger(req.roleName)) {
      user_id = req.user.id;
    }
    if (user_id == null) {
      return sendError(res, "user_id is required", 400);
    }
    const result = await ticketModel.createTicket(
      Number(user_id),
      Number(trip_id),
      Number(seat_id),
      ticket_code,
      status,
      payment_status
    );
    const rows = await ticketModel.getTicketWithDetailsById(result.insertId);
    if (!rows.length) {
      return sendSuccess(
        res,
        { message: "Ticket created", id: result.insertId },
        201
      );
    }
    if (!canReadTicket(req, rows[0])) {
      return sendSuccess(res, { message: "Ticket created", id: result.insertId }, 201);
    }
    const ticket = await attachTicketQr(rows[0], { includeImage: true });
    return sendSuccess(res, { message: "Ticket created", ticket }, 201);
  } catch (err) {
    return sendError(res, "Failed to create ticket", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    let rows;
    if (isAdmin(req.roleName)) {
      rows = await ticketModel.getAllTicketsWithDetails();
    } else if (isDriver(req.roleName)) {
      rows = await ticketModel.getTicketsWithDetailsForDriver(req.user.id);
    } else if (isPassenger(req.roleName)) {
      rows = await ticketModel.getTicketsWithDetailsForPassenger(req.user.id);
    } else {
      return sendError(res, "Forbidden", 403);
    }
    const tickets = await Promise.all(
      rows.map((r) => attachTicketQr(r, { includeImage: false }))
    );
    return sendSuccess(res, tickets);
  } catch (err) {
    return sendError(res, "Failed to list tickets", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await ticketModel.getTicketWithDetailsById(req.params.id);
    if (!rows.length) return sendError(res, "Ticket not found", 404);
    if (!canReadTicket(req, rows[0])) {
      return sendError(res, "Forbidden", 403);
    }
    const ticket = await attachTicketQr(rows[0], { includeImage: true });
    return sendSuccess(res, ticket);
  } catch (err) {
    return sendError(res, "Failed to get ticket", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    if (isDriver(req.roleName)) {
      return sendError(res, "Drivers cannot update tickets", 403);
    }
    const existing = await ticketModel.getTicketWithDetailsById(req.params.id);
    if (!existing.length) return sendError(res, "Ticket not found", 404);
    if (!canReadTicket(req, existing[0])) {
      return sendError(res, "Forbidden", 403);
    }
    let { user_id, trip_id, seat_id, ticket_code, status, payment_status } =
      req.body;
    if (
      user_id == null ||
      trip_id == null ||
      seat_id == null ||
      !status ||
      !payment_status
    ) {
      return sendError(
        res,
        "user_id, trip_id, seat_id, status, and payment_status are required",
        400
      );
    }
    if (isPassenger(req.roleName)) {
      if (Number(existing[0].user_id) !== Number(req.user.id)) {
        return sendError(res, "Forbidden", 403);
      }
      user_id = req.user.id;
    }
    await ticketModel.updateTicket(
      req.params.id,
      Number(user_id),
      Number(trip_id),
      Number(seat_id),
      ticket_code,
      status,
      payment_status
    );
    const rows = await ticketModel.getTicketWithDetailsById(req.params.id);
    if (!rows.length) {
      return sendSuccess(res, { message: "Ticket updated" });
    }
    const ticket = await attachTicketQr(rows[0], { includeImage: true });
    return sendSuccess(res, { message: "Ticket updated", ticket });
  } catch (err) {
    return sendError(res, "Failed to update ticket", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    if (isDriver(req.roleName)) {
      return sendError(res, "Drivers cannot delete tickets", 403);
    }
    const existing = await ticketModel.getTicketWithDetailsById(req.params.id);
    if (!existing.length) return sendError(res, "Ticket not found", 404);
    if (isPassenger(req.roleName)) {
      if (Number(existing[0].user_id) !== Number(req.user.id)) {
        return sendError(res, "Forbidden", 403);
      }
    } else if (!isAdmin(req.roleName)) {
      return sendError(res, "Forbidden", 403);
    }
    await ticketModel.deleteTicket(req.params.id);
    return sendSuccess(res, { message: "Ticket deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete ticket", 500, err);
  }
};
