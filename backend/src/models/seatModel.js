import { queryAsync } from "../config/db.js";
import crypto from "crypto";

const seatSelect = `
  s.*,
  v.capacity AS vehicle_capacity,
  CASE
    WHEN s.lock_token IS NOT NULL
         AND (s.lock_expires_at IS NULL OR s.lock_expires_at > NOW())
    THEN TRUE
    ELSE FALSE
  END AS is_locked
`;

/** Clear expired holds so availability and is_locked stay accurate. */
export const releaseExpiredSeatLocks = () =>
  queryAsync(
    `UPDATE seats
     SET lock_token = NULL, lock_expires_at = NULL, locked_by = NULL, locked_at = NULL, lock_trip_id = NULL
     WHERE lock_token IS NOT NULL
       AND lock_expires_at IS NOT NULL
       AND lock_expires_at <= NOW()`
  );

/** After a ticket is created, remove the temporary hold on that seat. */
export const clearSeatLockBySeatId = (seatId) =>
  queryAsync(
    `UPDATE seats
     SET lock_token = NULL, lock_expires_at = NULL, locked_by = NULL, locked_at = NULL, lock_trip_id = NULL
     WHERE id = ?`,
    [seatId]
  );

export const createSeat = (vehicleId, seatNumber) =>
  queryAsync(
    "INSERT INTO seats (vehicle_id, seat_number) VALUES (?, ?)",
    [vehicleId, seatNumber]
  );

export const getAllSeats = async () => {
  await releaseExpiredSeatLocks();
  return queryAsync(
    `SELECT ${seatSelect}
     FROM seats s
     LEFT JOIN vehicles v ON s.vehicle_id = v.id
     ORDER BY s.vehicle_id, s.seat_number`
  );
};

export const getSeatById = async (id) => {
  await releaseExpiredSeatLocks();
  return queryAsync(
    `SELECT ${seatSelect}
     FROM seats s
     LEFT JOIN vehicles v ON s.vehicle_id = v.id
     WHERE s.id = ?`,
    [id]
  );
};

export const getSeatsByVehicleId = async (vehicleId) => {
  await releaseExpiredSeatLocks();
  return queryAsync(
    `SELECT ${seatSelect}
     FROM seats s
     LEFT JOIN vehicles v ON s.vehicle_id = v.id
     WHERE s.vehicle_id = ?
     ORDER BY s.seat_number`,
    [vehicleId]
  );
};

export const updateSeat = (id, vehicleId, seatNumber) =>
  queryAsync(
    "UPDATE seats SET vehicle_id = ?, seat_number = ? WHERE id = ?",
    [vehicleId, seatNumber, id]
  );

export const deleteSeat = (id) =>
  queryAsync("DELETE FROM seats WHERE id = ?", [id]);

// New functions for seat validation and management
export const validateSeatNumber = (vehicleId, seatNumber) =>
  queryAsync(
    `SELECT ${seatSelect}
     FROM seats s
     LEFT JOIN vehicles v ON s.vehicle_id = v.id
     WHERE s.vehicle_id = ? AND s.seat_number = ?`,
    [vehicleId, seatNumber]
  );

/** Seats free for this trip: not booked on this trip (non-cancelled) and not held for this trip. */
export const getAvailableSeats = async (vehicleId, tripId) => {
  await releaseExpiredSeatLocks();
  const tid = Number(tripId);
  return queryAsync(
    `SELECT ${seatSelect}
     FROM seats s
     LEFT JOIN vehicles v ON s.vehicle_id = v.id
     WHERE s.vehicle_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM tickets t
         WHERE t.trip_id = ?
           AND t.seat_id = s.id
           AND LOWER(TRIM(COALESCE(t.status, ''))) <> 'cancelled'
       )
       AND NOT (
         s.lock_token IS NOT NULL
         AND (s.lock_expires_at IS NULL OR s.lock_expires_at > NOW())
       )
     ORDER BY s.seat_number`,
    [vehicleId, tid]
  );
};

export const getSeatCapacity = (vehicleId) =>
  queryAsync(
    "SELECT capacity FROM vehicles WHERE id = ?",
    [vehicleId]
  );

export const getVehicleById = (vehicleId) =>
  queryAsync(
    "SELECT id, plate_number, model, capacity FROM vehicles WHERE id = ?",
    [vehicleId]
  );

export const getSeatByVehicleAndNumber = (vehicleId, seatNumber) =>
  queryAsync(
    "SELECT * FROM seats WHERE vehicle_id = ? AND seat_number = ?",
    [vehicleId, seatNumber]
  );

