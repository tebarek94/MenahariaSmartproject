import { useEffect } from "react";
import { useAsync } from "@/hooks/useAsync.js";
import { viewsService } from "@/services/views.service.js";
import { Card } from "@/ui/Card.jsx";
import { DataTable } from "@/ui/DataTable.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { Button } from "@/ui/Button.jsx";

export function AdminRelationsOverviewPage() {
  const v = useAsync(() => viewsService.relationsOverview(40));

  useEffect(() => {
    v.run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (v.loading && !v.data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (v.error) {
    return (
      <Card title="Relations overview">
        <p className="text-sm text-red-400">{v.error.message}</p>
        <Button variant="ghost" className="mt-4" onClick={() => v.run()}>
          Retry
        </Button>
      </Card>
    );
  }

  const o = v.data;
  const t = o?.tickets_relations;
  const veh = o?.vehicles_relations;
  const c = o?.cargo_relations;
  const s = o?.seats_relations;

  return (
    <div className="space-y-6">

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tickets (subset)">
          <DataTable
            rows={t?.rows}
            maxHeightClass="max-h-72"
            emptyMessage="No rows"
          />
        </Card>
        <Card title="Cargo (subset)">
          <DataTable
            rows={c?.rows}
            maxHeightClass="max-h-72"
            emptyMessage="No rows"
          />
        </Card>
        <Card title="Seats (subset)">
          <DataTable
            rows={s?.rows}
            maxHeightClass="max-h-72"
            emptyMessage="No rows"
          />
        </Card>
        <Card title="Fleet summary (subset)">
          <DataTable
            rows={veh?.fleet_summary}
            maxHeightClass="max-h-72"
            emptyMessage="No rows"
          />
        </Card>
      </div>

      <Card title="Recent trips sample (subset)">
        <DataTable
          rows={veh?.recent_trips_sample}
          maxHeightClass="max-h-64"
          emptyMessage="No trips"
        />
      </Card>
    </div>
  );
}
