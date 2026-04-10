import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cargoService } from "@/services/cargo.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { ROUTES } from "@/utils/constants.js";
import { formatDate, formatMoney } from "@/utils/format.js";

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

const POLL_MS = 30_000;

function statusTone(s) {
  const v = String(s ?? "").toLowerCase();
  if (v === "confirmed" || v === "completed" || v === "delivered")
    return "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30";
  if (v === "pending" || v === "reserved")
    return "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30";
  if (v === "cancelled" || v === "failed")
    return "bg-red-500/20 text-red-300 ring-1 ring-red-500/30";
  if (v === "in_transit" || v === "shipped")
    return "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30";
  return "bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/20";
}

export function PassengerCargoTrackPage() {
  const [cargo, setCargo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [copyHint, setCopyHint] = useState("");

  const load = useCallback(async (opts = { quiet: false }) => {
    try {
      if (!opts.quiet) setLoading(true);
      const raw = await cargoService.list();
      setCargo(normalizeList(raw));
      setLastSync(new Date());
      setError("");
    } catch (e) {
      setError(e?.data?.message || e?.message || "Failed to load cargo");
    } finally {
      if (!opts.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load({ quiet: true }), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") load({ quiet: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return cargo;
    return cargo.filter((c) => {
      const idStr = String(c.id ?? "");
      const track = String(c.tracking_code ?? "").toLowerCase();
      const origin = String(c.route_origin ?? "").toLowerCase();
      const dest = String(c.route_destination ?? "").toLowerCase();
      return (
        idStr.includes(q) ||
        track.includes(q) ||
        origin.includes(q) ||
        dest.includes(q)
      );
    });
  }, [cargo, q]);

  async function copyCode(code) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(String(code));
      setCopyHint("Copied");
      setTimeout(() => setCopyHint(""), 2000);
    } catch {
      setCopyHint("Copy failed");
      setTimeout(() => setCopyHint(""), 2000);
    }
  }

  if (loading && !cargo.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-p-heading text-lg font-bold sm:text-xl lg:text-2xl">
            Track cargo
          </h2>
          <p className="text-p-muted">
            Search by shipment ID, tracking code, or route. Status updates every{" "}
            {POLL_MS / 1000}s while this page is open.
          </p>
          {lastSync ? (
            <p className="text-xs text-slate-500">
              Last updated {lastSync.toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={ROUTES.PASSENGER_DASHBOARD}>
            <Button variant="ghost" className="!text-xs" type="button">
              ← Dashboard
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="!text-xs"
            type="button"
            onClick={() => load({ quiet: true })}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      ) : null}

      <Card className="!p-4">
        <Input
          label="Filter shipments"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tracking code, ID, city…"
          autoComplete="off"
        />
        {copyHint ? (
          <p className="mt-2 text-xs text-emerald-400">{copyHint}</p>
        ) : null}
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-p-muted">
            {cargo.length === 0
              ? "You have no cargo bookings yet. Add one from the dashboard."
              : "No shipments match your search."}
          </p>
          {cargo.length === 0 ? (
            <Link to={ROUTES.PASSENGER_DASHBOARD} className="mt-3 inline-block">
              <Button type="button" className="!text-xs">
                Go to dashboard
              </Button>
            </Link>
          ) : null}
        </Card>
      ) : (
        <ul className="space-y-4">
          {filtered.map((c) => (
            <li key={c.id}>
              <Card className="!p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-p-muted font-mono text-sm">
                        #{c.id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusTone(c.status)}`}
                      >
                        {c.status ?? "—"}
                      </span>
                      {c.trip_status ? (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusTone(c.trip_status)}`}
                        >
                          trip: {c.trip_status}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-p-heading text-base font-semibold">
                      {(c.route_origin ?? "—") + " → " + (c.route_destination ?? "—")}
                    </p>
                    <dl className="text-p-muted grid gap-1 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase text-slate-500">
                          Departure
                        </dt>
                        <dd className="text-p-body">
                          {formatDate(c.trip_departure_time)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase text-slate-500">
                          Weight / fee
                        </dt>
                        <dd className="text-p-body">
                          {c.weight != null ? `${c.weight} kg` : "—"} ·{" "}
                          {formatMoney(c.fee)}
                        </dd>
                      </div>
                      {c.vehicle_plate ? (
                        <div>
                          <dt className="text-xs uppercase text-slate-500">
                            Vehicle
                          </dt>
                          <dd className="text-p-body font-mono">
                            {c.vehicle_plate}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    {c.content ? (
                      <p className="text-sm text-slate-500">
                        <span className="text-slate-600">Note: </span>
                        {c.content}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 rounded-lg border border-white/10 bg-slate-950/60 p-3 sm:min-w-[200px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Tracking code
                    </p>
                    {c.tracking_code ? (
                      <>
                        <p className="mt-1 break-all font-mono text-sm text-emerald-300">
                          {c.tracking_code}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          className="mt-2 !px-2 !py-1 !text-xs"
                          onClick={() => copyCode(c.tracking_code)}
                        >
                          Copy code
                        </Button>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">
                        Assigned when staff confirms your shipment.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
