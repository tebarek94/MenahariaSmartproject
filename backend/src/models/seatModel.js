import { queryAsync } from "../config/db.js";

export const createSeat = (vehicleId, seatNumber) =>
  queryAsync(
    "INSERT INTO seats (vehicle_id, seat_number) VALUES (?, ?)",
    [vehicleId, seatNumber]
  );

export const getAllSeats = () =>
  queryAsync("SELECT * FROM seats ORDER BY vehicle_id, seat_number");

export const getSeatById = (id) =>
  queryAsync("SELECT * FROM seats WHERE id = ?", [id]);

export const getSeatsByVehicleId = (vehicleId) =>
  queryAsync(
    "SELECT * FROM seats WHERE vehicle_id = ? ORDER BY seat_number",
    [vehicleId]
  );

export const updateSeat = (id, vehicleId, seatNumber) =>
  queryAsync(
    "UPDATE seats SET vehicle_id = ?, seat_number = ? WHERE id = ?",
    [vehicleId, seatNumber, id]
  );

export const deleteSeat = (id) =>
  queryAsync("DELETE FROM seats WHERE id = ?", [id]);
