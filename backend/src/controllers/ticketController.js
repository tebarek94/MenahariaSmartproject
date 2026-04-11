import * as ticketModel from "../models/ticketModel.js";
import * as seatModel from "../models/seatModel.js";
import * as tripModel from "../models/tripModel.js";
import * as notificationModel from "../models/notificationModel.js";
import { getUserWithRoleById } from "../models/userModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  attachTicketQr,
  generateOneTimeTicketQr,
  normalizeValidateQrTokenInput,
} from "../utils/ticketQr.js";
import { isAdmin, isDriver, isPassenger } from "../constants/roles.js";
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
    if (isAdmin(req.roleName)) {
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
    if (isAdmin(req.roleName)) {
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
    } else if (!isAdmin(req.roleName)) {
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
    
    // Generate enhanced ticket content with QR code
    const ticketContent = `
=================================================================
                    MENAHARIYA SMART TRANSPORT
                          OFFICIAL TICKET
=================================================================

TICKET DETAILS
-------------
Ticket ID:        #${ticketData.id.toString().padStart(6, '0')}
Ticket Code:      ${ticketData.ticket_code || 'AUTO-GENERATED'}
Status:           ${ticketData.status?.toUpperCase() || 'RESERVED'}
Payment Status:   ${ticketData.payment_status?.toUpperCase() || 'PENDING'}
Issued:           ${new Date(ticketData.issued_at).toLocaleString()}

PASSENGER INFORMATION
---------------------
Name:             ${ticketData.passenger_name || 'Not Available'}
Ticket Type:      One-Time Valid Ticket

JOURNEY INFORMATION
------------------
Route:            ${ticketData.origin || 'Unknown'}  -->  ${ticketData.destination || 'Unknown'}
Departure:        ${ticketData.departure_time ? new Date(ticketData.departure_time).toLocaleString() : 'Not Scheduled'}
Arrival:          ${ticketData.arrival_time ? new Date(ticketData.arrival_time).toLocaleString() : 'Not Scheduled'}

VEHICLE & DRIVER DETAILS
----------------------
Driver Name:      ${ticketData.driver_name || 'Assigned at Departure'}
Vehicle Plate:    ${ticketData.plate_number || 'Assigned at Departure'}
Seat Number:      ${ticketData.seat_id || 'Assigned at Check-in'}

QR CODE FOR SCANNING
--------------------
${ticketWithQr.qr_data_url ? `[QR CODE IMAGE EMBEDDED - Scan this code for validation]` : '[QR Code will be available at check-in]'}

SECURITY & VALIDATION
--------------------
QR Code Token:    ${ticketData.qr_code_token || 'Generated at Check-in'}
Download Token:   ${token}
Downloaded:       ${new Date().toLocaleString()}

IMPORTANT INFORMATION
--------------------
* This ticket is valid for one-time use only
* Please arrive at departure point 30 minutes before departure
* Keep this ticket safe until journey completion
* Present this ticket (digital or printed) for boarding
* QR code will be scanned at departure and arrival points

TERMS & CONDITIONS
------------------
1. This ticket is non-refundable after departure time
2. Seat allocation is final and subject to availability
3. Menahariya Smart Transport is not responsible for lost tickets
4. Schedule changes may occur - check departure boards
5. Valid ID required for ticket verification

CONTACT INFORMATION
------------------
Emergency: +251-XXX-XXXX-XXXX
Email: support@menahariya.com
Website: www.menahariya.com

=================================================================
                    Thank you for choosing Menahariya Smart!
                      Safe Journey - Happy Travel
=================================================================

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
Download ID: ${token.substring(0, 8).toUpperCase()}
This is an official digital ticket - Page 1 of 1
    `.trim();
    
    // Create HTML content with embedded QR code for better formatting
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Menahariya Smart Transport - Ticket #${ticketData.id}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .ticket { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            border: 2px solid #333; 
            padding: 30px; 
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            border-bottom: 3px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .header h1 { 
            color: #333; 
            margin: 0; 
            font-size: 28px; 
        }
        .header p { 
            color: #666; 
            margin: 5px 0 0 0; 
            font-size: 14px; 
        }
        .section { 
            margin-bottom: 25px; 
            padding: 20px; 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            background: #fafafa; 
        }
        .section h2 { 
            color: #333; 
            margin: 0 0 15px 0; 
            font-size: 18px; 
            border-bottom: 2px solid #007bff; 
            padding-bottom: 5px; 
        }
        .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px; 
            padding: 5px 0; 
        }
        .info-label { 
            font-weight: bold; 
            color: #555; 
        }
        .info-value { 
            color: #333; 
        }
        .qr-section { 
            text-align: center; 
            margin: 30px 0; 
        }
        .qr-image { 
            max-width: 200px; 
            height: auto; 
            border: 2px solid #333; 
            padding: 10px; 
            background: white; 
        }
        .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #333; 
            font-size: 12px; 
            color: #666; 
        }
        .status-badge { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 12px; 
            font-weight: bold; 
            color: white; 
        }
        .status-confirmed { background: #28a745; }
        .status-reserved { background: #007bff; }
        .status-pending { background: #ffc107; color: #333; }
        .status-paid { background: #28a745; }
    </style>
</head>
<body>
    <div class="ticket">
        <div class="header">
            <h1>MENAHARIYA SMART TRANSPORT</h1>
            <p>OFFICIAL TICKET - #${ticketData.id.toString().padStart(6, '0')}</p>
        </div>
        
        <div class="section">
            <h2>TICKET DETAILS</h2>
            <div class="info-row">
                <span class="info-label">Ticket Code:</span>
                <span class="info-value">${ticketData.ticket_code || 'AUTO-GENERATED'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">
                    <span class="status-badge status-${ticketData.status || 'reserved'}">
                        ${(ticketData.status || 'reserved').toUpperCase()}
                    </span>
                </span>
            </div>
            <div class="info-row">
                <span class="info-label">Payment Status:</span>
                <span class="info-value">
                    <span class="status-badge status-${ticketData.payment_status || 'pending'}">
                        ${(ticketData.payment_status || 'pending').toUpperCase()}
                    </span>
                </span>
            </div>
            <div class="info-row">
                <span class="info-label">Issued:</span>
                <span class="info-value">${new Date(ticketData.issued_at).toLocaleString()}</span>
            </div>
        </div>
        
        <div class="section">
            <h2>PASSENGER INFORMATION</h2>
            <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${ticketData.passenger_name || 'Not Available'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Ticket Type:</span>
                <span class="info-value">One-Time Valid Ticket</span>
            </div>
        </div>
        
        <div class="section">
            <h2>JOURNEY INFORMATION</h2>
            <div class="info-row">
                <span class="info-label">Route:</span>
                <span class="info-value">${ticketData.origin || 'Unknown'}  -->  ${ticketData.destination || 'Unknown'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Departure:</span>
                <span class="info-value">${ticketData.departure_time ? new Date(ticketData.departure_time).toLocaleString() : 'Not Scheduled'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Arrival:</span>
                <span class="info-value">${ticketData.arrival_time ? new Date(ticketData.arrival_time).toLocaleString() : 'Not Scheduled'}</span>
            </div>
        </div>
        
        <div class="section">
            <h2>VEHICLE & DRIVER DETAILS</h2>
            <div class="info-row">
                <span class="info-label">Driver Name:</span>
                <span class="info-value">${ticketData.driver_name || 'Assigned at Departure'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Vehicle Plate:</span>
                <span class="info-value">${ticketData.plate_number || 'Assigned at Departure'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Seat Number:</span>
                <span class="info-value">${ticketData.seat_id || 'Assigned at Check-in'}</span>
            </div>
        </div>
        
        ${ticketWithQr.qr_data_url ? `
        <div class="section">
            <h2>QR CODE FOR SCANNING</h2>
            <div class="qr-section">
                <img src="${ticketWithQr.qr_data_url}" alt="Ticket QR Code" class="qr-image" />
                <p><small>Scan this QR code for ticket validation</small></p>
            </div>
        </div>
        ` : ''}
        
        <div class="footer">
            <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p><strong>Download ID:</strong> ${token.substring(0, 8).toUpperCase()}</p>
            <p><strong>Download Token:</strong> ${token}</p>
            <p><em>This is an official digital ticket - Page 1 of 1</em></p>
            <p><em>Thank you for choosing Menahariya Smart! Safe Journey - Happy Travel</em></p>
        </div>
    </div>
</body>
</html>
    `;
    
    // Set headers for HTML file download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="ticket_${ticketData.id}.html"`);
    
    return res.send(htmlContent);
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
