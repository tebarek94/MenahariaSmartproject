import { queryAsync } from "../config/db.js";

const ASSIGNMENT_TTL_HOURS = Math.max(
  1,
  Number.parseInt(process.env.PASSENGER_DRIVER_ASSIGNMENT_TTL_HOURS || "24", 10) ||
    24
);

export const listPassengerDriverAssignments = (driverUserId = null) =>
  queryAsync(
    `SELECT
       a.id,
       a.passenger_user_id,
       a.driver_user_id,
       a.assigned_by_user_id,
       a.expires_at,
       a.created_at,
       a.updated_at,
       p.full_name AS passenger_name,
       p.phone AS passenger_phone,
       d.full_name AS driver_name,
       d.phone AS driver_phone,
       ab.full_name AS assigned_by_name
     FROM passenger_driver_assignments a
     INNER JOIN users p ON p.id = a.passenger_user_id
     INNER JOIN users d ON d.id = a.driver_user_id
     LEFT JOIN users ab ON ab.id = a.assigned_by_user_id
     WHERE (a.expires_at IS NULL OR a.expires_at > UTC_TIMESTAMP())
       AND (? IS NULL OR a.driver_user_id = ?)
     ORDER BY a.updated_at DESC, a.id DESC`,
    [driverUserId, driverUserId]
  );

export const upsertPassengerDriverAssignment = (
  passengerUserId,
  driverUserId,
  assignedByUserId
) =>
  queryAsync(
    `INSERT INTO passenger_driver_assignments
       (passenger_user_id, driver_user_id, assigned_by_user_id, expires_at)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${ASSIGNMENT_TTL_HOURS} HOUR))
     ON DUPLICATE KEY UPDATE
       driver_user_id = VALUES(driver_user_id),
       assigned_by_user_id = VALUES(assigned_by_user_id),
       expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${ASSIGNMENT_TTL_HOURS} HOUR),
       updated_at = CURRENT_TIMESTAMP`,
    [passengerUserId, driverUserId, assignedByUserId]
  );

export const removePassengerDriverAssignment = (passengerUserId) =>
  queryAsync("DELETE FROM passenger_driver_assignments WHERE passenger_user_id = ?", [
    passengerUserId,
  ]);
