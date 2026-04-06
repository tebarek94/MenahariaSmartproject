import { queryAsync } from "../config/db.js";

export const createNotification = (userId, message, channel, status) =>
  queryAsync(
    "INSERT INTO notifications (user_id, message, channel, status) VALUES (?, ?, ?, ?)",
    [userId ?? null, message, channel ?? "sms", status ?? "pending"]
  );

export const getAllNotifications = () =>
  queryAsync("SELECT * FROM notifications ORDER BY created_at DESC");

export const getNotificationById = (id) =>
  queryAsync("SELECT * FROM notifications WHERE id = ?", [id]);

export const updateNotification = (id, userId, message, channel, status) =>
  queryAsync(
    "UPDATE notifications SET user_id = ?, message = ?, channel = ?, status = ? WHERE id = ?",
    [userId ?? null, message, channel, status, id]
  );

export const deleteNotification = (id) =>
  queryAsync("DELETE FROM notifications WHERE id = ?", [id]);

export const getNotificationsForUserId = (userId) =>
  queryAsync(
    `SELECT * FROM notifications
     WHERE user_id IS NULL OR user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
