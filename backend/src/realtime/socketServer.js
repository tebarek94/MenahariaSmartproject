import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwtVerify.js";
import { attachSupportChatHandlers } from "./supportChatHandlers.js";

/** @type {import("socket.io").Server | null} */
let io = null;

function normalizeRoleName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Attach Socket.IO to the HTTP server. Connections are **accepted** only after a valid JWT
 * (same secret as REST). Clients must pass `auth: { token }` (preferred) or `query.token`.
 */
export function initSocketServer(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: corsOrigins?.length ? corsOrigins : true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const raw =
      socket.handshake.auth?.token ??
      socket.handshake.query?.token ??
      null;
    const token = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;

    const result = verifyAccessToken(token);
    if (!result.ok) {
      if (result.reason === "no_secret") {
        return next(new Error("Server misconfiguration"));
      }
      return next(new Error("Unauthorized"));
    }

    const p = result.payload;
    socket.data.user = {
      id: p.id,
      role_id: p.role_id,
      role_name: p.role_name,
    };
    next();
  });

  io.on("connection", (socket) => {
    const u = socket.data.user;
    const uid = Number(u.id);
    if (Number.isInteger(uid) && uid > 0) {
      socket.join(`user:${uid}`);
    }
    const role = normalizeRoleName(u.role_name);
    if (role) {
      socket.join(`role:${role}`);
    }

    socket.emit("connection:accepted", {
      userId: u.id,
      role_name: u.role_name ?? null,
    });

    attachSupportChatHandlers(socket, {
      emitToRole,
      emitToUser,
    });
  });

  return io;
}

export function getSocketServer() {
  return io;
}

export function emitToUser(userId, event, payload) {
  const srv = io;
  if (!srv || userId == null) return;
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return;
  srv.to(`user:${id}`).emit(event, payload);
}

export function emitToRole(roleName, event, payload) {
  const srv = io;
  if (!srv) return;
  const role = normalizeRoleName(roleName);
  if (!role) return;
  srv.to(`role:${role}`).emit(event, payload);
}
