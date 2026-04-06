import { queryAsync } from "../config/db.js";

export const createPermission = (name) =>
  queryAsync("INSERT INTO permissions (name) VALUES (?)", [name]);

export const getAllPermissions = () =>
  queryAsync("SELECT * FROM permissions ORDER BY id");

export const getPermissionById = (id) =>
  queryAsync("SELECT * FROM permissions WHERE id = ?", [id]);

export const updatePermission = (id, name) =>
  queryAsync("UPDATE permissions SET name = ? WHERE id = ?", [name, id]);

export const deletePermission = (id) =>
  queryAsync("DELETE FROM permissions WHERE id = ?", [id]);
