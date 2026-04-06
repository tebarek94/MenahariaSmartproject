import bcrypt from "bcrypt";
import { queryAsync } from "../config/db.js";
import {
  createUserAsync,
  getAllUsersAsync,
  getUserByIdAsync,
  updateUserAsync,
  deleteUserAsync,
} from "../models/userModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin } from "../constants/roles.js";

export const create = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const { full_name, phone, email, password, role_id, status } = req.body;
    if (!full_name || !phone || !password || role_id == null) {
      return sendError(res, "full_name, phone, password, and role_id are required", 400);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await createUserAsync(
      full_name,
      phone,
      email,
      passwordHash,
      Number(role_id),
      status ?? "active"
    );
    return sendSuccess(res, { message: "User created", id: result.insertId }, 201);
  } catch (err) {
    return sendError(res, "Failed to create user", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const rows = await getAllUsersAsync();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list users", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isAdmin(req.roleName) && id !== Number(req.user.id)) {
      return sendError(res, "Forbidden", 403);
    }
    const rows = await getUserByIdAsync(req.params.id);
    if (!rows.length) return sendError(res, "User not found", 404);
    const u = rows[0];
    const { password_hash, ...safe } = u;
    return sendSuccess(res, safe);
  } catch (err) {
    return sendError(res, "Failed to get user", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isAdmin(req.roleName) && id !== Number(req.user.id)) {
      return sendError(res, "Forbidden", 403);
    }
    const { full_name, phone, email, role_id, status, password } = req.body;
    if (
      full_name == null ||
      phone == null ||
      email === undefined
    ) {
      return sendError(res, "full_name, phone, and email are required", 400);
    }
    let finalRoleId = role_id;
    let finalStatus = status;
    if (!isAdmin(req.roleName)) {
      const existing = await getUserByIdAsync(id);
      if (!existing.length) return sendError(res, "User not found", 404);
      finalRoleId = existing[0].role_id;
      finalStatus = existing[0].status;
    } else {
      if (role_id == null || status == null) {
        return sendError(res, "role_id and status are required for admin updates", 400);
      }
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await queryAsync(
        `UPDATE users SET full_name = ?, phone = ?, email = ?, role_id = ?, status = ?, password_hash = ? WHERE id = ?`,
        [full_name, phone, email, finalRoleId, finalStatus, passwordHash, id]
      );
    } else {
      await updateUserAsync(id, full_name, phone, email, finalRoleId, finalStatus);
    }
    return sendSuccess(res, { message: "User updated" });
  } catch (err) {
    return sendError(res, "Failed to update user", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    await deleteUserAsync(req.params.id);
    return sendSuccess(res, { message: "User deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete user", 500, err);
  }
};
