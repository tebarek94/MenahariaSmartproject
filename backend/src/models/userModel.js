import db, { queryAsync } from "../config/db.js";

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