export const countSeatsByVehicleId = (vehicleId) =>
  queryAsync(
    "SELECT COUNT(*) AS total FROM seats WHERE vehicle_id = ?",
    [vehicleId]
  );

export const checkSeatAvailability = async (vehicleId, seatNumber, tripId) => {
  await releaseExpiredSeatLocks();

  const tripIdNum = Number(tripId);
  if (!Number.isInteger(tripIdNum) || tripIdNum <= 0) {
    return { valid: false, reason: "trip_id is required" };
  }

  const tripRows = await queryAsync(
    "SELECT id, vehicle_id FROM trips WHERE id = ?",
    [tripIdNum]
  );
  if (!tripRows.length) {
    return { valid: false, reason: "Trip not found" };
  }
  if (Number(tripRows[0].vehicle_id) !== Number(vehicleId)) {
    return { valid: false, reason: "Trip does not use this vehicle" };
  }

  const vehicle = await queryAsync("SELECT capacity FROM vehicles WHERE id = ?", [vehicleId]);
  if (!vehicle.length) {
    return { valid: false, reason: "Vehicle not found" };
  }

  const capacity = Number(vehicle[0].capacity);
  if (!Number.isFinite(capacity) || capacity <= 0) {
    return { valid: false, reason: "Vehicle capacity is not configured" };
  }

  if (!Number.isInteger(seatNumber) || seatNumber <= 0) {
    return { valid: false, reason: "Invalid seat number" };
  }

  if (seatNumber > capacity) {
    return {
      valid: false,
      reason: `Seat number ${seatNumber} exceeds vehicle capacity of ${capacity}`,
    };
  }

  const seat = await queryAsync(
    "SELECT * FROM seats WHERE vehicle_id = ? AND seat_number = ?",
    [vehicleId, seatNumber]
  );

  if (!seat.length) {
    return { valid: false, reason: "Seat number not found for this vehicle" };
  }

  const activeLockRows = await queryAsync(
    `SELECT id FROM seats
     WHERE id = ? AND vehicle_id = ?
       AND lock_token IS NOT NULL
       AND (lock_expires_at IS NULL OR lock_expires_at > NOW())`,
    [seat[0].id, vehicleId]
  );

  if (activeLockRows.length > 0) {
    return { valid: false, reason: "Seat is temporarily locked for this trip" };
  }

  const bookedSeat = await queryAsync(
    `SELECT t.id FROM tickets t
     WHERE t.trip_id = ? AND t.seat_id = ?
       AND LOWER(TRIM(COALESCE(t.status, ''))) <> 'cancelled'`,
    [tripIdNum, seat[0].id]
  );

  if (bookedSeat.length > 0) {
    return { valid: false, reason: "Seat already booked on this trip" };
  }

  return { valid: true, seat: seat[0], vehicle: vehicle[0] };
};

