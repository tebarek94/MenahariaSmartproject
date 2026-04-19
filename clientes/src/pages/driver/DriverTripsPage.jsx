import { useCallback, useEffect, useMemo, useState } from "react";
import { tripsService } from "@/services/trips.service.js";
import { Card } from "@/ui/Card.jsx";
import { DataTable } from "@/ui/DataTable.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { Button } from "@/ui/Button.jsx";
import { formatDate } from "@/utils/format.js";

function formatRow(row) {
  const out = { ...row };
  if (out.departure_time != null) {
    out.departure_time = formatDate(out.departure_time);
  }
  if (out.arrival_time != null) {
    out.arrival_time = formatDate(out.arrival_time);
  }
  return out;
}

export function DriverTripsPage() {
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await tripsService.list();
      setRawRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load your trips");
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upcomingRaw = useMemo(() => {
    const now = Date.now();
    return rawRows.filter((r) => {
      if (r.departure_time == null || r.departure_time === "") return true;
      const d = new Date(r.departure_time);
      return !Number.isNaN(d.getTime()) && d.getTime() >= now;
    });
  }, [rawRows]);

  const rows = useMemo(() => rawRows.map(formatRow), [rawRows]);
  const upcoming = useMemo(() => upcomingRaw.map(formatRow), [upcomingRaw]);

  if (loading && !rawRows.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white sm:text-xl lg:text-2xl">
            This page shows all your trips.
          </h2>
         
        </div>
        <Button variant="ghost" className="shrink-0 self-start" onClick={() => load()}>
          Refresh
        </Button>
      </div>

      {error ? (
        <Card title="Error">
          <p className="text-sm text-red-400">{error}</p>
          <Button className="mt-3" variant="primary" onClick={() => load()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <Card
        title="Upcoming (by departure)"
        subtitle="Rows with a departure time in the future"
        className="!p-3 sm:!p-4"
      >
        <DataTable
          rows={upcoming}
          emptyMessage="No upcoming trips assigned"
          maxHeightClass="max-h-[min(70vh,480px)]"
        />
      </Card>

      <Card title="All assigned trips" subtitle="Newest departures first" className="!p-3 sm:!p-4">
        <DataTable
          rows={rows}
          emptyMessage="No trips assigned to you yet"
          maxHeightClass="max-h-[min(70vh,560px)]"
        />
      </Card>
    </div>
  );
}
