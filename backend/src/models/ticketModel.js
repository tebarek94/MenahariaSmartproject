import { queryAsync } from "../config/db.js";
import crypto from "crypto";

export const createTicket = (
  userId,
  tripId,
  seatId,
  ticketCode,
  status,
  paymentStatus
) => {
  // Generate automatic ticket code if not provided
  const autoTicketCode = ticketCode || generateTicketCode();
  
  return queryAsync(
    `INSERT INTO tickets (user_id, trip_id, seat_id, ticket_code, status, payment_status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      tripId,
      seatId,
      autoTicketCode,
      status ?? "reserved",
      paymentStatus ?? "pending",
    ]
  );
};

export const generateTicketCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TK${timestamp}${random}`;
};

/**
 * Non-cancelled ticket for same passenger + trip (one booking per trip; cancelled allows re-book).
 * @param {number} excludeTicketId - when updating, ignore this row
 */
export const findBlockingTicketForUserTrip = (userId, tripId, excludeTicketId = null) => {
  if (excludeTicketId != null) {
    return queryAsync(
      `SELECT id FROM tickets
       WHERE user_id = ? AND trip_id = ?
         AND LOWER(TRIM(COALESCE(status, ''))) <> 'cancelled'
         AND id <> ?
       LIMIT 1`,
      [userId, tripId, excludeTicketId]
    );
  }
  return queryAsync(
    `SELECT id FROM tickets
     WHERE user_id = ? AND trip_id = ?
       AND LOWER(TRIM(COALESCE(status, ''))) <> 'cancelled'
     LIMIT 1`,
    [userId, tripId]
  );
};

/**
 * Another non-cancelled ticket already uses this seat on this trip (one passenger per seat per trip).
 */
export const findBlockingTicketForTripSeat = (tripId, seatId, excludeTicketId = null) => {
  if (excludeTicketId != null) {
    return queryAsync(
      `SELECT id FROM tickets
       WHERE trip_id = ? AND seat_id = ?
         AND LOWER(TRIM(COALESCE(status, ''))) <> 'cancelled'
         AND id <> ?
       LIMIT 1`,
      [tripId, seatId, excludeTicketId]
    );
  }
  return queryAsync(
    `SELECT id FROM tickets
     WHERE trip_id = ? AND seat_id = ?
       AND LOWER(TRIM(COALESCE(status, ''))) <> 'cancelled'
     LIMIT 1`,
    [tripId, seatId]
  );
};

const ticketDetailSelect = `
  t.id,
  t.user_id,
  t.trip_id,
  t.seat_id,
  t.ticket_code,
  CASE WHEN t.status IS NULL OR t.status = '' THEN 'reserved' ELSE t.status END AS status,
  CASE WHEN t.payment_status IS NULL OR t.payment_status = '' THEN 'pending' ELSE t.payment_status END AS payment_status,
  t.issued_at,
  t.qr_code_token,
  t.qr_code_used,
  t.qr_code_used_at,
  t.qr_code_expires_at,
  t.qr_code_ip,
  t.qr_code_user_agent,
  t.download_token,
  t.download_used,
  t.download_used_at,
  t.download_expires_at,
  t.download_ip,
  t.download_user_agent,
  tr.driver_id AS trip_driver_id,
  tr.departure_time,
  tr.arrival_time,
  tr.price AS trip_price,
  COALESCE(u.full_name, 'Unknown Passenger') AS passenger_name,
  u.phone AS passenger_phone,
  COALESCE(d.full_name, 'Not Assigned') AS driver_name,
  COALESCE(v.plate_number, 'Not Assigned') AS plate_number,
  COALESCE(r.origin, 'Unknown') AS origin,
  COALESCE(r.destination, 'Unknown') AS destination,
  s.seat_number AS seat_number
`;

const ticketDetailJoins = `
     FROM tickets t
     INNER JOIN users u ON u.id = t.user_id
     INNER JOIN trips tr ON tr.id = t.trip_id
     INNER JOIN routes r ON r.id = tr.route_id
     INNER JOIN vehicles v ON v.id = tr.vehicle_id
     LEFT JOIN users d ON d.id = tr.driver_id
     LEFT JOIN seats s ON s.id = t.seat_id
`;

export const getAllTickets = () =>
  queryAsync("SELECT * FROM tickets ORDER BY issued_at DESC");

/** Ticket row + passenger, driver, vehicle plate, route origin/destination (for QR). */
export const getAllTicketsWithDetails = () =>
  queryAsync(
    `SELECT ${ticketDetailSelect}
     ${ticketDetailJoins}
     ORDER BY t.issued_at DESC`
  );

export const getTicketById = (id) =>
  queryAsync("SELECT * FROM tickets WHERE id = ?", [id]);

export const getTicketWithDetailsById = (id) =>
  queryAsync(
    `SELECT ${ticketDetailSelect}
     ${ticketDetailJoins}
     WHERE t.id = ?`,
    [id]
  );

export const getTicketsWithDetailsForPassenger = (userId) =>
  queryAsync(
    `SELECT ${ticketDetailSelect}
     ${ticketDetailJoins}
     WHERE t.user_id = ?
     ORDER BY t.issued_at DESC`,
    [userId]
  );

export const getTicketsWithDetailsForDriver = (driverUserId) =>
  queryAsync(
    `SELECT ${ticketDetailSelect}
     ${ticketDetailJoins}
     WHERE tr.driver_id = ?
     ORDER BY tr.departure_time DESC, t.issued_at DESC`,
    [driverUserId]
  );

export const updateTicket = (
  id,
  userId,
  tripId,
  seatId,
  ticketCode,
  status,
  paymentStatus
) =>
  queryAsync(
    `UPDATE tickets SET user_id = ?, trip_id = ?, seat_id = ?, ticket_code = ?,
     status = ?, payment_status = ? WHERE id = ?`,
    [userId, tripId, seatId, ticketCode ?? null, status, paymentStatus, id]
  );

export const deleteTicket = (id) =>
  queryAsync("DELETE FROM tickets WHERE id = ?", [id]);

// QR Code management functions
export const generateQrToken = (ticketId, expiresAt) => {
  const token = crypto.randomBytes(32).toString('hex');
  return queryAsync(
    `UPDATE tickets SET qr_code_token = ?, qr_code_expires_at = ?, qr_code_used = FALSE WHERE id = ?`,
    [token, expiresAt, ticketId]
  );
};

export const validateAndUseQrToken = (token, ipAddress, userAgent) => {
  return queryAsync(
    `SELECT t.id, t.qr_code_used, t.qr_code_expires_at, t.status 
     FROM tickets t WHERE t.qr_code_token = ?`,
    [token]
  ).then(rows => {
    if (!rows.length) {
      return { valid: false, reason: 'Token not found' };
    }
    
    const ticket = rows[0];
    
    // Check if already used
    if (ticket.qr_code_used) {
      return { valid: false, reason: 'QR code already used' };
    }
    
    // Check if expired
    if (ticket.qr_code_expires_at && new Date(ticket.qr_code_expires_at) < new Date()) {
      return { valid: false, reason: 'QR code expired' };
    }
    
    // Check ticket status
    if (ticket.status !== 'confirmed' && ticket.status !== 'reserved') {
      return { valid: false, reason: 'Invalid ticket status' };
    }
    
    return { valid: true, ticketId: ticket.id };
  });
};

export const markQrCodeAsUsed = (ticketId, ipAddress, userAgent) => {
  return queryAsync(
    `UPDATE tickets SET 
     qr_code_used = TRUE, 
     qr_code_used_at = NOW(), 
     qr_code_ip = ?, 
     qr_code_user_agent = ? 
     WHERE id = ?`,
    [ipAddress, userAgent, ticketId]
  );
};

export const logQrCodeUsage = (ticketId, qrToken, ipAddress, userAgent, success, errorMessage = null) => {
  return queryAsync(
    `INSERT INTO qr_code_usage_logs 
     (ticket_id, qr_token, ip_address, user_agent, success, error_message) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ticketId, qrToken, ipAddress, userAgent, success, errorMessage]
  );
};

export const getTicketByQrToken = (token) => {
  return queryAsync(
    `SELECT ${ticketDetailSelect}
     ${ticketDetailJoins}
     WHERE t.qr_code_token = ?`,
    [token]
  );
};

// Download token management functions
export const generateDownloadToken = async (ticketId, expiresAt) => {
  const token = crypto.randomBytes(32).toString('hex');
  await queryAsync(
    `UPDATE tickets SET download_token = ?, download_expires_at = ?, download_used = FALSE WHERE id = ?`,
    [token, expiresAt, ticketId]
  );
  return token;
};

export const validateAndUseDownloadToken = (token, ipAddress, userAgent) => {
  return queryAsync(
    `SELECT t.id, t.download_used, t.download_expires_at, t.status 
     FROM tickets t WHERE t.download_token = ?`,
    [token]
  ).then(rows => {
    if (!rows.length) {
      return { valid: false, reason: 'Download token not found' };
    }
    
    const ticket = rows[0];
    
    // Check if already used
    if (ticket.download_used) {
      return { valid: false, reason: 'Download already used' };
    }
    
    // Check if expired
    if (ticket.download_expires_at && new Date(ticket.download_expires_at) < new Date()) {
      return { valid: false, reason: 'Download expired' };
    }
    
    // Check ticket status
    if (ticket.status && ticket.status !== 'confirmed' && ticket.status !== 'reserved') {
      return { valid: false, reason: 'Invalid ticket status' };
    }
    
    return { valid: true, ticketId: ticket.id };
  });
};

export const markDownloadAsUsed = (ticketId, ipAddress, userAgent) => {
  return queryAsync(
    `UPDATE tickets SET 
     download_used = TRUE, 
     download_used_at = NOW(), 
     download_ip = ?, 
     download_user_agent = ? 
     WHERE id = ?`,
    [ipAddress, userAgent, ticketId]
  );
};

export const logDownloadUsage = (ticketId, downloadToken, ipAddress, userAgent, success, errorMessage = null) => {
  return queryAsync(
    `INSERT INTO download_logs 
     (ticket_id, download_token, ip_address, user_agent, success, error_message) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ticketId, downloadToken, ipAddress, userAgent, success, errorMessage]
  );
};

export const getTicketByDownloadToken = (token) => {
  return queryAsync(
    `SELECT ${ticketDetailSelect}
     ${ticketDetailJoins}
     WHERE t.download_token = ?`,
    [token]
  );
};
