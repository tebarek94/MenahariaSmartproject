import { queryAsync } from "../config/db.js";

/** Hours assumed for overlap when arrival_time is null (driver busy until then). */
const DEFAULT_BLOCK_HOURS = 6;

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

export const createTrip = (
  routeId,
  vehicleId,
  driverId,
  departureTime,
  arrivalTime,
  price,
  status
) =>
  queryAsync(
    `INSERT INTO trips (route_id, vehicle_id, driver_id, departure_time, arrival_time, price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      routeId,
      vehicleId,
      driverId ?? null,
      departureTime,
      arrivalTime ?? null,
      price,
      status ?? "scheduled",
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
  status
) =>
  queryAsync(
    `UPDATE trips SET route_id = ?, vehicle_id = ?, driver_id = ?, departure_time = ?,
     arrival_time = ?, price = ?, status = ? WHERE id = ?`,
    [
      routeId,
      vehicleId,
      driverId ?? null,
      departureTime,
      arrivalTime ?? null,
      price,
      status,
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
    `SELECT t.*, r.origin, r.destination, v.plate_number
     FROM trips t
     INNER JOIN routes r ON r.id = t.route_id
     INNER JOIN vehicles v ON v.id = t.vehicle_id
     WHERE t.status IN ('scheduled','ongoing')
     ORDER BY t.departure_time ASC`
  );
