import * as supportChatModel from "../models/supportChatModel.js";
import { getUserWithRoleById } from "../models/userModel.js";
import { isAdmin, isPassenger } from "../constants/roles.js";

const MAX_LEN = 2000;

function rowPayload(row) {
  if (!row) return null;
  return {
    id: row.id,
    passenger_user_id: row.passenger_user_id,
    from_user_id: row.from_user_id,
    body: row.body,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  };
}

/**
 * @param {import("socket.io").Socket} socket
 * @param {{ emitToRole: Function, emitToUser: Function }} emitters
 */
export function attachSupportChatHandlers(socket, { emitToRole, emitToUser }) {
  const roleName = socket.data.user?.role_name;

  socket.on("support:send", async (payload, ack) => {
    const reply =
      typeof ack === "function"
        ? (ok, data) => ack({ ok, ...data })
        : () => {};

    if (!isPassenger(roleName)) {
      return reply(false, { message: "Only passengers can start thread messages" });
    }

    const text = String(payload?.text ?? "").trim();
    if (!text) {
      return reply(false, { message: "Message is required" });
    }
    if (text.length > MAX_LEN) {
      return reply(false, { message: `Message too long (max ${MAX_LEN} characters)` });
    }

    const passengerUserId = Number(socket.data.user.id);
    if (!Number.isInteger(passengerUserId) || passengerUserId <= 0) {
      return reply(false, { message: "Invalid user" });
    }

    try {
      const result = await supportChatModel.insertMessage(
        passengerUserId,
        passengerUserId,
        text
      );
      const insertId = result?.insertId;
      const inserted = await supportChatModel.getMessageById(insertId);
      const out = rowPayload(inserted[0]) ?? {
        id: insertId,
        passenger_user_id: passengerUserId,
        from_user_id: passengerUserId,
        body: text,
        created_at: new Date().toISOString(),
      };

      emitToRole("admin", "support:thread_message", out);
      socket.emit("support:thread_message", out);
      reply(true, { message: out });
    } catch (e) {
      console.error("support:send", e);
      reply(false, { message: "Failed to send message" });
    }
  });

  socket.on("support:reply", async (payload, ack) => {
    const reply =
      typeof ack === "function"
        ? (ok, data) => ack({ ok, ...data })
        : () => {};

    if (!isAdmin(roleName)) {
      return reply(false, { message: "Only admins can reply" });
    }

    const passengerUserId = Number(payload?.passengerUserId);
    if (!Number.isInteger(passengerUserId) || passengerUserId <= 0) {
      return reply(false, { message: "Invalid passenger" });
    }

    const users = await getUserWithRoleById(passengerUserId);
    if (!users.length || !isPassenger(users[0].role_name)) {
      return reply(false, { message: "Passenger not found" });
    }

    const text = String(payload?.text ?? "").trim();
    if (!text) {
      return reply(false, { message: "Message is required" });
    }
    if (text.length > MAX_LEN) {
      return reply(false, { message: `Message too long (max ${MAX_LEN} characters)` });
    }

    const adminId = Number(socket.data.user.id);
    try {
      const result = await supportChatModel.insertMessage(
        passengerUserId,
        adminId,
        text
      );
      const insertId = result?.insertId;
      const inserted = await supportChatModel.getMessageById(insertId);
      const out = rowPayload(inserted[0]) ?? {
        id: insertId,
        passenger_user_id: passengerUserId,
        from_user_id: adminId,
        body: text,
        created_at: new Date().toISOString(),
      };

      emitToUser(passengerUserId, "support:thread_message", out);
      emitToRole("admin", "support:thread_message", out);
      reply(true, { message: out });
    } catch (e) {
      console.error("support:reply", e);
      reply(false, { message: "Failed to send reply" });
    }
  });
}
