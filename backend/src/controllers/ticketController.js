import * as ticketModel from "../models/ticketModel.js";
import * as seatModel from "../models/seatModel.js";
import * as tripModel from "../models/tripModel.js";
import * as notificationModel from "../models/notificationModel.js";
import { getUserWithRoleById } from "../models/userModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import PDFDocument from "pdfkit";
import {
  attachTicketQr,
  generateOneTimeTicketQr,
  normalizeValidateQrTokenInput,
} from "../utils/ticketQr.js";
import { isAdmin, isDriver, isPassenger, isStaff } from "../constants/roles.js";
import { logAutoReportTask } from "../utils/reportActivity.js";
import { emitToUser } from "../realtime/socketServer.js";

async function assertTicketUserIsPassenger(res, userId) {
  const rows = await getUserWithRoleById(Number(userId));
  if (!rows.length) {
    sendError(res, "User not found", 404);
    return false;
  }
  if (!isPassenger(rows[0].role_name)) {
    sendError(
      res,
      "Tickets can only be issued to passenger accounts. Admin and driver accounts cannot be selected.",
      400
    );
    return false;
  }
  return true;
}

/** In-app alert for the trip driver when a passenger gets a ticket (admin or self-booking). */
async function notifyDriverPassengerBooked(driverId, ticketRow, fallback, ticketId) {
  const id = Number(driverId);
  if (!Number.isInteger(id) || id <= 0) return;
  let passenger = ticketRow?.passenger_name;
  if (!passenger && fallback?.userId != null) {
    passenger = `Passenger #${fallback.userId}`;
  }
  passenger = passenger || "A passenger";
  const route =
    ticketRow?.origin && ticketRow?.destination
      ? `${ticketRow.origin} → ${ticketRow.destination}`
      : "your assigned trip";
  let seatLabel = "a seat";
  if (ticketRow?.seat_number != null && ticketRow.seat_number !== "") {
    seatLabel = `seat ${ticketRow.seat_number}`;
  } else if (fallback?.seatId != null) {
    seatLabel = `seat id ${fallback.seatId}`;
  }
  const dep = ticketRow?.departure_time ?? fallback?.tripDeparture;
  let timePart = "";
  if (dep) {
    try {
      timePart = ` · Departure: ${new Date(dep).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })}`;
    } catch {
      timePart = "";
    }
  }
  const msg = `New booking: ${passenger} took ${seatLabel} on ${route}${timePart}. Ticket #${ticketId}.`;
  try {
    const result = await notificationModel.createNotification(
      id,
      msg,
      "in_app",
      "pending"
    );
    const nid = result?.insertId;
    if (nid) {
      emitToUser(id, "notification:new", {
        id: nid,
        user_id: id,
        message: msg,
        channel: "in_app",
        status: "pending",
      });
    }
  } catch (e) {
    console.error("notifyDriverPassengerBooked:", e);
  }
}

function canReadTicket(req, row) {
  if (isAdmin(req.roleName) || isStaff(req.roleName)) return true;
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

function formatDateTime(value) {
  if (!value) return "Not Scheduled";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Not Scheduled";
  }
}

function drawLabelValue(doc, label, value) {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#334155")
    .text(`${label}: `, { continued: true });
  doc
    .font("Helvetica")
    .fillColor("#0f172a")
    .text(String(value ?? "N/A"));
}

