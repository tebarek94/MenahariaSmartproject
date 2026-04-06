import * as cargoModel from "../models/cargoModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { resolveCargoFee } from "../utils/cargoFee.js";
import { isAdmin, isDriver, isPassenger } from "../constants/roles.js";

function canAccessCargoRow(req, row) {
  if (isAdmin(req.roleName)) return true;
  if (isPassenger(req.roleName) && Number(row.owner_id) === Number(req.user.id))
    return true;
  if (
    isDriver(req.roleName) &&
    row.trip_driver_id != null &&
    Number(row.trip_driver_id) === Number(req.user.id)
  )
    return true;
  return false;
}

export const create = async (req, res) => {
  try {
    if (isDriver(req.roleName)) {
      return sendError(res, "Drivers cannot create cargo bookings here", 403);
    }
    let { owner_id, trip_id, weight, content, tracking_code, status } =
      req.body;
    if (trip_id == null || weight == null) {
      return sendError(res, "trip_id and weight are required", 400);
    }
    const feeResult = resolveCargoFee(weight, req.body, {
      isAdmin: isAdmin(req.roleName),
    });
    if (feeResult.error) {
      return sendError(res, feeResult.error, 400);
    }
    if (isPassenger(req.roleName)) {
      owner_id = req.user.id;
    }
    if (owner_id == null) {
      return sendError(res, "owner_id is required", 400);
    }
    const result = await cargoModel.createCargo(
      Number(owner_id),
      Number(trip_id),
      Number(weight),
      content,
      feeResult.fee,
      tracking_code,
      status
    );
    return sendSuccess(
      res,
      {
        message: "Cargo created",
        id: result.insertId,
        fee: feeResult.fee,
        fee_auto: !feeResult.overridden,
        fee_breakdown: feeResult.breakdown,
      },
      201
    );
  } catch (err) {
    return sendError(res, "Failed to create cargo", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    if (isAdmin(req.roleName)) {
      const rows = await cargoModel.getAllCargo();
      return sendSuccess(res, rows);
    }
    if (isPassenger(req.roleName)) {
      const rows = await cargoModel.getCargoByOwnerId(req.user.id);
      return sendSuccess(res, rows);
    }
    if (isDriver(req.roleName)) {
      const rows = await cargoModel.getCargoForDriverTrips(req.user.id);
      return sendSuccess(res, rows);
    }
    return sendError(res, "Forbidden", 403);
  } catch (err) {
    return sendError(res, "Failed to list cargo", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await cargoModel.getCargoByIdWithTrip(req.params.id);
    if (!rows.length) return sendError(res, "Cargo not found", 404);
    if (!canAccessCargoRow(req, rows[0])) {
      return sendError(res, "Forbidden", 403);
    }
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get cargo", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    if (isDriver(req.roleName)) {
      return sendError(res, "Drivers cannot update cargo", 403);
    }
    const existing = await cargoModel.getCargoByIdWithTrip(req.params.id);
    if (!existing.length) return sendError(res, "Cargo not found", 404);
    if (!canAccessCargoRow(req, existing[0])) {
      return sendError(res, "Forbidden", 403);
    }
    let { owner_id, trip_id, weight, content, tracking_code, status } =
      req.body;
    if (
      owner_id == null ||
      trip_id == null ||
      weight == null ||
      !status
    ) {
      return sendError(
        res,
        "owner_id, trip_id, weight, and status are required",
        400
      );
    }
    const feeResult = resolveCargoFee(weight, req.body, {
      isAdmin: isAdmin(req.roleName),
    });
    if (feeResult.error) {
      return sendError(res, feeResult.error, 400);
    }
    if (isPassenger(req.roleName)) {
      owner_id = req.user.id;
    }
    if (!isAdmin(req.roleName) && Number(owner_id) !== Number(req.user.id)) {
      return sendError(res, "Forbidden", 403);
    }
    await cargoModel.updateCargo(
      req.params.id,
      Number(owner_id),
      Number(trip_id),
      Number(weight),
      content,
      feeResult.fee,
      tracking_code,
      status
    );
    return sendSuccess(res, {
      message: "Cargo updated",
      fee: feeResult.fee,
      fee_auto: !feeResult.overridden,
      fee_breakdown: feeResult.breakdown,
    });
  } catch (err) {
    return sendError(res, "Failed to update cargo", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    if (isDriver(req.roleName)) {
      return sendError(res, "Drivers cannot delete cargo", 403);
    }
    const existing = await cargoModel.getCargoByIdWithTrip(req.params.id);
    if (!existing.length) return sendError(res, "Cargo not found", 404);
    if (isPassenger(req.roleName)) {
      if (Number(existing[0].owner_id) !== Number(req.user.id)) {
        return sendError(res, "Forbidden", 403);
      }
    } else if (!isAdmin(req.roleName)) {
      return sendError(res, "Forbidden", 403);
    }
    await cargoModel.deleteCargo(req.params.id);
    return sendSuccess(res, { message: "Cargo deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete cargo", 500, err);
  }
};
