import { queryAsync } from "../config/db.js";

export const assignPermission = (roleId, permissionId) =>
  queryAsync(
    "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
    [roleId, permissionId]
  );

export const getAllRolePermissions = () =>
  queryAsync(
    `SELECT rp.role_id, rp.permission_id, r.name AS role_name, p.name AS permission_name
     FROM role_permissions rp
     JOIN roles r ON r.id = rp.role_id
     JOIN permissions p ON p.id = rp.permission_id
     ORDER BY rp.role_id, rp.permission_id`
  );

export const getPermissionsByRoleId = (roleId) =>
  queryAsync(
    `SELECT rp.permission_id, p.name AS permission_name
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?`,
    [roleId]
  );

export const removeAssignment = (roleId, permissionId) =>
  queryAsync(
    "DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?",
    [roleId, permissionId]
  );
