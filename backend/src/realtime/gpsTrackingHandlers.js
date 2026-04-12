import { isAdmin, isDriver, isPassenger } from "../constants/roles.js";
import { queryAsync } from "../config/db.js";
import {
  getDriverLocation,
  listActiveDriverLocations,
  removeDriverLocation,
  upsertDriverLocation,
} from "../utils/driverLocationStore.js";

function validLatLng(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function safeAck(ack, body) {
  if (typeof ack === "function") ack(body);
}

function publicGpsPayloadFromRow(row, driverId) {
  if (!row) return null;
  return {
    driverId,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy ?? null,
    heading: row.heading ?? null,
    speed: row.speed ?? null,
    full_name: row.full_name ?? null,
    recordedAt: row.recordedAt ?? Date.now(),
  };
}

async function passengerOwnsActiveCargoOnDriverTrip(ownerId, driverId) {
  const oid = Number(ownerId);
  const did = Number(driverId);
  if (!Number.isInteger(oid) || oid <= 0 || !Number.isInteger(did) || did <= 0) {
    return false;
  }
  const rows = await queryAsync(
    `SELECT 1 AS ok
     FROM cargo c
     INNER JOIN trips t ON t.id = c.trip_id
     WHERE c.owner_id = ?
       AND t.driver_id = ?
       AND LOWER(TRIM(COALESCE(c.status, ''))) NOT IN ('cancelled', 'pending')
     LIMIT 1`,
    [oid, did]
  );
  return Boolean(rows?.length);
}

/**
 * @param {import("socket.io").Socket} socket
 * @param {{
 *   emitToRole: (role: string, event: string, payload: object) => void,
 *   emitToGpsWatchers: (driverUserId: number, event: string, payload: object) => void,
 * }} deps
 */
export function attachGpsTrackingHandlers(socket, { emitToRole, emitToGpsWatchers }) {
  socket.on("gps:driver_update", async (payload, ack) => {
    if (!isDriver(socket.data.user?.role_name)) {
      return safeAck(ack, { ok: false, message: "Only drivers can share GPS." });
    }

    const lat = Number(payload?.lat);
    const lng = Number(payload?.lng);
    if (!validLatLng(lat, lng)) {
      return safeAck(ack, { ok: false, message: "Invalid coordinates." });
    }

    const uid = Number(socket.data.user.id);
    if (!Number.isInteger(uid) || uid <= 0) {
      return safeAck(ack, { ok: false, message: "Invalid user." });
    }

    let full_name = null;
    let phone = null;
    try {
      const rows = await queryAsync(
        "SELECT full_name, phone FROM users WHERE id = ? LIMIT 1",
        [uid]
      );
      full_name = rows[0]?.full_name ?? null;
      phone = rows[0]?.phone ?? null;
    } catch (e) {
      console.error("gps:driver_update user lookup:", e);
    }

    const row = {
      lat,
      lng,
      accuracy:
        payload?.accuracy != null && Number.isFinite(Number(payload.accuracy))
          ? Number(payload.accuracy)
          : null,
      heading:
        payload?.heading != null && Number.isFinite(Number(payload.heading))
          ? Number(payload.heading)
          : null,
      speed:
        payload?.speed != null && Number.isFinite(Number(payload.speed))
          ? Number(payload.speed)
          : null,
      full_name,
      phone,
    };

    upsertDriverLocation(uid, row);

    const recordedAt = Date.now();
    const adminPayload = {
      driverId: uid,
      lat,
      lng,
      accuracy: row.accuracy,
      heading: row.heading,
      speed: row.speed,
      full_name,
      phone,
      recordedAt,
    };
    const passengerPayload = publicGpsPayloadFromRow(
      { ...row, recordedAt },
      uid
    );

    emitToRole("admin", "gps:driver_location", adminPayload);
    emitToGpsWatchers(uid, "gps:driver_location", passengerPayload);

    safeAck(ack, { ok: true });
  });

  socket.on("gps:driver_stop", (_payload, ack) => {
    if (!isDriver(socket.data.user?.role_name)) {
      return safeAck(ack, { ok: false, message: "Only drivers can stop sharing." });
    }
    const uid = Number(socket.data.user.id);
    removeDriverLocation(uid);
    const stopPayload = { driverId: uid, recordedAt: Date.now() };
    emitToRole("admin", "gps:driver_stopped", stopPayload);
    emitToGpsWatchers(uid, "gps:driver_stopped", stopPayload);
    safeAck(ack, { ok: true });
  });

  socket.on("gps:snapshot", (_payload, ack) => {
    if (typeof ack !== "function") return;
    if (!isAdmin(socket.data.user?.role_name)) {
      ack({ ok: false, message: "Admin only." });
      return;
    }
    const drivers = listActiveDriverLocations();
    ack({ ok: true, drivers });
  });

  socket.on("gps:passenger_subscribe", async (payload, ack) => {
    if (!isPassenger(socket.data.user?.role_name)) {
      return safeAck(ack, { ok: false, message: "Passengers only." });
    }
    const driverId = Number(payload?.driverId);
    if (!Number.isInteger(driverId) || driverId <= 0) {
      return safeAck(ack, { ok: false, message: "Invalid driver." });
    }
    const ownerId = Number(socket.data.user.id);
    try {
      const ok = await passengerOwnsActiveCargoOnDriverTrip(ownerId, driverId);
      if (!ok) {
        return safeAck(ack, {
          ok: false,
          message: "No active shipment on this driver for your account.",
        });
      }
    } catch (e) {
      console.error("gps:passenger_subscribe:", e);
      return safeAck(ack, { ok: false, message: "Could not verify access." });
    }
    socket.join(`gps:driver:${driverId}`);
    safeAck(ack, { ok: true });
  });

  socket.on("gps:passenger_unsubscribe", (payload, ack) => {
    if (!isPassenger(socket.data.user?.role_name)) {
      return safeAck(ack, { ok: false, message: "Passengers only." });
    }
    const driverId = Number(payload?.driverId);
    if (!Number.isInteger(driverId) || driverId <= 0) {
      return safeAck(ack, { ok: false, message: "Invalid driver." });
    }
    socket.leave(`gps:driver:${driverId}`);
    safeAck(ack, { ok: true });
  });

  socket.on("gps:passenger_snapshot", async (payload, ack) => {
    if (typeof ack !== "function") return;
    if (!isPassenger(socket.data.user?.role_name)) {
      ack({ ok: false, message: "Passengers only." });
      return;
    }
    const driverId = Number(payload?.driverId);
    if (!Number.isInteger(driverId) || driverId <= 0) {
      ack({ ok: false, message: "Invalid driver." });
      return;
    }
    const ownerId = Number(socket.data.user.id);
    try {
      const ok = await passengerOwnsActiveCargoOnDriverTrip(ownerId, driverId);
      if (!ok) {
        ack({ ok: false, message: "No active shipment on this driver for your account." });
        return;
      }
    } catch (e) {
      console.error("gps:passenger_snapshot:", e);
      ack({ ok: false, message: "Could not verify access." });
      return;
    }
    const row = getDriverLocation(driverId);
    ack({
      ok: true,
      location: publicGpsPayloadFromRow(row, driverId),
    });
  });
}