async function generateTicketPdf(ticketData, token, qrDataUrl) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 42 });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageLeft = 42;
    const pageTop = 42;
    const contentWidth = doc.page.width - pageLeft * 2;
    const routeText = `${ticketData.origin || "Unknown"} -> ${ticketData.destination || "Unknown"}`;
    const issuedAt = formatDateTime(ticketData.issued_at);
    const departureAt = formatDateTime(ticketData.departure_time);
    const arrivalAt = formatDateTime(ticketData.arrival_time);
    const seatText =
      ticketData.seat_number || ticketData.seat_id || "Assigned at Check-in";
    const statusText = String(ticketData.status || "reserved").toUpperCase();
    const payStatusText = String(ticketData.payment_status || "pending").toUpperCase();

    // Header banner
    doc.save();
    doc.roundedRect(pageLeft, pageTop, contentWidth, 92, 12).fill("#0f766e");
    doc.restore();
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#ffffff")
      .text("MENAHARIYA SMART", pageLeft + 18, pageTop + 18);
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor("#ccfbf1")
      .text("Official Passenger Ticket", pageLeft + 18, pageTop + 46);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#ffffff")
      .text(`TICKET #${ticketData.id}`, pageLeft + 18, pageTop + 62);

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#ffffff")
      .text("Route", pageLeft + contentWidth - 220, pageTop + 20);
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#e6fffa")
      .text(routeText, pageLeft + contentWidth - 220, pageTop + 40, {
        width: 200,
        align: "right",
      });

    doc.y = pageTop + 108;

    // Status chips
    const chipY = doc.y;
    const chipHeight = 24;
    doc.roundedRect(pageLeft, chipY, 150, chipHeight, 12).fill("#e2e8f0");
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#0f172a")
      .text(`STATUS: ${statusText}`, pageLeft + 12, chipY + 8);
    doc.roundedRect(pageLeft + 162, chipY, 190, chipHeight, 12).fill("#dcfce7");
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#166534")
      .text(`PAYMENT: ${payStatusText}`, pageLeft + 174, chipY + 8);
    doc.y = chipY + chipHeight + 14;

    const sectionX = pageLeft;
    const sectionW = contentWidth;
    const titleColor = "#0f172a";
    const valueColor = "#1e293b";

    const drawSectionBox = (title, y, height) => {
      doc.roundedRect(sectionX, y, sectionW, height, 10).fill("#f8fafc");
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(titleColor)
        .text(title, sectionX + 14, y + 12);
      return y + 32;
    };

    const pair = (x, y, label, value) => {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569").text(label, x, y);
      doc
        .font("Helvetica")
        .fontSize(10.5)
        .fillColor(valueColor)
        .text(String(value ?? "N/A"), x, y + 13, { width: 230 });
    };

    // Trip info box
    let y = doc.y;
    const tripBoxH = 108;
    let innerY = drawSectionBox("Trip Information", y, tripBoxH);
    pair(sectionX + 14, innerY, "Route", routeText);
    pair(sectionX + 280, innerY, "Seat", seatText);
    innerY += 38;
    pair(sectionX + 14, innerY, "Departure", departureAt);
    pair(sectionX + 280, innerY, "Arrival", arrivalAt);

    // Passenger/driver box
    y += tripBoxH + 12;
    const peopleBoxH = 120;
    innerY = drawSectionBox("Passenger & Driver", y, peopleBoxH);
    pair(sectionX + 14, innerY, "Passenger", ticketData.passenger_name || "Not Available");
    pair(
      sectionX + 280,
      innerY,
      "Driver",
      ticketData.driver_name || "Assigned at Departure"
    );
    innerY += 38;
    pair(
      sectionX + 14,
      innerY,
      "Driver Phone",
      ticketData.driver_phone || "Not Available"
    );
    pair(
      sectionX + 280,
      innerY,
      "Vehicle Plate",
      ticketData.plate_number || "Assigned at Departure"
    );

    // Metadata box
    y += peopleBoxH + 12;
    const metaBoxH = 94;
    innerY = drawSectionBox("Ticket Metadata", y, metaBoxH);
    pair(sectionX + 14, innerY, "Ticket Code", ticketData.ticket_code || "AUTO-GENERATED");
    pair(sectionX + 280, innerY, "Issued At", issuedAt);
    innerY += 38;
    pair(sectionX + 14, innerY, "Generated At", new Date().toLocaleString());
    pair(sectionX + 280, innerY, "Download ID", token.slice(0, 8).toUpperCase());

    doc.y = y + metaBoxH + 12;

    if (qrDataUrl && String(qrDataUrl).startsWith("data:image")) {
      try {
        const base64 = String(qrDataUrl).split(",")[1];
        const qrBuffer = Buffer.from(base64, "base64");
        doc.roundedRect(pageLeft, doc.y, contentWidth, 155, 10).fill("#f0fdfa");
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#0f172a")
          .text("Validation QR Code", pageLeft + 14, doc.y + 12);
        const qrSize = 105;
        const x = pageLeft + 18;
        const qrY = doc.y + 34;
        doc.image(qrBuffer, x, qrY, { fit: [qrSize, qrSize] });
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#334155")
          .text("Scan this QR at boarding for one-time validation.", x + qrSize + 16, qrY + 16, {
            width: contentWidth - qrSize - 56,
          })
          .text("Keep this ticket PDF until your trip is completed.", x + qrSize + 16, qrY + 46, {
            width: contentWidth - qrSize - 56,
          });
        doc.y += 168;
      } catch {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#475569")
          .text("QR image could not be embedded in this PDF.", { align: "center" });
      }
    }

    doc
      .font("Helvetica")
      .fontSize(8.8)
      .fillColor("#64748b")
      .text(
        "This ticket is valid for one trip only. Please arrive at least 30 minutes before departure and present this file during check-in.",
        { align: "center" }
      );

    doc.end();
  });
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
    if (isAdmin(req.roleName) || isStaff(req.roleName)) {
      const ok = await assertTicketUserIsPassenger(res, user_id);
      if (!ok) return;
    }
    const blocking = await ticketModel.findBlockingTicketForUserTrip(
      Number(user_id),
      Number(trip_id)
    );
    if (blocking.length) {
      return sendError(
        res,
        "This passenger already has a ticket for this trip. Each passenger can only hold one active ticket per trip (cancel the existing ticket first if you need to rebook).",
        409
      );
    }
    const tripRows = await tripModel.getTripById(Number(trip_id));
    if (!tripRows.length) {
      return sendError(res, "Trip not found", 404);
    }
    const trip = tripRows[0];
    const seatRows = await seatModel.getSeatWithVehicleInfo(Number(seat_id));
    if (!seatRows.length) {
      return sendError(res, "Seat not found", 404);
    }
    if (Number(seatRows[0].vehicle_id) !== Number(trip.vehicle_id)) {
      return sendError(
        res,
        "This seat does not belong to the vehicle assigned to this trip.",
        400
      );
    }
    const seatTaken = await ticketModel.findBlockingTicketForTripSeat(
      Number(trip_id),
      Number(seat_id)
    );
    if (seatTaken.length) {
      return sendError(
        res,
        "This seat is already taken on this trip. Only one passenger can book each seat per trip.",
        409
      );
    }
    const result = await ticketModel.createTicket(
      Number(user_id),
      Number(trip_id),
      Number(seat_id),
      ticket_code,
      status,
      payment_status
    );
    void logAutoReportTask({
      type: "ticket_issued",
      summary: `Ticket #${result.insertId}: user ${user_id}, trip ${trip_id}, seat ${seat_id}`,
      date_range: `trip_id:${trip_id}`,
      file_path: `ticket_id:${result.insertId}`,
    });
    await seatModel.clearSeatLockBySeatId(Number(seat_id)).catch((e) => {
      console.error("clearSeatLockBySeatId:", e);
    });
    const rows = await ticketModel.getTicketWithDetailsById(result.insertId);
    if (trip.driver_id != null) {
      await notifyDriverPassengerBooked(
        trip.driver_id,
        rows[0],
        {
          userId: Number(user_id),
          seatId: Number(seat_id),
          tripDeparture: trip.departure_time,
        },
        result.insertId
      );
    }
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

    // Persist the same token that is encoded in the QR image (single-use on scan).
    const qrData = await generateOneTimeTicketQr(rows[0]);
    await ticketModel.setTicketQrCredentials(
      result.insertId,
      qrData.token,
      qrData.expiresAt
    );
    const updatedRows = await ticketModel.getTicketWithDetailsById(result.insertId);
    const ticket = await attachTicketQr(updatedRows[0], { includeImage: true });

    return sendSuccess(res, { message: "Ticket created", ticket }, 201);
  } catch (err) {
    const dup =
      err?.code === "ER_DUP_ENTRY" ||
      err?.errno === 1062 ||
      String(err?.sqlMessage || "").includes("uk_tickets_open_trip_seat");
    if (dup) {
      return sendError(
        res,
        "This seat was just booked or is no longer available. Choose another seat.",
        409
      );
    }
    return sendError(res, "Failed to create ticket", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    let rows;
    if (isAdmin(req.roleName) || isStaff(req.roleName)) {
      rows = await ticketModel.getAllTicketsWithDetails();
    } else if (isDriver(req.roleName)) {
      rows = await ticketModel.getTicketsWithDetailsForDriver(req.user.id);
    } else if (isPassenger(req.roleName)) {
      rows = await ticketModel.getTicketsWithDetailsForPassenger(req.user.id);
    } else {
      return sendError(res, "Forbidden", 403);
    }
    const includeQrImage = !isDriver(req.roleName);
    const tickets = await Promise.all(
      rows.map((r) => attachTicketQr(r, { includeImage: includeQrImage }))
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
    if (isAdmin(req.roleName) || isStaff(req.roleName)) {
      const ok = await assertTicketUserIsPassenger(res, user_id);
      if (!ok) return;
    }
    const clash = await ticketModel.findBlockingTicketForUserTrip(
      Number(user_id),
      Number(trip_id),
      Number(req.params.id)
    );
    if (clash.length) {
      return sendError(
        res,
        "Another ticket already exists for this passenger on this trip.",
        409
      );
    }
    const tripRows = await tripModel.getTripById(Number(trip_id));
    if (!tripRows.length) {
      return sendError(res, "Trip not found", 404);
    }
    const trip = tripRows[0];
    const seatRows = await seatModel.getSeatWithVehicleInfo(Number(seat_id));
    if (!seatRows.length) {
      return sendError(res, "Seat not found", 404);
    }
    if (Number(seatRows[0].vehicle_id) !== Number(trip.vehicle_id)) {
      return sendError(
        res,
        "This seat does not belong to the vehicle assigned to this trip.",
        400
      );
    }
    const seatTaken = await ticketModel.findBlockingTicketForTripSeat(
      Number(trip_id),
      Number(seat_id),
      Number(req.params.id)
    );
    if (seatTaken.length) {
      return sendError(
        res,
        "This seat is already taken on this trip by another ticket.",
        409
      );
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
    } else if (!isAdmin(req.roleName) && !isStaff(req.roleName)) {
      return sendError(res, "Forbidden", 403);
    }
    await ticketModel.deleteTicket(req.params.id);
    return sendSuccess(res, { message: "Ticket deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete ticket", 500, err);
  }
};

// QR Code specific endpoints
export const validateQrCode = async (req, res) => {
  try {
    let token = req.body?.token;
    if (token != null && typeof token !== "string") {
      token = String(token);
    }
    token = normalizeValidateQrTokenInput(token?.trim() ?? "");
    if (!token) {
      return sendError(res, "QR token is required", 400);
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Single atomic UPDATE: one successful scan marks used and expires token immediately
    const validation = await ticketModel.consumeQrToken(
      token,
      ipAddress,
      userAgent
    );

    if (!validation.valid) {
      const ticket = await ticketModel.getTicketByQrToken(token);
      if (ticket.length > 0) {
        await ticketModel.logQrCodeUsage(
          ticket[0].id,
          token,
          ipAddress,
          userAgent,
          false,
          validation.reason
        );
      }
      return sendError(res, validation.reason, 400);
    }

    await ticketModel.logQrCodeUsage(
      validation.ticketId,
      token,
      ipAddress,
      userAgent,
      true
    );

    const ticket = await ticketModel.getTicketWithDetailsById(
      validation.ticketId
    );
    if (!ticket.length) {
      return sendError(res, "Ticket not found", 404);
    }
    
    // Update ticket status to 'used' if it was confirmed
    if (ticket[0].status === 'confirmed') {
      await ticketModel.updateTicket(
        validation.ticketId,
        ticket[0].user_id,
        ticket[0].trip_id,
        ticket[0].seat_id,
        ticket[0].ticket_code,
        'used',
        ticket[0].payment_status
      );
    }
    
    const ticketWithQr = await attachTicketQr(ticket[0], { includeImage: false });
    
    return sendSuccess(res, {
      message: "QR code validated successfully",
      ticket: ticketWithQr,
      used_at: new Date().toISOString()
    });
  } catch (err) {
    return sendError(res, "Failed to validate QR code", 500, err);
  }
};

export const regenerateQrCode = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ticketModel.getTicketWithDetailsById(id);
    
    if (!existing.length) {
      return sendError(res, "Ticket not found", 404);
    }
    
    if (!canReadTicket(req, existing[0])) {
      return sendError(res, "Forbidden", 403);
    }
    
    const qrData = await generateOneTimeTicketQr(existing[0]);
    await ticketModel.setTicketQrCredentials(id, qrData.token, qrData.expiresAt);
    
    // Get updated ticket with new QR
    const updatedTicket = await ticketModel.getTicketWithDetailsById(id);
    const ticketWithQr = await attachTicketQr(updatedTicket[0], { includeImage: true });
    
    return sendSuccess(res, {
      message: "QR code regenerated successfully",
      ticket: ticketWithQr
    });
  } catch (err) {
    return sendError(res, "Failed to regenerate QR code", 500, err);
  }
};

export const getQrCodeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ticketModel.getTicketWithDetailsById(id);
    
    if (!existing.length) {
      return sendError(res, "Ticket not found", 404);
    }
    
    if (!canReadTicket(req, existing[0])) {
      return sendError(res, "Forbidden", 403);
    }
    
    const ticket = existing[0];
    const status = {
      has_qr_code: !!ticket.qr_code_token,
      qr_used: ticket.qr_code_used,
      qr_used_at: ticket.qr_code_used_at,
      qr_expires_at: ticket.qr_code_expires_at,
      is_expired: ticket.qr_code_expires_at ? new Date(ticket.qr_code_expires_at) < new Date() : false,
      qr_ip: ticket.qr_code_ip,
      qr_user_agent: ticket.qr_code_user_agent
    };
    
    return sendSuccess(res, status);
  } catch (err) {
    return sendError(res, "Failed to get QR code status", 500, err);
  }
};

