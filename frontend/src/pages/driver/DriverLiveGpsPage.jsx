import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { getBoundRealtimeSocket } from "@/services/realtimeSocket.js";
import { Button } from "@/ui/Button.jsx";
import { Card } from "@/ui/Card.jsx";
import { GpsLiveMap } from "@/components/maps/GpsLiveMap.jsx";

const EMIT_INTERVAL_MS = 4000;

export function DriverLiveGpsPage() {
  const auth = useAuth();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [position, setPosition] = useState(null);
  const watchIdRef = useRef(null);
  const lastEmitRef = useRef(0);
  const lastPayloadRef = useRef(null);
  const latestCoordsRef = useRef(null);
  const wasSocketReadyRef = useRef(false);

  useEffect(() => {
    const tick = () => setSocketReady(Boolean(getBoundRealtimeSocket()?.connected));
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [auth.token]);

  const sendLocation = useCallback((coords, { force = false } = {}) => {
    const s = getBoundRealtimeSocket();
    if (!s?.connected) {
      setHint("Connecting to server…");
      return;
    }
    setHint("");
    const now = Date.now();
    if (!force && now - lastEmitRef.current < EMIT_INTERVAL_MS) return;
    lastEmitRef.current = now;

    const payload = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      heading: coords.heading,
      speed: coords.speed,
    };

    const same =
      lastPayloadRef.current &&
      lastPayloadRef.current.lat === payload.lat &&
      lastPayloadRef.current.lng === payload.lng;
    if (!force && same) return;
    lastPayloadRef.current = payload;

    s.emit("gps:driver_update", payload, (res) => {
      if (res && !res.ok) {
        setError(res.message || "Server rejected location update.");
      }
    });
  }, []);

  const stopSharing = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
    setPosition(null);
    lastPayloadRef.current = null;
    latestCoordsRef.current = null;
    const s = getBoundRealtimeSocket();
    if (s?.connected) {
      s.emit("gps:driver_stop", {}, () => {});
    }
  }, []);

  useEffect(() => {
    if (
      sharing &&
      socketReady &&
      !wasSocketReadyRef.current &&
      latestCoordsRef.current
    ) {
      // Re-broadcast last known location after reconnect so admin/passengers see the marker again.
      sendLocation(latestCoordsRef.current, { force: true });
    }
    wasSocketReadyRef.current = socketReady;
  }, [sharing, socketReady, sendLocation]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      const s = getBoundRealtimeSocket();
      if (s?.connected) {
        s.emit("gps:driver_stop", {}, () => {});
      }
    };
  }, []);

  function startSharing() {
    setError("");
    setHint("");
    if (!navigator.geolocation) {
      setError("This browser does not support location services.");
      return;
    }

    const s = getBoundRealtimeSocket();
    if (!s?.connected) {
      setError("Not connected to the server yet. Wait a moment and try again.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        latestCoordsRef.current = c;
        setPosition({ lat: c.latitude, lng: c.longitude, accuracy: c.accuracy });
        sendLocation(c);
      },
      (geoErr) => {
        setError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? "Location permission denied. Allow location in your browser settings."
            : geoErr.message || "Could not read GPS.",
        );
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    setSharing(true);
  }

  const markers =
    position && Number.isFinite(position.lat) && Number.isFinite(position.lng)
      ? [
          {
            id: "me",
            lat: position.lat,
            lng: position.lng,
            color: "#22c55e",
            title: "Your position",
            subtitle: auth.user?.full_name || auth.user?.phone || "Driver",
          },
        ]
      : [];

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* animate the text add animate color change     */}
      <div className="animate-pulse"> 
        <p className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl"><span className="animate-pulse">Live GPS</span></p>
      </div>

      <Card
        title="Controls"
        subtitle="Start only while you are on duty and allowed to broadcast location."
      >
        <div className="flex flex-wrap gap-3">
          {!sharing ? (
            <Button
              type="button"
              variant="primary"
              onClick={startSharing}
              disabled={!socketReady}
            >
              Start sharing location
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={stopSharing}>
              Stop sharing
            </Button>
          )}
        </div>
        {!socketReady && !sharing ? (
          <p className="mt-3 text-xs text-amber-400/95" role="status">
            Connecting to the server… you can start as soon as this message disappears.
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {hint ? (
          <p className="mt-2 text-xs text-amber-400/95" role="status">
            {hint}
          </p>
        ) : null}
        {sharing ? (
          <p className="mt-3 text-sm text-emerald-400/95" role="status">
            Sharing active — keep this tab open for best results.
          </p>
        ) : null}
      </Card>

      <GpsLiveMap markers={markers} />
    </div>
  );
}
