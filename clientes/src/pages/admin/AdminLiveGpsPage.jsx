import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { getBoundRealtimeSocket } from "@/services/realtimeSocket.js";
import { Card } from "@/ui/Card.jsx";
import { GpsLiveMap } from "@/components/maps/GpsLiveMap.jsx";

function colorForDriverId(id) {
  const palette = [
    "#22c55e",
    "#38bdf8",
    "#f59e0b",
    "#a78bfa",
    "#f472b6",
    "#2dd4bf",
    "#fb7185",
    "#4ade80",
  ];
  const n = Math.abs(Number(id)) || 0;
  return palette[n % palette.length];
}

function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

export function AdminLiveGpsPage() {
  const auth = useAuth();
  const [drivers, setDrivers] = useState({});
  const [hint, setHint] = useState("Waiting for live connection…");

  const applySnapshot = useCallback((list) => {
    const next = {};
    if (Array.isArray(list)) {
      for (const d of list) {
        const id = d.driverId ?? d.id;
        if (id == null) continue;
        next[id] = { ...d, driverId: id };
      }
    }
    setDrivers(next);
  }, []);

  useEffect(() => {
    if (!auth.isAdmin) return undefined;

    let cancelled = false;
    let cleanup = null;
    let attempts = 0;
    const poll = setInterval(() => {
      if (cancelled) return;
      attempts += 1;
      if (attempts > 120) {
        clearInterval(poll);
        setHint("Could not open live connection. Check network and refresh the page.");
        return;
      }
      const s = getBoundRealtimeSocket();
      if (!s?.connected) return;

      clearInterval(poll);

      const onLoc = (p) => {
        const id = p.driverId;
        if (id == null) return;
        setDrivers((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            ...p,
            driverId: id,
            recordedAt: p.recordedAt ?? Date.now(),
          },
        }));
      };

      const onStop = ({ driverId }) => {
        if (driverId == null) return;
        setDrivers((prev) => {
          const n = { ...prev };
          delete n[driverId];
          return n;
        });
      };

      s.emit("gps:snapshot", (res) => {
        if (cancelled || !res?.ok) return;
        applySnapshot(res.drivers);
      });

      s.on("gps:driver_location", onLoc);
      s.on("gps:driver_stopped", onStop);
      setHint("");

      cleanup = () => {
        s.off("gps:driver_location", onLoc);
        s.off("gps:driver_stopped", onStop);
      };
    }, 150);

    return () => {
      cancelled = true;
      clearInterval(poll);
      cleanup?.();
    };
  }, [auth.isAdmin, applySnapshot]);

  const markers = useMemo(() => {
    return Object.values(drivers).map((d) => ({
      id: d.driverId,
      lat: d.lat,
      lng: d.lng,
      color: colorForDriverId(d.driverId),
      title: d.full_name || `Driver #${d.driverId}`,
      subtitle: `${d.phone || "—"} · updated ${formatTime(d.recordedAt)}`,
    }));
  }, [drivers]);

  const driverList = useMemo(() => Object.values(drivers), [drivers]);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Live driver GPS</h1>
        <p className="mt-1 max-w-3xl text-sm text-primary-400/85 sm:text-base">
          Positions update in real time over Socket.IO when drivers turn on sharing. Map tiles
          are from{" "}
          <a
            className="text-emerald-400 underline decoration-emerald-600/50 underline-offset-2 hover:text-emerald-300"
            href="https://www.openstreetmap.org/"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>{" "}
          (free, no API key).
        </p>
        {hint ? (
          <p className="mt-2 text-xs text-amber-400/95" role="status">
            {hint}
          </p>
        ) : null}
      </div>

      <GpsLiveMap markers={markers} />

      <Card title="Drivers currently sharing" subtitle="Last position per driver (in-memory; resets if the API restarts)">
        {driverList.length === 0 ? (
          <p className="text-sm text-slate-500">
            No active locations. Ask a driver to open{" "}
            <strong className="text-slate-400">Driver → Share location</strong> and allow browser
            location access.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {driverList.map((d) => (
              <li
                key={d.driverId}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {d.full_name || `Driver #${d.driverId}`}
                  </p>
                  <p className="text-xs text-slate-500">{d.phone || "—"}</p>
                </div>
                <div className="text-xs text-slate-400 sm:text-right">
                  <p>
                    {Number(d.lat).toFixed(5)}, {Number(d.lng).toFixed(5)}
                  </p>
                  <p>{formatTime(d.recordedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
