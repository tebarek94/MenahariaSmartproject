import { queryAsync } from "../config/db.js";

export const createTicket = (
  userId,
  tripId,
  seatId,
  ticketCode,
  status,
  paymentStatus
) =>
  queryAsync(
    `INSERT INTO tickets (user_id, trip_id, seat_id, ticket_code, status, payment_status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      tripId,
      seatId,
      ticketCode ?? null,
      status ?? "reserved",
      paymentStatus ?? "pending",
    ]
  );

const ticketDetailSelect = `
  t.id,
  t.user_id,
  t.trip_id,
  t.seat_id,
  t.ticket_code,
  t.status,
  t.payment_status,
  t.issued_at,
  tr.driver_id AS trip_driver_id,
  u.full_name AS passenger_name,
  d.full_name AS driver_name,
  v.plate_number,
  r.origin,
  r.destination
`;

export const getAllTickets = () =>
  queryAsync("SELECT * FROM tickets ORDER BY issued_at DESC");

/** Ticket row + passenger, driver, vehicle plate, route origin/destination (for QR). */
export const getAllTicketsWithDetails = () =>
  queryAsync(
    `SELECT ${ticketDetailSelect}
     FROM tickets t
     INNER JOIN users u ON u.id = t.user_id
     INNER JOIN trips tr ON tr.id = t.trip_id
     INNER JOIN routes r ON r.id = tr.route_id
     INNER JOIN vehicles v ON v.id = tr.vehicle_id
     LEFT JOIN users d ON d.id = tr.driver_id
     ORDER BY t.issued_at DESC`
  );

export const getTicketById = (id) =>
  queryAsync("SELECT * FROM tickets WHERE id = ?", [id]);

export const getTicketWithDetailsById = (id) =>
  queryAsync(
    `SELECT ${ticketDetailSelect}
     FROM tickets t
     INNER JOIN users u ON u.id = t.user_id
     INNER JOIN trips tr ON tr.id = t.trip_id
     INNER JOIN routes r ON r.id = tr.route_id
     INNER JOIN vehicles v ON v.id = tr.vehicle_id
     LEFT JOIN users d ON d.id = tr.driver_id
     WHERE t.id = ?`,
    [id]
  );

export const getTicketsWithDetailsForPassenger = (userId) =>
  queryAsync(
    `SELECT ${ticketDetailSelect}
     FROM tickets t
     INNER JOIN users u ON u.id = t.user_id
     INNER JOIN trips tr ON tr.id = t.trip_id
     INNER JOIN routes r ON r.id = tr.route_id
     INNER JOIN vehicles v ON v.id = tr.vehicle_id
     LEFT JOIN users d ON d.id = tr.driver_id
     WHERE t.user_id = ?
     ORDER BY t.issued_at DESC`,
    [userId]
  );

export const getTicketsWithDetailsForDriver = (driverUserId) =>
  queryAsync(
    `SELECT ${ticketDetailSelect}
     FROM tickets t
     INNER JOIN users u ON u.id = t.user_id
     INNER JOIN trips tr ON tr.id = t.trip_id
     INNER JOIN routes r ON r.id = tr.route_id
     INNER JOIN vehicles v ON v.id = tr.vehicle_id
     LEFT JOIN users d ON d.id = tr.driver_id
     WHERE tr.driver_id = ?
     ORDER BY t.issued_at DESC`,
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
