import { queryAsync } from "../config/db.js";

export const createRole = (name) =>
  queryAsync("INSERT INTO roles (name) VALUES (?)", [name]);

export const getAllRoles = () => queryAsync("SELECT * FROM roles ORDER BY id");

export const getRoleById = (id) =>
  queryAsync("SELECT * FROM roles WHERE id = ?", [id]);

export const updateRole = (id, name) =>
  queryAsync("UPDATE roles SET name = ? WHERE id = ?", [name, id]);

export const deleteRole = (id) =>
  queryAsync("DELETE FROM roles WHERE id = ?", [id]);
