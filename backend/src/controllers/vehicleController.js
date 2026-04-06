import * as vehicleModel from "../models/vehicleModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { randomPlateCandidate } from "../utils/plateNumber.js";

async function allocateUniquePlate(preferred) {
  const trimmed = typeof preferred === "string" ? preferred.trim() : "";
  if (trimmed) {
    const taken = await vehicleModel.getVehicleByPlate(trimmed);
    if (taken.length) return { error: "plate_number already in use" };
    return { plate: trimmed };
  }
  for (let i = 0; i < 30; i++) {
    const candidate = randomPlateCandidate();
    const rows = await vehicleModel.getVehicleByPlate(candidate);
    if (!rows.length) return { plate: candidate };
  }
  return { error: "Could not generate a unique plate_number" };
}

export const create = async (req, res) => {
  try {
    const { plate_number, model, capacity, status } = req.body;
    if (capacity == null) {
      return sendError(res, "capacity is required", 400);
    }
    const allocated = await allocateUniquePlate(plate_number);
    if (allocated.error) {
      return sendError(res, allocated.error, allocated.error.includes("generate") ? 500 : 409);
    }
    const result = await vehicleModel.createVehicle(
      allocated.plate,
      model,
      Number(capacity),
      status
    );
    return sendSuccess(
      res,
      {
        message: "Vehicle created",
        id: result.insertId,
        plate_number: allocated.plate,
      },
      201
    );
  } catch (err) {
    return sendError(res, "Failed to create vehicle", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await vehicleModel.getAllVehicles();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list vehicles", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await vehicleModel.getVehicleById(req.params.id);
    if (!rows.length) return sendError(res, "Vehicle not found", 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get vehicle", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const { plate_number, model, capacity, status } = req.body;
    if (!plate_number || capacity == null || !status) {
      return sendError(res, "plate_number, capacity, and status are required", 400);
    }
    await vehicleModel.updateVehicle(
      req.params.id,
      plate_number,
      model,
      Number(capacity),
      status
    );
    return sendSuccess(res, { message: "Vehicle updated" });
  } catch (err) {
    return sendError(res, "Failed to update vehicle", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    await vehicleModel.deleteVehicle(req.params.id);
    return sendSuccess(res, { message: "Vehicle deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete vehicle", 500, err);
  }
};
