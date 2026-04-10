import db, { queryAsync } from "../config/db.js";
import { PASSENGER_ROLE_NAMES } from "../constants/roles.js";

// CREATE USER
export const createUser = (data, callback) => {
  const sql = `
    INSERT INTO users (full_name, phone, email, password_hash, role_id)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(sql, data, callback);
};

// FIND BY PHONE (LOGIN)
export const findByPhone = (phone, callback) => {
  const sql = "SELECT * FROM users WHERE phone = ?";
  db.query(sql, [phone], callback);
};

// FIND BY ID
export const findById = (id, callback) => {
  const sql = "SELECT * FROM users WHERE id = ?";
  db.query(sql, [id], callback);
};

// GET ALL USERS
export const getAllUsers = (callback) => {
  const sql = "SELECT * FROM users";
  db.query(sql, callback);
};

// UPDATE USER
export const updateUser = (id, data, callback) => {
  const sql = `
    UPDATE users 
    SET full_name=?, phone=?, email=?, role_id=?, status=? 
    WHERE id=?
  `;
  db.query(sql, [...data, id], callback);
};

// DELETE USER
export const deleteUser = (id, callback) => {
  const sql = "DELETE FROM users WHERE id=?";
  db.query(sql, [id], callback);
};

export const createUserAsync = (
  fullName,
  phone,
  email,
  passwordHash,
  roleId,
  status = "active"
) =>
  queryAsync(
    `INSERT INTO users (full_name, phone, email, password_hash, role_id, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fullName, phone, email ?? null, passwordHash, roleId, status]
  );

export const getAllUsersAsync = () => queryAsync("SELECT * FROM users ORDER BY id");

/** Active users whose role is a passenger-type role (excludes admin/driver). */
export const getPassengerUsersAsync = () => {
  const placeholders = PASSENGER_ROLE_NAMES.map(() => "?").join(", ");
  return queryAsync(
    `SELECT u.*, r.name AS role_name
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE LOWER(TRIM(r.name)) IN (${placeholders})
       AND (u.status IS NULL OR LOWER(TRIM(u.status)) <> 'inactive')
     ORDER BY u.id`,
    PASSENGER_ROLE_NAMES
  );
};

export const getUserWithRoleById = (id) =>
  queryAsync(
    `SELECT u.*, r.name AS role_name
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [id]
  );

export const getUserByIdAsync = (id) =>
  queryAsync("SELECT * FROM users WHERE id = ?", [id]);

export const updateUserAsync = (
  id,
  fullName,
  phone,
  email,
  roleId,
  status
) =>
  queryAsync(
    `UPDATE users SET full_name = ?, phone = ?, email = ?, role_id = ?, status = ? WHERE id = ?`,
    [fullName, phone, email ?? null, roleId, status, id]
  );

export const deleteUserAsync = (id) =>
  queryAsync("DELETE FROM users WHERE id = ?", [id]);

const userModel = {
  createUser,
  findByPhone,
  findById,
  getAllUsers,
  updateUser,
  deleteUser,
};

export default userModel;
