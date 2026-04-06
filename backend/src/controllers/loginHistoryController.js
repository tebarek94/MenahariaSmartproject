import * as loginHistoryModel from "../models/loginHistoryModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

export const create = async (req, res) => {
  try {
    const { user_id, device_info, ip_address } = req.body;
    const result = await loginHistoryModel.createLoginHistory(
      user_id ?? null,
      device_info,
      ip_address
    );
    return sendSuccess(
      res,
      { message: "Login history recorded", id: result.insertId },
      201
    );
  } catch (err) {
    return sendError(res, "Failed to create login history", 500, err);
  }
};

export const getAll = async (req, res) => {
  try {
    const rows = await loginHistoryModel.getAllLoginHistory();
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list login history", 500, err);
  }
};

export const getById = async (req, res) => {
  try {
    const rows = await loginHistoryModel.getLoginHistoryById(req.params.id);
    if (!rows.length) return sendError(res, "Record not found", 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    return sendError(res, "Failed to get login history", 500, err);
  }
};

export const getByUserId = async (req, res) => {
  try {
    const rows = await loginHistoryModel.getLoginHistoryByUserId(req.params.userId);
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to list user login history", 500, err);
  }
};

export const update = async (req, res) => {
  try {
    const { user_id, device_info, ip_address } = req.body;
    await loginHistoryModel.updateLoginHistory(
      req.params.id,
      user_id ?? null,
      device_info,
      ip_address
    );
    return sendSuccess(res, { message: "Login history updated" });
  } catch (err) {
    return sendError(res, "Failed to update login history", 500, err);
  }
};

export const remove = async (req, res) => {
  try {
    await loginHistoryModel.deleteLoginHistory(req.params.id);
    return sendSuccess(res, { message: "Login history deleted" });
  } catch (err) {
    return sendError(res, "Failed to delete login history", 500, err);
  }
};
