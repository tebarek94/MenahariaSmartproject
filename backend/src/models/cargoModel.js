import { queryAsync } from "../config/db.js";

export const createCargo = (
  ownerId,
  tripId,
  weight,
  content,
  fee,
  trackingCode,
  status
) =>
  queryAsync(
    `INSERT INTO cargo (owner_id, trip_id, weight, content, fee, tracking_code, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
      tripId,
      weight,
      content ?? null,
      fee,
      trackingCode ?? null,
      status ?? "pending",
    ]
  );

export const getAllCargo = () =>
  queryAsync("SELECT * FROM cargo ORDER BY created_at DESC");

export const getCargoById = (id) =>
  queryAsync("SELECT * FROM cargo WHERE id = ?", [id]);

export const getCargoByIdWithTrip = (id) =>
  queryAsync(
    `SELECT c.*, t.driver_id AS trip_driver_id
     FROM cargo c
     INNER JOIN trips t ON t.id = c.trip_id
     WHERE c.id = ?`,
    [id]
  );

export const updateCargo = (
  id,
  ownerId,
  tripId,
  weight,
  content,
  fee,
  trackingCode,
  status
) =>
  queryAsync(
    `UPDATE cargo SET owner_id = ?, trip_id = ?, weight = ?, content = ?, fee = ?,
     tracking_code = ?, status = ? WHERE id = ?`,
    [
      ownerId,
      tripId,
      weight,
      content ?? null,
      fee,
      trackingCode ?? null,
      status,
      id,
    ]
  );

export const deleteCargo = (id) =>
  queryAsync("DELETE FROM cargo WHERE id = ?", [id]);

export const getCargoByOwnerId = (ownerId) =>
  queryAsync(
    "SELECT * FROM cargo WHERE owner_id = ? ORDER BY created_at DESC",
    [ownerId]
  );

export const getCargoForDriverTrips = (driverUserId) =>
  queryAsync(
    `SELECT c.* FROM cargo c
     INNER JOIN trips t ON t.id = c.trip_id
     WHERE t.driver_id = ?
     ORDER BY c.created_at DESC`,
    [driverUserId]
  );
