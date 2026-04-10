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

/** Admin: set trip_id for many cargo rows (assigns cargo to that trip’s driver when trip has driver_id). */
export const bulkAssignCargoToTrip = (tripId, cargoIds) => {
  const ids = [...new Set(cargoIds.map(Number))].filter(
    (n) => Number.isInteger(n) && n > 0
  );
  if (!ids.length) {
    return Promise.resolve({ affectedRows: 0 });
  }
  const ph = ids.map(() => "?").join(",");
  return queryAsync(
    `UPDATE cargo SET trip_id = ? WHERE id IN (${ph})`,
    [tripId, ...ids]
  );
};

export const bulkAssignAllPendingToTrip = (tripId) =>
  queryAsync(
    `UPDATE cargo SET trip_id = ? WHERE LOWER(TRIM(status)) = 'pending'`,
    [tripId]
  );

export const bulkAssignAllCargoToTrip = (tripId) =>
  queryAsync(`UPDATE cargo SET trip_id = ?`, [tripId]);

export const getCargoByOwnerId = (ownerId) =>
  queryAsync(
    "SELECT * FROM cargo WHERE owner_id = ? ORDER BY created_at DESC",
    [ownerId]
  );

/** Passenger dashboard: cargo with trip + route + vehicle labels. */
export const getCargoByOwnerIdWithTrip = (ownerId) =>
  queryAsync(
    `SELECT c.*,
            t.departure_time AS trip_departure_time,
            t.arrival_time AS trip_arrival_time,
            t.status AS trip_status,
            t.price AS trip_price,
            r.origin AS route_origin,
            r.destination AS route_destination,
            v.plate_number AS vehicle_plate
     FROM cargo c
     INNER JOIN trips t ON t.id = c.trip_id
     INNER JOIN routes r ON r.id = t.route_id
     INNER JOIN vehicles v ON v.id = t.vehicle_id
     WHERE c.owner_id = ?
     ORDER BY c.created_at DESC`,
    [ownerId]
  );

/** Cargo on trips assigned to this driver, with route / vehicle / owner for UI. */
export const getCargoForDriverTrips = (driverUserId) =>
  queryAsync(
    `SELECT c.*,
            t.departure_time AS trip_departure_time,
            t.arrival_time AS trip_arrival_time,
            t.status AS trip_status,
            t.driver_id AS trip_driver_id,
            r.origin AS route_origin,
            r.destination AS route_destination,
            v.plate_number AS vehicle_plate,
            o.full_name AS owner_name,
            o.phone AS owner_phone
     FROM cargo c
     INNER JOIN trips t ON t.id = c.trip_id
     INNER JOIN routes r ON r.id = t.route_id
     INNER JOIN vehicles v ON v.id = t.vehicle_id
     INNER JOIN users o ON o.id = c.owner_id
     WHERE t.driver_id = ?
     ORDER BY c.created_at DESC`,
    [driverUserId]
  );
