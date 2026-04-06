import { queryAsync } from "../config/db.js";

export const createVehicle = (plateNumber, model, capacity, status) =>
  queryAsync(
    "INSERT INTO vehicles (plate_number, model, capacity, status) VALUES (?, ?, ?, ?)",
    [plateNumber, model ?? null, capacity, status ?? "active"]
  );

export const getAllVehicles = () =>
  queryAsync("SELECT * FROM vehicles ORDER BY id");

export const getVehicleById = (id) =>
  queryAsync("SELECT * FROM vehicles WHERE id = ?", [id]);

export const getVehicleByPlate = (plateNumber) =>
  queryAsync("SELECT id FROM vehicles WHERE plate_number = ? LIMIT 1", [
    plateNumber,
  ]);

export const updateVehicle = (id, plateNumber, model, capacity, status) =>
  queryAsync(
    "UPDATE vehicles SET plate_number = ?, model = ?, capacity = ?, status = ? WHERE id = ?",
    [plateNumber, model ?? null, capacity, status, id]
  );

export const deleteVehicle = (id) =>
  queryAsync("DELETE FROM vehicles WHERE id = ?", [id]);
