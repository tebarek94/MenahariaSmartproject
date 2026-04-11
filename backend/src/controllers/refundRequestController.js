import * as refundRequestModel from "../models/refundRequestModel.js";
import * as ticketModel from "../models/ticketModel.js";
import * as notificationModel from "../models/notificationModel.js";
import * as userModel from "../models/userModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isPassenger } from "../constants/roles.js";
import { emitToRole, emitToUser } from "../realtime/socketServer.js";

const MINUTES_BEFORE_DEPARTURE = 10;
const MS_WINDOW = MINUTES_BEFORE_DEPARTURE * 60 * 1000;

function normalizeStatus(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function isPaymentSettled(ps) {
  const s = normalizeStatus(ps);
  return s === "paid" || s === "completed";
}

async function notifyAdminsNewRequest(summary) {
  const msg = `Refund request #${summary.id}: ticket #${summary.ticket_id} — ${summary.passenger_name} (${summary.origin}→${summary.destination}). Review in Admin → Refund requests.`;
  emitToRole("admin", "refund_request:new", {
    id: summary.id,
    ticket_id: summary.ticket_id,
    passenger_user_id: summary.passenger_user_id,
  });
  const admins = await userModel.listAdminUsers();
  for (const row of admins) {
    const uid = Number(row.id);
    if (!Number.isInteger(uid) || uid <= 0) continue;
    try {
      const result = await notificationModel.createNotification(
        uid,
        msg,
        "push",
        "pending"
      );
      const nid = result?.insertId;
      if (nid) {
        emitToUser(uid, "notification:new", {
          id: nid,
          user_id: uid,
          message: msg,
          channel: "push",
          status: "pending",
        });
      }
    } catch (e) {
      console.error("notifyAdminsNewRequest:", e);
    }
  }
}

async function notifyPassengerResolution(passengerUserId, text, requestId) {
  const uid = Number(passengerUserId);
  if (!Number.isInteger(uid) || uid <= 0) return;
  try {
    const result = await notificationModel.createNotification(
      uid,
      text,
      "push",
      "pending"
    );
    const nid = result?.insertId;
    if (nid) {
      emitToUser(uid, "notification:new", {
        id: nid,
        user_id: uid,
        message: text,
        channel: "push",
        status: "pending",
      });
    }
    emitToUser(uid, "refund_request:updated", { id: requestId, message: text });
  } catch (e) {
    console.error("notifyPassengerResolution:", e);
  }
}

/** POST /api/refund-requests — passenger */
export const create = async (req, res) => {
  try {
    if (!isPassenger(req.roleName)) {
      return sendError(res, "Passengers only", 403);
    }
    const ticketId = Number(req.body?.ticket_id);
    const message =
      typeof req.body?.message === "string"
        ? req.body.message.slice(0, 1500)
        : null;
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return sendError(res, "ticket_id is required", 400);
    }

    const rows = await ticketModel.getTicketWithDetailsById(ticketId);
    if (!rows.length) return sendError(res, "Ticket not found", 404);
    const t = rows[0];
    if (Number(t.user_id) !== Number(req.user.id)) {
      return sendError(res, "Forbidden", 403);
    }

    const st = normalizeStatus(t.status);
    if (st === "cancelled" || st === "used") {
      return sendError(
        res,
        "This ticket cannot be refunded (cancelled or already used).",
        400
      );
    }
    if (st !== "reserved" && st !== "confirmed") {
      return sendError(res, "Invalid ticket status for a refund request.", 400);
    }

    const dep = t.departure_time ? new Date(t.departure_time) : null;
    if (!dep || Number.isNaN(dep.getTime())) {
      return sendError(res, "Trip departure time is missing.", 400);
    }
    const now = Date.now();
    if (dep.getTime() <= now) {
      return sendError(
        res,
        "The trip has already started or departed; refund requests are closed.",
        400
      );
    }
    if (dep.getTime() - now < MS_WINDOW) {
      return sendError(
        res,
        `Refund requests must be submitted at least ${MINUTES_BEFORE_DEPARTURE} minutes before departure.`,
        400
      );
    }

    const pending = await refundRequestModel.findPendingForTicket(ticketId);
    if (pending.length) {
      return sendError(
        res,
        "You already have a pending refund request for this ticket.",
        409
      );
    }
    const approved = await refundRequestModel.findApprovedForTicket(ticketId);
    if (approved.length) {
      return sendError(
        res,
        "This ticket already has an approved refund request.",
        409
      );
    }

    const ins = await refundRequestModel.createRefundRequest(
      ticketId,
      req.user.id,
      message
    );
    const newId = ins?.insertId;
    const full = newId
      ? await refundRequestModel.getRefundRequestById(newId)
      : [];
    const summary = full[0];

    await notifyAdminsNewRequest({
      id: summary?.id ?? newId,
      ticket_id: ticketId,
      passenger_user_id: req.user.id,
      passenger_name: t.passenger_name,
      origin: t.origin,
      destination: t.destination,
    });

    return sendSuccess(
      res,
      {
        message:
          "Refund request submitted. An administrator will review it and you will be notified.",
        request: summary ?? { id: newId, ticket_id: ticketId },
      },
      201
    );
  } catch (err) {
    console.error(err);
    return sendError(res, "Failed to create refund request", 500, err);
  }
};