// Seat locking functions (hold is scoped to a trip so other trips on the same bus are not blocked)
export const lockSeat = async (
  vehicleId,
  seatNumber,
  userId,
  lockDuration = 15,
  tripId
) => {
  try {
    await releaseExpiredSeatLocks();
    const availability = await checkSeatAvailability(vehicleId, seatNumber, tripId);
    if (!availability.valid) {
      return { success: false, reason: availability.reason };
    }

    const tripIdNum = Number(tripId);
    if (!Number.isInteger(tripIdNum) || tripIdNum <= 0) {
      return { success: false, reason: "trip_id is required" };
    }

    const lockExpiresAt = new Date();
    lockExpiresAt.setMinutes(lockExpiresAt.getMinutes() + lockDuration);

    const lockToken = crypto.randomBytes(32).toString("hex");

    await queryAsync(
      `UPDATE seats SET 
        lock_token = ?, 
        lock_expires_at = ?, 
        locked_by = ?, 
        locked_at = NOW(),
        lock_trip_id = ?
       WHERE vehicle_id = ? AND seat_number = ?`,
      [lockToken, lockExpiresAt, userId, tripIdNum, vehicleId, seatNumber]
    );

    await queryAsync(
      `INSERT INTO seat_locks (seat_id, vehicle_id, trip_id, user_id, lock_token, lock_expires_at, locked_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [availability.seat.id, vehicleId, tripIdNum, userId, lockToken, lockExpiresAt]
    );
    
    return { 
      success: true, 
      lockToken: lockToken,
      expiresAt: lockExpiresAt,
      seat: availability.seat
    };
  } catch (error) {
    console.error("lockSeat:", error);
    return { success: false, reason: "Failed to lock seat" };
  }
};

export const unlockSeat = async (vehicleId, seatNumber, lockToken) => {
  try {
    // Verify the lock token and check if it's still valid
    const seat = await queryAsync(
      `SELECT * FROM seats WHERE vehicle_id = ? AND seat_number = ? AND lock_token = ?
       AND (lock_expires_at IS NULL OR lock_expires_at > NOW())`,
      [vehicleId, seatNumber, lockToken]
    );
    
    if (!seat.length) {
      return { success: false, reason: "Seat not found or lock expired" };
    }
    
    // Check if the lock belongs to the current user (optional security check)
    // if (seat[0].locked_by !== userId) {
    //   return { success: false, reason: "Seat was locked by another user" };
    // }
    
    await queryAsync(
      "UPDATE seats SET lock_token = NULL, lock_expires_at = NULL, locked_by = NULL, locked_at = NULL, lock_trip_id = NULL WHERE vehicle_id = ? AND seat_number = ?",
      [vehicleId, seatNumber]
    );

    await queryAsync(
      `UPDATE seat_locks
       SET unlocked_at = NOW()
       WHERE seat_id = ? AND lock_token = ? AND unlocked_at IS NULL`,
      [seat[0].id, lockToken]
    );
    
    return { success: true, seat: seat[0] };
  } catch (error) {
    return { success: false, reason: "Failed to unlock seat" };
  }
};

export const isSeatLocked = async (vehicleId, seatNumber, tripId) => {
  try {
    await releaseExpiredSeatLocks();
    const tid = tripId != null ? Number(tripId) : null;
    const rows = await queryAsync(
      tid != null && Number.isInteger(tid) && tid > 0
        ? `SELECT id, lock_token, lock_expires_at, locked_by, lock_trip_id FROM seats
       WHERE vehicle_id = ? AND seat_number = ?
         AND lock_token IS NOT NULL
         AND (lock_expires_at IS NULL OR lock_expires_at > NOW())
         AND (lock_trip_id IS NULL OR lock_trip_id = ?)`
        : `SELECT id, lock_token, lock_expires_at, locked_by, lock_trip_id FROM seats
       WHERE vehicle_id = ? AND seat_number = ?
         AND lock_token IS NOT NULL
         AND (lock_expires_at IS NULL OR lock_expires_at > NOW())`,
      tid != null && Number.isInteger(tid) && tid > 0
        ? [vehicleId, seatNumber, tid]
        : [vehicleId, seatNumber]
    );

    if (!rows.length) {
      const exists = await queryAsync(
        "SELECT id FROM seats WHERE vehicle_id = ? AND seat_number = ?",
        [vehicleId, seatNumber]
      );
      if (!exists.length) return { locked: false, reason: "Seat not found" };
      return {
        locked: false,
        seatId: exists[0].id,
        lockToken: null,
        expiresAt: null,
        lockedBy: null,
      };
    }

    const row = rows[0];
    return {
      locked: true,
      seatId: row.id,
      lockToken: row.lock_token,
      expiresAt: row.lock_expires_at,
      lockedBy: row.locked_by,
    };
  } catch (error) {
    console.error("isSeatLocked:", error);
    return { locked: false, reason: "Failed to check seat lock status" };
  }
};

export const getLockedSeats = async (vehicleId) => {
  try {
    await releaseExpiredSeatLocks();
    const lockedSeats = await queryAsync(
      `SELECT s.*, v.plate_number AS vehicle_plate, v.model AS vehicle_model
       FROM seats s
       LEFT JOIN vehicles v ON s.vehicle_id = v.id
       WHERE s.vehicle_id = ?
         AND s.lock_token IS NOT NULL
         AND (s.lock_expires_at IS NULL OR s.lock_expires_at > NOW())
       ORDER BY s.seat_number`,
      [vehicleId]
    );
    
    return { success: true, seats: lockedSeats };
  } catch (error) {
    return { success: false, reason: "Failed to get locked seats" };
  }
};

export const getSeatWithVehicleInfo = (seatId) =>
  queryAsync(
    "SELECT s.*, v.plate_number, v.model, v.capacity as vehicle_capacity FROM seats s LEFT JOIN vehicles v ON s.vehicle_id = v.id WHERE s.id = ?",
    [seatId]
  );
