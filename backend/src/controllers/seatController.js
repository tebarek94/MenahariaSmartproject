import * as seatModel from "../models/seatModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

async function validateSeatPayload({ vehicle_id, seat_number, seatId = null }) {
  if (vehicle_id == null || seat_number == null) {
    return { valid: false, status: 400, message: "vehicle_id and seat_number are required" };
  }

  const vehicleId = Number(vehicle_id);
  const seatNumber = Number(seat_number);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return {
      valid: false,
      status: 400,
      message: "Vehicle id must be a valid positive number.",
    };
  }

  if (!Number.isInteger(seatNumber) || seatNumber <= 0) {
    return {
      valid: false,
      status: 400,
      message: "Seat number must be a whole number greater than 0.",
    };
  }

  const vehicles = await seatModel.getVehicleById(vehicleId);
  if (!vehicles.length) {
    return {
      valid: false,
      status: 404,
      message: `Vehicle ${vehicleId} was not found. Select an existing vehicle before creating a seat.`,
    };
  }

  const vehicle = vehicles[0];
  const capacity = Number(vehicle.capacity);

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return {
      valid: false,
      status: 400,
      message: `Vehicle ${vehicleId} does not have a valid capacity configured yet.`,
    };
  }

  if (seatNumber > capacity) {
    const vehicleLabel =
      vehicle.plate_number || vehicle.model || `vehicle ${vehicleId}`;
    return {
      valid: false,
      status: 400,
      message: `Seat number ${seatNumber} is invalid for ${vehicleLabel}. This vehicle only supports seat numbers from 1 to ${capacity}.`,
    };
  }

  const existingSeats = await seatModel.getSeatByVehicleAndNumber(vehicleId, seatNumber);
  const duplicateSeat = existingSeats.find(
    (seat) => seatId == null || Number(seat.id) !== Number(seatId)
  );

  if (duplicateSeat) {
    return {
      valid: false,
      status: 409,
      message: `Seat number ${seatNumber} already exists for this vehicle. Choose a different seat number.`,
    };
  }

  let oldVehicleId = null;
  if (seatId != null) {
    const existingRows = await seatModel.getSeatById(seatId);
    if (!existingRows.length) {
      return { valid: false, status: 404, message: "Seat not found" };
    }
    oldVehicleId = Number(existingRows[0].vehicle_id);
  }

  const counts = await seatModel.countSeatsByVehicleId(vehicleId);
  const currentCount = Number(counts[0]?.total ?? 0);

  if (seatId == null) {
    if (currentCount + 1 > capacity) {
      return {
        valid: false,
        status: 400,
        message: `Cannot add more seats to this vehicle. It is configured for a maximum capacity of ${capacity} seats.`,
      };
    }
  } else if (Number(oldVehicleId) === Number(vehicleId)) {
    if (currentCount > capacity) {
      return {
        valid: false,
        status: 400,
        message: `This vehicle exceeds its configured capacity of ${capacity} seats.`,
      };
    }
  } else if (currentCount + 1 > capacity) {
    return {
      valid: false,
      status: 400,
      message: `Cannot move this seat: target vehicle already has the maximum of ${capacity} seats.`,
    };
  }

  return {
    valid: true,
    vehicleId,
    seatNumber,
  };
}

export const create = async (req, res) => {
  try {
    const validation = await validateSeatPayload(req.body);
    if (!validation.valid) {
      return sendError(res, validation.message, validation.status);
    }
    const result = await seatModel.createSeat(
      validation.vehicleId,
      validation.seatNumber
    );
    return sendSuccess(res, { message: "Seat created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create seat", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await seatModel.getAllSeats();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list seats", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await seatModel.getSeatById(req.params.id);
    if (!rows.length) return sendError(res, "Seat not found", 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get seat", 500, err);
  }
};

export const getByVehicleId = async (req, res) => {
  try {
    const rows = await seatModel.getSeatsByVehicleId(req.params.vehicleId);
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list seats for vehicle", 500, err);
  }
};

export const getAvailableByVehicleId = async (req, res) => {
  try {
    const tripId =
      req.query.trip_id != null ? Number(req.query.trip_id) : NaN;
    if (!Number.isInteger(tripId) || tripId <= 0) {
      return sendError(
        res,
        "Query parameter trip_id is required (seats are available per trip).",
        400
      );
    }
    const rows = await seatModel.getAvailableSeats(
      Number(req.params.vehicleId),
      tripId
    );
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list available seats for vehicle", 500, err);
  }
};

export const getLockedByVehicleId = async (req, res) => {
  try {
    const result = await seatModel.getLockedSeats(req.params.vehicleId);
    if (!result.success) {
      return sendError(res, result.reason || "Failed to list locked seats", 400);
    }
    return sendSuccess(res, result.seats);
  } catch (err) {
    return sendError(res, "Failed to list locked seats", 500, err);
  }
};

export const getLockStatus = async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const seatNumber = Number(req.params.seatNumber);
    const tripId =
      req.query.trip_id != null ? Number(req.query.trip_id) : undefined;
    const result = await seatModel.isSeatLocked(vehicleId, seatNumber, tripId);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, "Failed to get seat lock status", 500, err);
  }
};

export const lock = async (req, res) => {
  try {
    const { vehicle_id, seat_number, trip_id, lock_duration } = req.body;
    if (vehicle_id == null || seat_number == null || trip_id == null) {
      return sendError(
        res,
        "vehicle_id, seat_number, and trip_id are required",
        400
      );
    }

    const result = await seatModel.lockSeat(
      Number(vehicle_id),
      Number(seat_number),
      Number(req.user.id),
      lock_duration != null ? Number(lock_duration) : 15,
      Number(trip_id)
    );

    if (!result.success) {
      return sendError(res, result.reason || "Failed to lock seat", 400);
    }

    return sendSuccess(res, {
      message: "Seat locked",
      lock_token: result.lockToken,
      expires_at: result.expiresAt,
      seat: result.seat,
    });
  } catch (err) {
    return sendError(res, "Failed to lock seat", 500, err);
  }
};

export const unlock = async (req, res) => {
  try {
    const { vehicle_id, seat_number, lock_token } = req.body;
    if (vehicle_id == null || seat_number == null || !lock_token) {
      return sendError(
        res,
        "vehicle_id, seat_number, and lock_token are required",
        400
      );
    }

    const result = await seatModel.unlockSeat(
      Number(vehicle_id),
      Number(seat_number),
      String(lock_token)
    );

    if (!result.success) {
      return sendError(res, result.reason || "Failed to unlock seat", 400);
    }

    return sendSuccess(res, { message: "Seat unlocked", seat: result.seat });
  } catch (err) {
    return sendError(res, "Failed to unlock seat", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const existing = await seatModel.getSeatById(req.params.id);
    if (!existing.length) {
      return sendError(res, "Seat not found", 404);
    }

    const validation = await validateSeatPayload({
      ...req.body,
      seatId: req.params.id,
    });
    if (!validation.valid) {
      return sendError(res, validation.message, validation.status);
    }
    await seatModel.updateSeat(
      req.params.id,
      validation.vehicleId,
      validation.seatNumber
    );
    return sendSuccess(res, { message: "Seat updated" });
  } catch (err) {
    return sendError(res, "Failed to update seat", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    await seatModel.deleteSeat(req.params.id);
    return sendSuccess(res, { message: "Seat deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete seat", 500, err);
  }
};
