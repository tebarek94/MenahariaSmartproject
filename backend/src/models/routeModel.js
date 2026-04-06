import { queryAsync } from "../config/db.js";

export const createRoute = (origin, destination, distanceKm) =>
  queryAsync(
    "INSERT INTO routes (origin, destination, distance_km) VALUES (?, ?, ?)",
    [origin, destination, distanceKm ?? null]
  );

export const getAllRoutes = () =>
  queryAsync("SELECT * FROM routes ORDER BY id");

export const getRouteById = (id) =>
  queryAsync("SELECT * FROM routes WHERE id = ?", [id]);

export const updateRoute = (id, origin, destination, distanceKm) =>
  queryAsync(
    "UPDATE routes SET origin = ?, destination = ?, distance_km = ? WHERE id = ?",
    [origin, destination, distanceKm ?? null, id]
  );

export const deleteRoute = (id) =>
  queryAsync("DELETE FROM routes WHERE id = ?", [id]);