/** GET /api/refund-requests/mine — passenger */
export const listMine = async (req, res) => {
  try {
    if (!isPassenger(req.roleName)) {
      return sendError(res, "Passengers only", 403);
    }
    const rows = await refundRequestModel.listRefundRequestsForPassenger(
      req.user.id
    );
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list refund requests", 500, err);
  }
};

/** GET /api/refund-requests — admin */
export const listAll = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const rows = await refundRequestModel.listRefundRequestsAll();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list refund requests", 500, err);
  }
};

/** PATCH /api/refund-requests/:id — admin */
export const updateStatus = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, "Invalid id", 400);
    }
    const next = normalizeStatus(req.body?.status);
    if (next !== "approved" && next !== "rejected") {
      return sendError(res, "status must be approved or rejected", 400);
    }
    const adminNote =
      typeof req.body?.admin_note === "string"
        ? req.body.admin_note.slice(0, 2000)
        : null;

    const existing = await refundRequestModel.getRefundRequestById(id);
    if (!existing.length) return sendError(res, "Refund request not found", 404);
    const row = existing[0];
    if (normalizeStatus(row.status) !== "pending") {
      return sendError(res, "This request is no longer pending.", 400);
    }

    const upd = await refundRequestModel.updateRefundRequestStatus(
      id,
      next,
      adminNote,
      req.user.id
    );
    if (!upd || upd.affectedRows === 0) {
      return sendError(res, "Could not update request (not pending?)", 409);
    }

    if (next === "approved") {
      const tickets = await ticketModel.getTicketWithDetailsById(row.ticket_id);
      if (tickets.length) {
        const t = tickets[0];
        await ticketModel.updateTicket(
          row.ticket_id,
          t.user_id,
          t.trip_id,
          t.seat_id,
          t.ticket_code,
          "cancelled",
          isPaymentSettled(t.payment_status) ? "refunded" : t.payment_status
        );
      }
    }

    const passengerText =
      next === "approved"
        ? `Your refund request for ticket #${row.ticket_id} was approved. ${
            adminNote ? `Note: ${adminNote}` : "The ticket has been cancelled."
          }`.trim()
        : `Your refund request for ticket #${row.ticket_id} was rejected. ${
            adminNote || ""
          }`.trim();

    await notifyPassengerResolution(
      row.passenger_user_id,
      passengerText,
      id
    );

    const updated = await refundRequestModel.getRefundRequestById(id);
    emitToRole("admin", "refund_request:updated", {
      id,
      status: next,
      ticket_id: row.ticket_id,
    });

    return sendSuccess(res, {
      message: `Refund request ${next}.`,
      request: updated[0] ?? null,
    });
  } catch (err) {
    console.error(err);
    return sendError(res, "Failed to update refund request", 500, err);
  }
};
