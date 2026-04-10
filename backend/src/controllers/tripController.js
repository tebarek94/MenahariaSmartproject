import * as tripModel from "../models/tripModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isDriver, isPassenger } from "../constants/roles.js";
import { logAutoReportTask } from "../utils/reportActivity.js";

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
    const result = await tripModel.createTrip(
      Number(route_id),
      Number(vehicle_id),
      driver_id != null ? Number(driver_id) : null,
      departure_time,
      arrival_time ?? null,
      Number(price),
      status
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
    const okDriver = await assertDriverAvailableForWindow(
      res,
      driver_id,
      departure_time,
      arrival_time ?? null,
      Number(req.params.id)
    );
    if (!okDriver) return;
    await tripModel.updateTrip(
      req.params.id,
      Number(route_id),
      Number(vehicle_id),
      driver_id != null ? Number(driver_id) : null,
      departure_time,
      arrival_time ?? null,
      Number(price),
      status
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
