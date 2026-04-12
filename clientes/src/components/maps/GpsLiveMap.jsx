import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { cn } from "@/utils/cn.js";
import "leaflet/dist/leaflet.css";

/** Default: central Ethiopia (Addis Ababa area) when no markers */
const DEFAULT_CENTER = [9.03, 38.75];
const DEFAULT_ZOOM = 6;

function MapFitBounds({ points }) {
  const map = useMap();
  const key = useMemo(
    () => points.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join("|"),
    [points]
  );

  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, points, key]);

  return null;
}

/**
 * OpenStreetMap tiles (free, no API key). `markers`: { id, lat, lng, title, subtitle?, color? }[]
 */
export function GpsLiveMap({ markers, className }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const points = useMemo(
    () => markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)).map((m) => [m.lat, m.lng]),
    [markers]
  );

  const center = points.length ? points[0] : DEFAULT_CENTER;
  const zoom = points.length === 0 ? DEFAULT_ZOOM : points.length === 1 ? 13 : 10;

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex min-h-[min(55vh,520px)] w-full items-center justify-center rounded-xl bg-slate-800/80 text-sm text-slate-400",
          className
        )}
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className={cn("relative isolate z-0 overflow-hidden rounded-xl border border-white/10", className)}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-[min(55vh,520px)] w-full"
        scrollWheelZoom
        style={{ minHeight: 280 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 0 ? <MapFitBounds points={points} /> : null}
        {markers.map((m) => {
          if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return null;
          const fill = m.color || "#38bdf8";
          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={9}
              pathOptions={{
                color: fill,
                fillColor: fill,
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              {m.title || m.subtitle ? (
                <Popup>
                  {m.title ? <p className="m-0 font-semibold">{m.title}</p> : null}
                  {m.subtitle ? (
                    <p className="m-0 mt-1 text-xs text-slate-600">{m.subtitle}</p>
                  ) : null}
                </Popup>
              ) : null}
            </CircleMarker>
          );
        })}
      </MapContainer>
      <p className="pointer-events-none absolute bottom-1 left-1 right-1 z-[1000] text-center text-[10px] text-slate-500">
        Map data © OpenStreetMap contributors — free tiles, no API key required
      </p>
    </div>
  );
}
