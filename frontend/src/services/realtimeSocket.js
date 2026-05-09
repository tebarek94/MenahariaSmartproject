import { io } from "socket.io-client";
import {
  API_BASE,
  REALTIME_REFUND_REQUEST_NEW,
  REALTIME_REFUND_REQUEST_UPDATED,
  REALTIME_SUPPORT_THREAD_MESSAGE,
} from "@/utils/constants.js";
const envSocketBase = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, "") ?? "";

export const SOCKET_EVENTS = {
  CONNECTION_ACCEPTED: "connection:accepted",
  NOTIFICATION_NEW: "notification:new",
  SUPPORT_THREAD_MESSAGE: REALTIME_SUPPORT_THREAD_MESSAGE,
  REFUND_REQUEST_NEW: REALTIME_REFUND_REQUEST_NEW,
  REFUND_REQUEST_UPDATED: REALTIME_REFUND_REQUEST_UPDATED,
};

/** Bound while Socket.IO is connected (see `RealtimeBridge`). */
let boundSocket = null;

export function setBoundRealtimeSocket(socket) {
  boundSocket = socket;
}

export function getBoundRealtimeSocket() {
  return boundSocket;
}

function socketUrl() {
  if (envSocketBase) return envSocketBase;
  const base = String(API_BASE ?? "").replace(/\/$/, "");
  if (base) return base;
  // Avoid Vite WS proxy noise in dev by connecting directly to backend Socket.IO.
  if (import.meta.env.DEV) return "http://127.0.0.1:5000";
  return undefined;
}

/** Socket.IO client; call `.connect()` after wiring handlers. */
export function createAuthenticatedSocket(token) {
  return io(socketUrl(), {
    auth: { token },
    autoConnect: false,
    transports: ["websocket", "polling"],
  });
}
