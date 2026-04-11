import * as notificationModel from "../models/notificationModel.js";
import { emitToUser } from "../realtime/socketServer.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isDriver, isPassenger } from "../constants/roles.js";

function canReadNotification(req, row) {
  if (isAdmin(req.roleName)) return true;
  if (row.user_id == null) return true;
  return Number(row.user_id) === Number(req.user.id);
}

export const create = async (req, res) => {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const { user_id, message, channel, status } = req.body;
    if (!message) return sendError(res, "message is required", 400);
    const result = await notificationModel.createNotification(
      user_id != null ? Number(user_id) : null,
      message,
      channel,
      status
    );
    const nid = result?.insertId;
    const uid = user_id != null ? Number(user_id) : null;
    if (nid && uid != null && Number.isInteger(uid) && uid > 0) {
      emitToUser(uid, "notification:new", {
        id: nid,
        user_id: uid,
        message,
        channel: channel ?? "sms",
        status: status ?? "pending",
      });
    }
    return sendSuccess(
      res,
      { message: "Notification created", id: nid },
      201
    );
  } catch (err) {
    return sendError(res, "Failed to create notification", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    if (isAdmin(req.roleName)) {
      const rows = await notificationModel.getAllNotifications();
      return sendSuccess(res, rows);
    }
    if (isPassenger(req.roleName) || isDriver(req.roleName)) {
      const rows = await notificationModel.getNotificationsForUserId(
        req.user.id
      );
      return sendSuccess(res, rows);
    }
    return sendError(res, "Forbidden", 403);
  } catch (err) {
    return sendError(res, "Failed to list notifications", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await notificationModel.getNotificationById(req.params.id);
    if (!rows.length) return sendError(res, "Notification not found", 404);
    if (!canReadNotification(req, rows[0])) {
      return sendError(res, "Forbidden", 403);
    }
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get notification", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const rows = await notificationModel.getNotificationById(req.params.id);
    if (!rows.length) return sendError(res, "Notification not found", 404);
    if (!isAdmin(req.roleName)) {
      if (
        rows[0].user_id == null ||
        Number(rows[0].user_id) !== Number(req.user.id)
      ) {
        return sendError(res, "Forbidden", 403);
      }
    }
    const { user_id, message, channel, status } = req.body;
    if (!message || !channel || !status) {
      return sendError(res, "message, channel, and status are required", 400);
    }
    let uid = user_id != null ? Number(user_id) : null;
    if (!isAdmin(req.roleName)) {
      uid = req.user.id;
    }
    await notificationModel.updateNotification(
      req.params.id,
      uid,
      message,
      channel,
      status
    );
    return sendSuccess(res, { message: "Notification updated" });
  } catch (err) {
    return sendError(res, "Failed to update notification", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    const rows = await notificationModel.getNotificationById(req.params.id);
    if (!rows.length) return sendError(res, "Notification not found", 404);
    if (!isAdmin(req.roleName)) {
      if (
        rows[0].user_id == null ||
        Number(rows[0].user_id) !== Number(req.user.id)
      ) {
        return sendError(res, "Forbidden", 403);
      }
    }
    await notificationModel.deleteNotification(req.params.id);
    return sendSuccess(res, { message: "Notification deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete notification", 500, err);
  }
};
