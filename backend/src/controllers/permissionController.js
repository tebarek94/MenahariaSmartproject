import * as permissionModel from "../models/permissionModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "name is required", 400);
    const result = await permissionModel.createPermission(name);
    return sendSuccess(res, { message: "Permission created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create permission", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await permissionModel.getAllPermissions();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list permissions", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await permissionModel.getPermissionById(req.params.id);
    if (!rows.length) return sendError(res, "Permission not found", 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get permission", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "name is required", 400);
    await permissionModel.updatePermission(req.params.id, name);
    return sendSuccess(res, { message: "Permission updated" });
  } catch (err) {
    return sendError(res, "Failed to update permission", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    await permissionModel.deletePermission(req.params.id);
    return sendSuccess(res, { message: "Permission deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete permission", 500, err);
  }
};
