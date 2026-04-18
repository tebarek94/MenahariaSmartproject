import bcrypt from "bcrypt";
import { queryAsync } from "../config/db.js";
import {
  createUserAsync,
  getAllUsersAsync,
  getPassengerUsersAsync,
  getUserByIdAsync,
  updateUserAsync,
  deleteUserAsync,
} from "../models/userModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin } from "../constants/roles.js";
import { logAutoReportTask } from "../utils/reportActivity.js";
import {
  ethiopianPhoneVariants,
  normalizeEthiopianPhone,
} from "../utils/ethiopianPhone.js";

function stripUserSecrets(row) {
  if (!row || typeof row !== "object") return row;
  const { password_hash, two_factor_secret, ...rest } = row;
  if ("two_factor_enabled" in rest) {
    rest.two_factor_enabled = Boolean(Number(rest.two_factor_enabled ?? 0));
  }
  return rest;
}

const ETHIOPIAN_PHONE_ERROR =
  "Enter a valid Ethiopian phone number (e.g. 0912345678 or +251912345678).";

async function findUserByPhoneVariants(phone, excludeId = null) {
  const variants = ethiopianPhoneVariants(phone);
  if (!variants.length) return null;
  const placeholders = variants.map(() => "?").join(", ");
  const params = [...variants];
  let sql = `SELECT id FROM users WHERE phone IN (${placeholders})`;
  if (excludeId != null) {
    sql += " AND id <> ?";
    params.push(Number(excludeId));
  }
  sql += " LIMIT 1";
  const rows = await queryAsync(sql, params);
  return rows[0] ?? null;
}

export const create = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const { full_name, phone, email, password, role_id, status } = req.body;
    if (!full_name || !phone || !password || role_id == null) {
      return sendError(res, "full_name, phone, password, and role_id are required", 400);
    }
    const normalizedPhone = normalizeEthiopianPhone(phone);
    if (!normalizedPhone) {
      return sendError(res, ETHIOPIAN_PHONE_ERROR, 400);
    }
    const existing = await findUserByPhoneVariants(normalizedPhone);
    if (existing) {
      return sendError(res, "A user with this phone number already exists", 409);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await createUserAsync(
      full_name,
      normalizedPhone,
      email,
      passwordHash,
      Number(role_id),
      status ?? "active"
    );
    void logAutoReportTask({
      type: "user_created",
      summary: `Admin created user #${result.insertId}: ${full_name} (${normalizedPhone})`,
      date_range: `user_id:${result.insertId}`,
    });
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
    return sendSuccess(res, rows.map(stripUserSecrets));
  } catch (err) {
    return sendError(res, "Failed to list users", 500, err);
  }
};

/** Ticket forms: only passenger-role accounts (not admin/driver). */
export const listPassengers = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const rows = await getPassengerUsersAsync();
    return sendSuccess(res, rows.map(stripUserSecrets));
  } catch (err) {
    return sendError(res, "Failed to list passengers", 500, err);
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
    return sendSuccess(res, stripUserSecrets(rows[0]));
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
    const normalizedPhone = normalizeEthiopianPhone(phone);
    if (!normalizedPhone) {
      return sendError(res, ETHIOPIAN_PHONE_ERROR, 400);
    }
    const phoneOwner = await findUserByPhoneVariants(normalizedPhone, id);
    if (phoneOwner) {
      return sendError(res, "A user with this phone number already exists", 409);
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
        [full_name, normalizedPhone, email, finalRoleId, finalStatus, passwordHash, id]
      );
    } else {
      await updateUserAsync(id, full_name, normalizedPhone, email, finalRoleId, finalStatus);
    }
    return sendSuccess(res, { message: "User updated" });
  } catch (err) {
    return sendError(res, "Failed to update user", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const isSelf = id === Number(req.user.id);
    if (!isAdmin(req.roleName) && !isSelf) {
      return sendError(res, "Forbidden", 403);
    }
    await deleteUserAsync(req.params.id);
    return sendSuccess(res, { message: "User deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete user", 500, err);
  }
};
