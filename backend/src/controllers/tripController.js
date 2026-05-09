import * as tripModel from "../models/tripModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isDriver, isPassenger } from "../constants/roles.js";
import { logAutoReportTask } from "../utils/reportActivity.js";

/** Admin: driver IDs busy in the same time window (for trip form dropdowns). */
export const getBusyDriversForWindow = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const dep = req.query.departure_time;
    const arr = req.query.arrival_time || null;
    const ex = req.query.exclude_trip_id;
    if (dep == null || dep === "") {
      return sendError(res, "departure_time query is required", 400);
    }
    let excludeTripId = null;
    if (ex != null && String(ex).trim() !== "") {
      const n = Number(ex);
      if (!Number.isInteger(n) || n <= 0) {
        return sendError(res, "exclude_trip_id must be a positive integer", 400);
      }
      excludeTripId = n;
    }
    const rows = await tripModel.findBusyDriverIdsForWindow(
      dep,
      arr,
      excludeTripId
    );
    const busy_driver_ids = rows
      .map((r) => Number(r.id))
      .filter((n) => Number.isInteger(n) && n > 0);
    return sendSuccess(res, { busy_driver_ids });
  } catch (err) {
    return sendError(res, "Failed to list busy drivers", 500, err);
  }
};

function normalizeTripDriverId(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function assertDriverAvailableForWindow(
  res,
  driverId,
  departureTime,
  arrivalTime,
  excludeTripId = null
) {
  if (driverId == null || driverId === "") return true;
  const id = Number(driverId);
  if (!Number.isInteger(id) || id <= 0) return true;
  const rows = await tripModel.findDriverOverlappingTrips(
    id,
    departureTime,
    arrivalTime ?? null,
    excludeTripId
  );
  if (rows.length) {
    const o = rows[0];
    sendError(
      res,
      `This driver is already assigned to trip #${o.id} (starts ${o.departure_time}) with an overlapping time window. Choose another driver or change departure/arrival so trips do not overlap.`,
      409
    );
    return false;
  }
  return true;
}

export const create = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const {
      route_id,
      vehicle_id,
      driver_id,
      departure_time,
      arrival_time,
      price,
      status,
    } = req.body;
    if (route_id == null || vehicle_id == null || !departure_time || price == null) {
      return sendError(
        res,
        "route_id, vehicle_id, departure_time, and price are required",
        400
      );
    }
    const okDriver = await assertDriverAvailableForWindow(
      res,
      driver_id,
      departure_time,
      arrival_time ?? null,
      null
    );
    if (!okDriver) return;
    const dId = normalizeTripDriverId(driver_id);
    const driverLockAt =
      dId != null
        ? tripModel.computeDriverLockExpiresAt(departure_time)
        : null;
    const result = await tripModel.createTrip(
      Number(route_id),
      Number(vehicle_id),
      dId,
      departure_time,
      arrival_time ?? null,
      Number(price),
      status,
      driverLockAt
    );
    void logAutoReportTask({
      type: "trip_scheduled",
      summary: `Trip #${result.insertId}: route ${route_id}, vehicle ${vehicle_id}${
        driver_id != null ? `, driver ${driver_id}` : ""
      }`,
      date_range: `trip_id:${result.insertId}`,
    });
    return sendSuccess(res, { message: "Trip created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create trip", 500, err);
  }
};

/** Public: upcoming scheduled/ongoing trips for marketing / landing (no auth). */
export const getPublicBrowse = async (req, res) => {
  try {
    const rows = await tripModel.getTripsForPassengerBrowse();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list trips", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    if (isAdmin(req.roleName)) {
      const rows = await tripModel.getAllTrips();
      return sendSuccess(res, rows);
    }
    if (isDriver(req.roleName)) {
      const rows = await tripModel.getTripsByDriverId(req.user.id);
      return sendSuccess(res, rows);
    }
    if (isPassenger(req.roleName)) {
      const rows = await tripModel.getTripsForPassengerBrowse();
      return sendSuccess(res, rows);
    }
    return sendError(res, "Forbidden", 403);
  } catch (err) {
    return sendError(res, "Failed to list trips", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await tripModel.getTripById(req.params.id);
    if (!rows.length) return sendError(res, "Trip not found", 404);
    const trip = rows[0];
    if (isAdmin(req.roleName)) {
      return sendSuccess(res, trip);
    }
    if (
      isDriver(req.roleName) &&
      trip.driver_id != null &&
      Number(trip.driver_id) === Number(req.user.id)
    ) {
      return sendSuccess(res, trip);
    }
    if (
      isPassenger(req.roleName) &&
      ["scheduled", "ongoing"].includes(trip.status)
    ) {
      return sendSuccess(res, trip);
    }
    return sendError(res, "Forbidden", 403);
  } catch (err) {
    return sendError(res, "Failed to get trip", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const {
      route_id,
      vehicle_id,
      driver_id,
      departure_time,
      arrival_time,
      price,
      status,
      force_unlock,
    } = req.body;
    if (
      route_id == null ||
      vehicle_id == null ||
      !departure_time ||
      price == null ||
      !status
    ) {
      return sendError(
        res,
        "route_id, vehicle_id, departure_time, price, and status are required",
        400
      );
    }
    const existingRows = await tripModel.getTripById(req.params.id);
    if (!existingRows.length) {
      return sendError(res, "Trip not found", 404);
    }
    const row = existingRows[0];
    const newDriver = normalizeTripDriverId(driver_id);
    const oldDriver = normalizeTripDriverId(row.driver_id);
    const driverChangeRequested = newDriver !== oldDriver;
    const stRow = String(row.status ?? "").toLowerCase();
    const skipDriverLock = stRow === "cancelled" || stRow === "completed";
    const lockUntil = row.driver_lock_expires_at
      ? new Date(row.driver_lock_expires_at)
      : null;
    const locked =
      lockUntil && !Number.isNaN(lockUntil.getTime()) && Date.now() < lockUntil.getTime();
    if (
      driverChangeRequested &&
      locked &&
      !skipDriverLock &&
      !force_unlock
    ) {
      return sendError(
        res,
        `This trip's driver is locked until ${lockUntil.toISOString()}. You can edit route, times, and price, or wait until the lock expires. To change the driver sooner, re-save with force_unlock: true (admin).`,
        409
      );
    }
    const okDriver = await assertDriverAvailableForWindow(
      res,
      driver_id,
      departure_time,
      arrival_time ?? null,
      Number(req.params.id)
    );
    if (!okDriver) return;
    let nextLockExpires;
    if (newDriver == null) {
      nextLockExpires = null;
    } else if (driverChangeRequested) {
      nextLockExpires = tripModel.computeDriverLockExpiresAt(departure_time);
    } else {
      const prev = row.driver_lock_expires_at
        ? new Date(row.driver_lock_expires_at)
        : null;
      nextLockExpires =
        prev && !Number.isNaN(prev.getTime()) ? prev : null;
    }
    await tripModel.updateTrip(
      req.params.id,
      Number(route_id),
      Number(vehicle_id),
      newDriver,
      departure_time,
      arrival_time ?? null,
      Number(price),
      status,
      nextLockExpires
    );
    return sendSuccess(res, { message: "Trip updated" });
  } catch (err) {
    return sendError(res, "Failed to update trip", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    await tripModel.deleteTrip(req.params.id);
    return sendSuccess(res, { message: "Trip deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete trip", 500, err);
  }
};
