import * as seatModel from "../models/seatModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const create = async (req, res) => {
  try {
    const { vehicle_id, seat_number } = req.body;
    if (vehicle_id == null || seat_number == null) {
      return sendError(res, "vehicle_id and seat_number are required", 400);
    }
    const result = await seatModel.createSeat(
      Number(vehicle_id),
      Number(seat_number)
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

export const update = async (req, res) => {
  try {
    const { vehicle_id, seat_number } = req.body;
    if (vehicle_id == null || seat_number == null) {
      return sendError(res, "vehicle_id and seat_number are required", 400);
    }
    await seatModel.updateSeat(
      req.params.id,
      Number(vehicle_id),
      Number(seat_number)
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
