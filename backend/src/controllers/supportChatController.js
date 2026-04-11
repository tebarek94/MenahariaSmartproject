import * as supportChatModel from "../models/supportChatModel.js";
import * as userModel from "../models/userModel.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { isAdmin, isPassenger } from "../constants/roles.js";

export async function myMessages(req, res) {
  try {
    if (!isPassenger(req.roleName)) {
      return sendError(res, "Passenger access required", 403);
    }
    const uid = Number(req.user.id);
    const rows = await supportChatModel.listMessagesForPassengerThread(uid);
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to load messages", 500, err);
  }
}

export async function listThreads(req, res) {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const summaries = await supportChatModel.listThreadSummariesForAdmin();
    const withNames = await Promise.all(
      (summaries || []).map(async (row) => {
        const users = await userModel.getUserWithRoleById(
          Number(row.passenger_user_id)
        );
        const u = users[0];
        return {
          ...row,
          passenger_name: u?.full_name ?? null,
          passenger_phone: u?.phone ?? null,
        };
      })
    );
    return sendSuccess(res, withNames);
  } catch (err) {
    return sendError(res, "Failed to load threads", 500, err);
  }
}

export async function threadMessages(req, res) {
  try {
    if (!isAdmin(req.roleName)) {
      return sendError(res, "Admin access required", 403);
    }
    const passengerUserId = Number(req.params.passengerUserId);
    const users = await userModel.getUserWithRoleById(passengerUserId);
    if (!users.length || !isPassenger(users[0].role_name)) {
      return sendError(res, "Passenger thread not found", 404);
    }
    const rows = await supportChatModel.listMessagesForAdminThread(
      passengerUserId
    );
    return sendSuccess(res, rows);
  } catch (err) {
    return sendError(res, "Failed to load thread", 500, err);
  }
}
