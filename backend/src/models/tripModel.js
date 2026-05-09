import { queryAsync } from "../config/db.js";

/** Hours assumed for overlap when arrival_time is null (driver busy until then). */
const DEFAULT_BLOCK_HOURS = 6;

/** After assigning a driver, reassign is blocked until this time (env hours, capped at departure). */
export function getDriverTripLockHours() {
  const n = Number(process.env.DRIVER_TRIP_LOCK_HOURS);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

/**
 * @param {string|Date|null|undefined} departureTime
 * @returns {Date|null} UTC moment when the lock ends (null if no lock needed)
 */
export function computeDriverLockExpiresAt(departureTime) {
  const hours = getDriverTripLockHours();
  const add = new Date(Date.now() + hours * 60 * 60 * 1000);
  if (departureTime == null || departureTime === "") return add;
  const dep = new Date(departureTime);
  if (Number.isNaN(dep.getTime())) return add;
  return add.getTime() < dep.getTime() ? add : dep;
}

/**
 * Other trips (same driver) whose time window overlaps this one.
 * Windows: [departure, COALESCE(arrival, departure + DEFAULT_BLOCK_HOURS)].
 * Ignores cancelled/completed trips. excludeTripId for updates.
 */
export const findDriverOverlappingTrips = (
  driverId,
  newDeparture,
  newArrival,
  excludeTripId = null
) =>
  queryAsync(
    `SELECT t.id, t.departure_time, t.arrival_time, t.status
     FROM trips t
     WHERE t.driver_id = ?
       AND (? IS NULL OR t.id <> ?)
       AND LOWER(TRIM(COALESCE(t.status, ''))) NOT IN ('cancelled', 'completed')
       AND ? < COALESCE(t.arrival_time, DATE_ADD(t.departure_time, INTERVAL ${DEFAULT_BLOCK_HOURS} HOUR))
       AND t.departure_time < COALESCE(?, DATE_ADD(?, INTERVAL ${DEFAULT_BLOCK_HOURS} HOUR))`,
    [
      driverId,
      excludeTripId,
      excludeTripId,
      newDeparture,
      newArrival,
      newDeparture,
    ]
  );

/**
 * Distinct driver user IDs already assigned to a non-finished trip whose window overlaps
 * [newDeparture, newArrival] (same rules as findDriverOverlappingTrips). Used to filter admin UI.
 * excludeTripId: omit that trip (e.g. when editing a trip the driver is already on).
 */
export const findBusyDriverIdsForWindow = (
  newDeparture,
  newArrival,
  excludeTripId = null
) =>
  queryAsync(
    `SELECT DISTINCT t.driver_id AS id
     FROM trips t
     WHERE t.driver_id IS NOT NULL
       AND (? IS NULL OR t.id <> ?)
       AND LOWER(TRIM(COALESCE(t.status, ''))) NOT IN ('cancelled', 'completed')
       AND ? < COALESCE(t.arrival_time, DATE_ADD(t.departure_time, INTERVAL ${DEFAULT_BLOCK_HOURS} HOUR))
       AND t.departure_time < COALESCE(?, DATE_ADD(?, INTERVAL ${DEFAULT_BLOCK_HOURS} HOUR))`,
    [
      excludeTripId,
      excludeTripId,
      newDeparture,
      newArrival,
      newDeparture,
    ]
  );

export const createTrip = (
  routeId,
  vehicleId,
  driverId,
  departureTime,
  arrivalTime,
  price,
  status,
  driverLockExpiresAt = null
) =>
  queryAsync(
    `INSERT INTO trips (route_id, vehicle_id, driver_id, departure_time, arrival_time, price, status, driver_lock_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      routeId,
      vehicleId,
      driverId ?? null,
      departureTime,
      arrivalTime ?? null,
      price,
      status ?? "scheduled",
      driverId != null && driverLockExpiresAt
        ? driverLockExpiresAt instanceof Date
          ? driverLockExpiresAt
          : new Date(driverLockExpiresAt)
        : null,
    ]
  );

export const getAllTrips = () =>
  queryAsync("SELECT * FROM trips ORDER BY departure_time DESC");

export const getTripById = (id) =>
  queryAsync("SELECT * FROM trips WHERE id = ?", [id]);

export const updateTrip = (
  id,
  routeId,
  vehicleId,
  driverId,
  departureTime,
  arrivalTime,
  price,
  status,
  driverLockExpiresAt
) =>
  queryAsync(
    `UPDATE trips SET route_id = ?, vehicle_id = ?, driver_id = ?, departure_time = ?,
     arrival_time = ?, price = ?, status = ?, driver_lock_expires_at = ? WHERE id = ?`,
    [
      routeId,
      vehicleId,
      driverId ?? null,
      departureTime,
      arrivalTime ?? null,
      price,
      status,
      driverLockExpiresAt == null
        ? null
        : driverLockExpiresAt instanceof Date
          ? driverLockExpiresAt
          : new Date(driverLockExpiresAt),
      id,
    ]
  );

export const deleteTrip = (id) =>
  queryAsync("DELETE FROM trips WHERE id = ?", [id]);

export const getTripsByDriverId = (driverUserId) =>
  queryAsync(
    `SELECT t.*, r.origin, r.destination, v.plate_number
     FROM trips t
     INNER JOIN routes r ON r.id = t.route_id
     INNER JOIN vehicles v ON v.id = t.vehicle_id
     WHERE t.driver_id = ?
     ORDER BY t.departure_time DESC`,
    [driverUserId]
  );

/** Scheduled / ongoing trips for passengers browsing (not cancelled). */
export const getTripsForPassengerBrowse = () =>
  queryAsync(
    `SELECT
       t.*,
       r.origin,
       r.destination,
       v.plate_number,
       d.full_name AS driver_name,
       d.phone AS driver_phone,
       d.email AS driver_email
     FROM trips t
     INNER JOIN routes r ON r.id = t.route_id
     INNER JOIN vehicles v ON v.id = t.vehicle_id
     LEFT JOIN users d ON d.id = t.driver_id
     WHERE t.status IN ('scheduled','ongoing')
     ORDER BY t.departure_time ASC`
  );
