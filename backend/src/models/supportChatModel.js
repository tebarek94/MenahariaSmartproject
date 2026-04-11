import { queryAsync } from "../config/db.js";

export function getMessageById(id) {
  return queryAsync(
    `SELECT id, passenger_user_id, from_user_id, body, created_at
     FROM support_chat_messages WHERE id = ?`,
    [id]
  );
}

export function insertMessage(passengerUserId, fromUserId, body) {
  return queryAsync(
    `INSERT INTO support_chat_messages (passenger_user_id, from_user_id, body)
     VALUES (?, ?, ?)`,
    [passengerUserId, fromUserId, body]
  );
}

export function listMessagesForPassengerThread(passengerUserId, limit = 200) {
  return queryAsync(
    `SELECT id, passenger_user_id, from_user_id, body, created_at
     FROM support_chat_messages
     WHERE passenger_user_id = ?
     ORDER BY created_at ASC, id ASC
     LIMIT ?`,
    [passengerUserId, Math.min(Number(limit) || 200, 500)]
  );
}

/** One row per passenger thread: passenger id + last message meta. */
export function listThreadSummariesForAdmin() {
  return queryAsync(
    `SELECT
       m.passenger_user_id AS passenger_user_id,
       MAX(m.created_at) AS last_at,
       (SELECT body FROM support_chat_messages s
        WHERE s.passenger_user_id = m.passenger_user_id
        ORDER BY s.created_at DESC, s.id DESC LIMIT 1) AS last_body,
       (SELECT from_user_id FROM support_chat_messages s2
        WHERE s2.passenger_user_id = m.passenger_user_id
        ORDER BY s2.created_at DESC, s2.id DESC LIMIT 1) AS last_from_user_id
     FROM support_chat_messages m
     GROUP BY m.passenger_user_id
     ORDER BY last_at DESC`
  );
}

export function listMessagesForAdminThread(passengerUserId, limit = 200) {
  return listMessagesForPassengerThread(passengerUserId, limit);
}
