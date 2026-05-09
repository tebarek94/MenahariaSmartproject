import { useMemo } from "react";
import { GpsLiveMap } from "@/components/maps/GpsLiveMap.jsx";
import { Card } from "@/ui/Card.jsx";
import { usePassengerCargoGps } from "@/hooks/usePassengerCargoGps.js";
import { trackableDriverIdsFromCargo } from "@/utils/passengerCargoGps.js";
import { formatDate } from "@/utils/format.js";

/**
 * Live map for passengers: drivers assigned to paid, non-pending cargo (OpenStreetMap + Socket.IO).
 */
export function PassengerCargoGpsMap({ cargo, title, subtitle }) {
  const driverIds = useMemo(() => trackableDriverIdsFromCargo(cargo), [cargo]);
  const positions = usePassengerCargoGps(driverIds);

  const markers = useMemo(() => {
    return Object.values(positions)
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({
        id: p.driverId,
        lat: p.lat,
        lng: p.lng,
        color: "#38bdf8",
        title: p.full_name || "Your driver",
        subtitle: `Updated ${formatDate(p.recordedAt)}`,
      }));
  }, [positions]);

  if (!driverIds.length) return null;

  return (
    <Card
      className="!p-4 sm:!p-6"
      title={title ?? "Live cargo location"}
      subtitle={
        subtitle ??
        "Free OpenStreetMap tiles. Positions appear when your driver shares location with operations."
      }
    >
      {markers.length === 0 ? (
        <p className="text-p-muted mb-3 text-sm">
          Waiting for GPS. Your driver must open{" "}
          <strong className="text-slate-400">Share location</strong> on their account while your
          shipment is active.
        </p>
      ) : null}
      <GpsLiveMap markers={markers} />
    </Card>
  );
}
