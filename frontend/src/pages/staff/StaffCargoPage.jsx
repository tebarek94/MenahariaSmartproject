import { useCallback, useEffect, useMemo, useState } from "react";
import { cargoService } from "@/services/cargo.service.js";
import { ticketsService } from "@/services/tickets.service.js";
import { tripsService } from "@/services/trips.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Select } from "@/ui/Select.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { formatMoney } from "@/utils/format.js";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function downloadTextFile(name, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function StaffCargoPage() {
  const [rows, setRows] = useState([]);
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [tripOptions, setTripOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cargoForm, setCargoForm] = useState({
    owner_id: "",
    trip_id: "",
    weight: "",
    content: "",
    status: "pending",
  });

  const loadCargo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, t, publicTrips] = await Promise.all([
        cargoService.list(),
        ticketsService.list(),
        tripsService.browsePublic(),
      ]);
      setRows(normalizeList(c));
      const ticketRows = normalizeList(t);
      const publicTripRows = normalizeList(publicTrips);

      const ownersFromTickets = ticketRows
        .map((row) => ({
          id: Number(row.user_id),
          name: row.passenger_name || `Passenger #${row.user_id}`,
        }))
        .filter((x) => Number.isInteger(x.id) && x.id > 0);

      const ownersFromCargo = normalizeList(c)
        .map((row) => ({
          id: Number(row.owner_id),
          name: row.owner_name || `User #${row.owner_id}`,
        }))
        .filter((x) => Number.isInteger(x.id) && x.id > 0);

      const ownerMap = new Map();
      [...ownersFromTickets, ...ownersFromCargo].forEach((item) => {
        if (!ownerMap.has(item.id)) ownerMap.set(item.id, item);
      });
      setOwnerOptions(
        [...ownerMap.values()].sort((a, b) =>
          String(a.name).localeCompare(String(b.name))
        )
      );

      const tripMap = new Map();
      publicTripRows.forEach((row) => {
        const id = Number(row.id);
        if (!Number.isInteger(id) || id <= 0) return;
        tripMap.set(id, {
          id,
          label: `${row.origin || "-"} -> ${row.destination || "-"} (#${id})`,
        });
      });
      normalizeList(c).forEach((row) => {
        const id = Number(row.trip_id);
        if (!Number.isInteger(id) || id <= 0 || tripMap.has(id)) return;
        tripMap.set(id, { id, label: `Trip #${id}` });
      });
      setTripOptions([...tripMap.values()].sort((a, b) => a.id - b.id));
    } catch (e) {
      setError(e?.message || "Failed to load cargo");
      setRows([]);
      setOwnerOptions([]);
      setTripOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCargo();
  }, [loadCargo]);

  const latestCargo = useMemo(
    () =>
      [...rows]
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
        .slice(0, 16),
    [rows]
  );

  async function handleCreateCargo(e) {
    e.preventDefault();
    setNotice("");
    setError("");
    try {
      const res = await cargoService.create({
        owner_id: Number(cargoForm.owner_id),
        trip_id: Number(cargoForm.trip_id),
        weight: Number(cargoForm.weight),
        content: cargoForm.content,
        status: cargoForm.status,
      });
      setNotice(`Cargo registered. Estimated fee: ${formatMoney(res?.fee ?? 0)}.`);
      setCargoForm((prev) => ({ ...prev, weight: "", content: "" }));
      await loadCargo();
    } catch (err) {
      setError(err?.message || "Could not register cargo");
    }
  }

  async function updateCargoStatus(row, status) {
    setNotice("");
    setError("");
    try {
      await cargoService.update(row.id, {
        owner_id: Number(row.owner_id),
        trip_id: Number(row.trip_id),
        weight: Number(row.weight),
        content: row.content || "",
        tracking_code: row.tracking_code || null,
        status,
      });
      setNotice(`Cargo #${row.id} updated.`);
      await loadCargo();
    } catch (err) {
      setError(err?.message || "Could not update cargo");
    }
  }

  function exportCargoReceipt(row) {
    const text = [
      "MENAHARIYA SMART - CARGO RECEIPT",
      `Receipt time: ${new Date().toLocaleString()}`,
      `Cargo ID: ${row.id}`,
      `Owner ID: ${row.owner_id ?? "-"}`,
      `Trip ID: ${row.trip_id ?? "-"}`,
      `Weight: ${row.weight ?? "-"} kg`,
      `Fee: ${formatMoney(row.fee ?? 0)}`,
      `Status: ${row.status ?? "-"}`,
      `Tracking code: ${row.tracking_code ?? "-"}`,
    ].join("\n");
    downloadTextFile(`cargo-receipt-${row.id}.txt`, text);
    setNotice(`Cargo receipt generated for #${row.id}.`);
  }

  if (loading && !rows.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Cargo staff" subtitle="Register cargo, calculate fees, generate receipts, and manage cargo records.">
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={loadCargo}>
            Refresh
          </Button>
          {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Register cargo">
          <form className="grid gap-3" onSubmit={handleCreateCargo}>
            <Select
              label="Owner ID"
              value={cargoForm.owner_id}
              onChange={(e) =>
                setCargoForm((p) => ({ ...p, owner_id: e.target.value }))
              }
              required
            >
              <option value="">Select owner ID</option>
              {ownerOptions.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} ({owner.id})
                </option>
              ))}
            </Select>
            <Select
              label="Trip ID"
              value={cargoForm.trip_id}
              onChange={(e) =>
                setCargoForm((p) => ({ ...p, trip_id: e.target.value }))
              }
              required
            >
              <option value="">Select trip ID</option>
              {tripOptions.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.label}
                </option>
              ))}
            </Select>
            <Input label="Weight (kg)" value={cargoForm.weight} onChange={(e) => setCargoForm((p) => ({ ...p, weight: e.target.value }))} required />
            <Input label="Content" value={cargoForm.content} onChange={(e) => setCargoForm((p) => ({ ...p, content: e.target.value }))} />
            <Button type="submit">Register cargo</Button>
          </form>
        </Card>
        <Card title="Cargo fee">
          <p className="text-sm text-p-muted">
            Fee is auto-calculated on create/update using backend cargo fee rules.
          </p>
        </Card>
      </div>

      <Card title="Cargo records">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-2">Cargo</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Trip</th>
                <th className="px-2 py-2">Weight</th>
                <th className="px-2 py-2">Fee</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {latestCargo.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-2 py-2">#{row.id}</td>
                  <td className="px-2 py-2">{row.owner_name || row.owner_id}</td>
                  <td className="px-2 py-2">{row.trip_id}</td>
                  <td className="px-2 py-2">{row.weight} kg</td>
                  <td className="px-2 py-2">{formatMoney(row.fee)}</td>
                  <td className="px-2 py-2 capitalize">{row.status || "-"}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => updateCargoStatus(row, "in_transit")}>
                        Mark in transit
                      </Button>
                      <Button variant="ghost" onClick={() => updateCargoStatus(row, "delivered")}>
                        Mark delivered
                      </Button>
                      <Button variant="ghost" onClick={() => exportCargoReceipt(row)}>
                        Receipt
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
