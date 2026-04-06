import * as rolePermissionModel from "../models/rolePermissionModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const assign = async (req, res) => {
  try {
    const { role_id, permission_id } = req.body;
    if (role_id == null || permission_id == null) {
      return sendError(res, "role_id and permission_id are required", 400);
    }
    await rolePermissionModel.assignPermission(
      Number(role_id),
      Number(permission_id)
    );
    return sendSuccess(res, { message: "Permission assigned to role" }, 201);
  } catch (err) {
    return sendError(res, "Failed to assign permission", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await rolePermissionModel.getAllRolePermissions();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list role permissions", 500, err);
  }
};

export const getByRoleId = async (req, res) => {
  try {
    const rows = await rolePermissionModel.getPermissionsByRoleId(req.params.roleId);
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list permissions for role", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;
    await rolePermissionModel.removeAssignment(
      Number(roleId),
      Number(permissionId)
    );
    return sendSuccess(res, { message: "Assignment removed" });
  } catch (err) {
    return sendError(res, "Failed to remove assignment", 500, err);
  }
};
