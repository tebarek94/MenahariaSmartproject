import { queryAsync } from "../config/db.js";

const selectJoin = `
  SELECT
    r.id,
    r.ticket_id,
    r.passenger_user_id,
    r.message,
    r.status,
    r.admin_note,
    r.resolved_by_user_id,
    r.resolved_at,
    r.created_at,
    t.ticket_code,
    t.status AS ticket_status,
    t.payment_status,
    tr.departure_time,
    tr.price AS trip_price,
    rt.origin,
    rt.destination,
    pu.full_name AS passenger_name,
    pu.phone AS passenger_phone,
    ru.full_name AS resolver_name
  FROM ticket_refund_requests r
  INNER JOIN tickets t ON t.id = r.ticket_id
  INNER JOIN trips tr ON tr.id = t.trip_id
  INNER JOIN routes rt ON rt.id = tr.route_id
  INNER JOIN users pu ON pu.id = r.passenger_user_id
  LEFT JOIN users ru ON ru.id = r.resolved_by_user_id
`;

export const createRefundRequest = (ticketId, passengerUserId, message) =>
  queryAsync(
    `INSERT INTO ticket_refund_requests (ticket_id, passenger_user_id, message, status)
     VALUES (?, ?, ?, 'pending')`,
    [ticketId, passengerUserId, message ?? null]
  );

export const findPendingForTicket = (ticketId) =>
  queryAsync(
    `SELECT id FROM ticket_refund_requests
     WHERE ticket_id = ? AND LOWER(TRIM(status)) = 'pending' LIMIT 1`,
    [ticketId]
  );

export const findApprovedForTicket = (ticketId) =>
  queryAsync(
    `SELECT id FROM ticket_refund_requests
     WHERE ticket_id = ? AND LOWER(TRIM(status)) = 'approved' LIMIT 1`,
    [ticketId]
  );

export const listRefundRequestsAll = () =>
  queryAsync(`${selectJoin} ORDER BY r.created_at DESC`);

export const listRefundRequestsForPassenger = (userId) =>
  queryAsync(`${selectJoin} WHERE r.passenger_user_id = ? ORDER BY r.created_at DESC`, [
    userId,
  ]);

export const getRefundRequestById = (id) =>
  queryAsync(`${selectJoin} WHERE r.id = ? LIMIT 1`, [id]);

export const updateRefundRequestStatus = (
  id,
  status,
  adminNote,
  resolvedByUserId
) =>
  queryAsync(
    `UPDATE ticket_refund_requests SET
       status = ?,
       admin_note = ?,
       resolved_by_user_id = ?,
       resolved_at = UTC_TIMESTAMP()
     WHERE id = ? AND LOWER(TRIM(status)) = 'pending'`,
    [status, adminNote ?? null, resolvedByUserId, id]
  );
