import { useEffect, useState } from "react";
import { getBoundRealtimeSocket } from "@/services/realtimeSocket.js";

function stableSortedIds(driverIds) {
  const uniq = [...new Set(driverIds.filter((n) => Number.isFinite(n) && n > 0))];
  uniq.sort((a, b) => a - b);
  return uniq;
}

/**
 * Subscribe to live driver positions for cargo tracking (passenger role, server validates ownership).
 * @param {number[]} driverIds
 */
export function usePassengerCargoGps(driverIds) {
  const [positions, setPositions] = useState({});
  const idsKey = stableSortedIds(driverIds).join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",").map(Number).filter((n) => n > 0) : [];
    if (!ids.length) {
      setPositions({});
      return undefined;
    }

    setPositions({});

    let cancelled = false;
    let socketCleanup = null;
    let attempts = 0;
    const poll = setInterval(() => {
      if (cancelled) return;
      attempts += 1;
      if (attempts > 120) {
        clearInterval(poll);
        return;
      }
      const socket = getBoundRealtimeSocket();
      if (!socket?.connected) return;
      clearInterval(poll);

      const onLoc = (p) => {
        const id = p?.driverId;
        if (id == null) return;
        setPositions((prev) => ({
          ...prev,
          [id]: { ...p, driverId: id },
        }));
      };
      const onStop = ({ driverId }) => {
        if (driverId == null) return;
        setPositions((prev) => {
          const n = { ...prev };
          delete n[driverId];
          return n;
        });
      };
      socket.on("gps:driver_location", onLoc);
      socket.on("gps:driver_stopped", onStop);

      for (const d of ids) {
        socket.emit("gps:passenger_subscribe", { driverId: d }, (res) => {
          if (cancelled || !res?.ok) return;
          socket.emit("gps:passenger_snapshot", { driverId: d }, (snap) => {
            if (cancelled || !snap?.ok || !snap.location) return;
            const loc = snap.location;
            const id = loc.driverId ?? d;
            setPositions((prev) => ({
              ...prev,
              [id]: { ...loc, driverId: id },
            }));
          });
        });
      }

      socketCleanup = () => {
        socket.off("gps:driver_location", onLoc);
        socket.off("gps:driver_stopped", onStop);
        for (const d of ids) {
          socket.emit("gps:passenger_unsubscribe", { driverId: d }, () => {});
        }
      };
    }, 150);

    return () => {
      cancelled = true;
      clearInterval(poll);
      socketCleanup?.();
    };
  }, [idsKey]);

  return positions;
}
