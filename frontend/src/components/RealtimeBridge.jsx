import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import {
  REALTIME_DISPATCH_EVENT,
  REALTIME_NOTIFICATION_NEW,
  REALTIME_REFUND_REQUEST_NEW,
  REALTIME_REFUND_REQUEST_UPDATED,
  REALTIME_SUPPORT_THREAD_MESSAGE,
} from "@/utils/constants.js";
import {
  createAuthenticatedSocket,
  SOCKET_EVENTS,
  setBoundRealtimeSocket,
} from "@/services/realtimeSocket.js";

/**
 * Keeps one Socket.IO connection while the user is logged in.
 * The server **accepts** the connection only if `auth.token` is a valid JWT.
 * Incoming events are re-dispatched on `window` for any page to listen to.
 */
export function RealtimeBridge() {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setBoundRealtimeSocket(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.removeAllListeners();
        socketRef.current = null;
      }
      return undefined;
    }

    const socket = createAuthenticatedSocket(token);
    socketRef.current = socket;

    const dispatch = (type, payload) => {
      window.dispatchEvent(
        new CustomEvent(REALTIME_DISPATCH_EVENT, {
          detail: { type, payload },
        })
      );
    };

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (payload) => {
      dispatch(REALTIME_NOTIFICATION_NEW, payload);
    });

    socket.on(SOCKET_EVENTS.SUPPORT_THREAD_MESSAGE, (payload) => {
      dispatch(REALTIME_SUPPORT_THREAD_MESSAGE, payload);
    });

    socket.on(SOCKET_EVENTS.REFUND_REQUEST_NEW, (payload) => {
      dispatch(REALTIME_REFUND_REQUEST_NEW, payload);
    });

    socket.on(SOCKET_EVENTS.REFUND_REQUEST_UPDATED, (payload) => {
      dispatch(REALTIME_REFUND_REQUEST_UPDATED, payload);
    });

    const bindIfConnected = () => {
      if (socket.connected) setBoundRealtimeSocket(socket);
    };

    const onDisconnect = () => setBoundRealtimeSocket(null);

    socket.on("connect", bindIfConnected);
    socket.on("reconnect", bindIfConnected);
    socket.on("disconnect", onDisconnect);

    socket.connect();
    bindIfConnected();

    return () => {
      setBoundRealtimeSocket(null);
      socket.off("connect", bindIfConnected);
      socket.off("reconnect", bindIfConnected);
      socket.off("disconnect", onDisconnect);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token]);

  return null;
}
