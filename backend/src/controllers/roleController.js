import * as roleModel from "../models/roleModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "name is required", 400);
    const result = await roleModel.createRole(name);
    return sendSuccess(res, { message: "Role created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create role", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await roleModel.getAllRoles();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list roles", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await roleModel.getRoleById(req.params.id);
    if (!rows.length) return sendError(res, "Role not found", 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get role", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "name is required", 400);
    await roleModel.updateRole(req.params.id, name);
    return sendSuccess(res, { message: "Role updated" });
  } catch (err) {
    return sendError(res, "Failed to update role", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    await roleModel.deleteRole(req.params.id);
    return sendSuccess(res, { message: "Role deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete role", 500, err);
  }
};