// Download ticket endpoints
export const generateDownloadToken = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ticketModel.getTicketWithDetailsById(id);
    
    if (!existing.length) {
      return sendError(res, "Ticket not found", 404);
    }
    
    if (!canReadTicket(req, existing[0])) {
      return sendError(res, "Forbidden", 403);
    }
    
    // Generate download token with 1-hour expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    await ticketModel.generateDownloadToken(id, expiresAt);
    
    const updatedTicket = await ticketModel.getTicketWithDetailsById(id);
    const ticketWithQr = await attachTicketQr(updatedTicket[0], { includeImage: false });
    
    return sendSuccess(res, {
      message: "Download token generated successfully",
      ticket: ticketWithQr,
      download_token: updatedTicket[0].download_token,
      download_expires_at: updatedTicket[0].download_expires_at
    });
  } catch (err) {
    return sendError(res, "Failed to generate download token", 500, err);
  }
};

export const downloadTicket = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return sendError(res, "Download token is required", 400);
    }
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Validate download token
    const validation = await ticketModel.validateAndUseDownloadToken(token, ipAddress, userAgent);
    
    if (!validation.valid) {
      // Log failed download attempt
      const ticket = await ticketModel.getTicketByDownloadToken(token);
      if (ticket.length > 0) {
        await ticketModel.logDownloadUsage(ticket[0].id, token, ipAddress, userAgent, false, validation.reason);
      }
      return sendError(res, validation.reason, 400);
    }
    
    // Mark download as used
    await ticketModel.markDownloadAsUsed(validation.ticketId, ipAddress, userAgent);
    
    // Log successful download
    await ticketModel.logDownloadUsage(validation.ticketId, token, ipAddress, userAgent, true);
    
    // Get ticket details with QR code
    const ticket = await ticketModel.getTicketWithDetailsById(validation.ticketId);
    if (!ticket.length) {
      return sendError(res, "Ticket not found", 404);
    }
    
    const ticketData = ticket[0];
    
    // Get QR code with image
    const ticketWithQr = await attachTicketQr(ticketData, { includeImage: true });
    
    const pdfBuffer = await generateTicketPdf(ticketData, token, ticketWithQr.qr_data_url);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ticket_${ticketData.id}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, "Failed to download ticket", 500, err);
  }
};

export const getDownloadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ticketModel.getTicketWithDetailsById(id);
    
    if (!existing.length) {
      return sendError(res, "Ticket not found", 404);
    }
    
    if (!canReadTicket(req, existing[0])) {
      return sendError(res, "Forbidden", 403);
    }
    
    const ticket = existing[0];
    const status = {
      has_download_token: !!ticket.download_token,
      download_used: ticket.download_used,
      download_used_at: ticket.download_used_at,
      download_expires_at: ticket.download_expires_at,
      is_download_expired: ticket.download_expires_at ? new Date(ticket.download_expires_at) < new Date() : false,
      download_ip: ticket.download_ip,
      download_user_agent: ticket.download_user_agent
    };
    
    return sendSuccess(res, status);
  } catch (err) {
    return sendError(res, "Failed to get download status", 500, err);
  }
};
