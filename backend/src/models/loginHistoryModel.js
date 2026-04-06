import { queryAsync } from "../config/db.js";

export const createLoginHistory = (userId, deviceInfo, ipAddress) =>
  queryAsync(
    "INSERT INTO login_history (user_id, device_info, ip_address) VALUES (?, ?, ?)",
    [userId, deviceInfo ?? null, ipAddress ?? null]
  );

export const getAllLoginHistory = () =>
  queryAsync("SELECT * FROM login_history ORDER BY login_time DESC");

export const getLoginHistoryById = (id) =>
  queryAsync("SELECT * FROM login_history WHERE id = ?", [id]);

export const getLoginHistoryByUserId = (userId) =>
  queryAsync(
    "SELECT * FROM login_history WHERE user_id = ? ORDER BY login_time DESC",
    [userId]
  );

export const updateLoginHistory = (id, userId, deviceInfo, ipAddress) =>
  queryAsync(
    "UPDATE login_history SET user_id = ?, device_info = ?, ip_address = ? WHERE id = ?",
    [userId, deviceInfo ?? null, ipAddress ?? null, id]
  );

export const deleteLoginHistory = (id) =>
  queryAsync("DELETE FROM login_history WHERE id = ?", [id]);
