import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { cargoService } from "@/services/cargo.service.js";
import { paymentService } from "@/services/payment.service.js";
import { ticketsService } from "@/services/tickets.service.js";
import { profileService } from "@/services/profile.service.js";
import { tripsService } from "@/services/trips.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { RealtimeLineChart } from "@/ui/RealtimeLineChart.jsx";
import { ChartTrendIcon } from "@/ui/icons.jsx";
import { AnimatedDonut } from "@/ui/charts/AnimatedDonut.jsx";
import { AnimatedHorizontalBars } from "@/ui/charts/AnimatedHorizontalBars.jsx";
import { InteractiveHistogram } from "@/ui/charts/InteractiveHistogram.jsx";
import { ConfirmModal } from "@/components/ConfirmModal.jsx";
import { PassengerCargoGpsMap } from "@/components/maps/PassengerCargoGpsMap.jsx";
import { ROUTES, STORAGE_KEYS } from "@/utils/constants.js";
import {
  interpretCargoChapaVerify,
  isCargoFeePaid,
  parseCargoFeeForChapa,
} from "@/utils/cargoPayment.js";
import { formatDate, formatMoney } from "@/utils/format.js";

function normalizeList(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

const POLL_MS = 25_000;
const MAX_PASSENGER_SAMPLES = 20;

function statusTone(s) {
  const v = String(s ?? "").toLowerCase();
  if (v === "confirmed" || v === "completed" || v === "paid")
    return "bg-emerald-500/20 text-emerald-300";
  if (v === "pending" || v === "reserved")
    return "bg-amber-500/20 text-amber-200";
  if (v === "cancelled" || v === "failed")
    return "bg-red-500/20 text-red-300";
  return "bg-slate-500/20 text-slate-300";
}

function isPendingCargo(c) {
  return String(c?.status ?? "").toLowerCase() === "pending";
}

function tripOptionLabel(t) {
  const o = t.origin ?? "—";
  const d = t.destination ?? "—";
  const when = formatDate(t.departure_time);
  const driver = t.driver_name ? ` · Driver: ${t.driver_name}` : "";
  return `#${t.id} · ${o} → ${d} · ${when}${driver}`;
}

function isTripAvailableForPassenger(t) {
  const status = String(t?.status ?? "").toLowerCase();
  const allowedStatus =
    status === "" ||
    status === "scheduled" ||
    status === "ongoing" ||
    status === "open" ||
    status === "active";

  if (!allowedStatus) return false;

  const ts = new Date(t?.departure_time ?? "").getTime();
  if (!Number.isFinite(ts)) return true;
  return ts > Date.now();
}

function formatStatusLabel(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "Unknown";
  return raw
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildStatusMixRows(values) {
  const counts = new Map();
  for (const v of values) {
    const key = String(v ?? "").trim().toLowerCase() || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, value], idx) => ({
      key,
      label: formatStatusLabel(key),
      value,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function PassengerDashboardPage() {
  const auth = useAuth();
  const [tickets, setTickets] = useState([]);
  const [cargo, setCargo] = useState([]);
  const [trips, setTrips] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [statsHistory, setStatsHistory] = useState([]);
  const [cargoNotice, setCargoNotice] = useState("");

  const [editing, setEditing] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [payingCargoId, setPayingCargoId] = useState(null);
  const [mixView, setMixView] = useState("tickets");

  const loadAll = useCallback(async (opts = { quiet: false }) => {
    setError("");
    try {
      const [tRaw, cRaw, p, trRaw] = await Promise.all([
        ticketsService.list(),
        cargoService.list(),
        profileService.getProfile().catch(() => null),
        tripsService.list().catch(() => []),
      ]);
      setTickets(normalizeList(tRaw));
      setCargo(normalizeList(cRaw));
      setTrips(normalizeList(trRaw));
      setProfile(p && typeof p === "object" ? p : null);
      setLastSync(new Date());
    } catch (e) {
      setError(e?.data?.message || e?.message || "Failed to refresh");
    } finally {
      if (!opts.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const pending = sessionStorage.getItem(STORAGE_KEYS.CHAPA_PENDING_CARGO_TX_REF);
    if (!pending) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await paymentService.chapaVerify(pending);
        if (cancelled) return;
        const outcome = interpretCargoChapaVerify(data, null);
        if (outcome.clearPending) {
          sessionStorage.removeItem(STORAGE_KEYS.CHAPA_PENDING_CARGO_TX_REF);
        }
        if (outcome.success) {
          await loadAll({ quiet: true });
          setCargoNotice("Cargo fee payment confirmed.");
        }
      } catch (err) {
        if (cancelled) return;
        const outcome = interpretCargoChapaVerify(null, err);
        if (outcome.clearPending) {
          sessionStorage.removeItem(STORAGE_KEYS.CHAPA_PENDING_CARGO_TX_REF);
        }
        if (outcome.userMessage) {
          setCargoNotice(outcome.userMessage);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  useEffect(() => {
    const id = setInterval(() => loadAll({ quiet: true }), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") loadAll({ quiet: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadAll]);

  const stats = useMemo(() => {
    const payPending = tickets.filter((t) =>
      String(t.payment_status ?? "")
        .toLowerCase()
        .includes("pending")
    ).length;
    const activeTickets = tickets.filter((t) =>
      ["confirmed", "reserved", "pending"].includes(
        String(t.status ?? "").toLowerCase()
      )
    ).length;
    const cargoPending = cargo.filter(
      (c) => String(c.status ?? "").toLowerCase() === "pending"
    ).length;
    return {
      payPending,
      activeTickets,
      cargoPending,
      totalCargo: cargo.length,
    };
  }, [tickets, cargo]);

  useEffect(() => {
    if (loading) return;
    setStatsHistory((prev) =>
      [
        ...prev,
        {
          at: Date.now(),
          activeTickets: stats.activeTickets,
          payPending: stats.payPending,
          cargoPending: stats.cargoPending,
          totalCargo: stats.totalCargo,
        },
      ].slice(-MAX_PASSENGER_SAMPLES)
    );
  }, [
    loading,
    stats.activeTickets,
    stats.payPending,
    stats.cargoPending,
    stats.totalCargo,
  ]);

  const passengerSeries = useMemo(
    () => [
      {
        name: "Active tickets",
        color: "#4A90E2",
        values: statsHistory.map((x) => x.activeTickets),
      },
      {
        name: "Pending payments",
        color: "#F5A623",
        values: statsHistory.map((x) => x.payPending),
      },
      {
        name: "Pending cargo",
        color: "#7ED321",
        values: statsHistory.map((x) => x.cargoPending),
      },
    ],
    [statsHistory]
  );

  const recentTickets = useMemo(
    () => [...tickets].slice(0, 5),
    [tickets]
  );

  const statusMixByView = useMemo(
    () => ({
      tickets: buildStatusMixRows(tickets.map((t) => t.status)),
      cargo: buildStatusMixRows(cargo.map((c) => c.status)),
      payments: buildStatusMixRows([
        ...tickets.map((t) => t.payment_status),
        ...cargo.map((c) => c.payment_status),
      ]),
    }),
    [tickets, cargo]
  );

  const mixRows = statusMixByView[mixView] ?? [];
  const mixTotal = mixRows.reduce((sum, row) => sum + row.value, 0);
  const mixChartRows = useMemo(
    () => mixRows.map((row) => ({ status: row.label, count: row.value })),
    [mixRows]
  );

  const tripChoicesForEdit = useMemo(() => {
    const map = new Map(trips.map((t) => [Number(t.id), { ...t }]));
    for (const c of cargo) {
      const tid = Number(c.trip_id);
      if (!Number.isFinite(tid)) continue;
      if (!map.has(tid)) {
        map.set(tid, {
          id: tid,
          origin: c.route_origin,
          destination: c.route_destination,
          departure_time: c.trip_departure_time,
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      const ta = new Date(a.departure_time || 0).getTime();
      const tb = new Date(b.departure_time || 0).getTime();
      return ta - tb;
    });
  }, [trips, cargo]);

  const displayName =
    profile?.full_name || auth.user?.full_name || auth.user?.phone || "Passenger";
  const accountStatus = String(
    profile?.status ?? auth.user?.status ?? "active"
  );

  function openEdit(c) {
    if (!isPendingCargo(c) || isCargoFeePaid(c.payment_status)) return;
    setEditError("");
    setEditing({
      id: c.id,
      trip_id: String(c.trip_id),
      weight: String(c.weight ?? ""),
      content: c.content ?? "",
      status: c.status ?? "pending",
      tracking_code: c.tracking_code ?? "",
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editing || !auth.user?.id) return;
    setEditError("");
    const tid = Number(editing.trip_id);
    const w = Number(editing.weight);
    if (!Number.isFinite(tid) || tid <= 0) {
      setEditError("Choose a trip.");
      return;
    }
    if (!Number.isFinite(w) || w <= 0) {
      setEditError("Enter a valid weight in kg.");
      return;
    }
    setEditBusy(true);
    try {
      await cargoService.update(editing.id, {
        owner_id: auth.user.id,
        trip_id: tid,
        weight: w,
        content: editing.content.trim() || null,
        status: editing.status,
        tracking_code: editing.tracking_code?.trim() || null,
      });
      setEditing(null);
      setCargoNotice("Shipment updated.");
      setTimeout(() => setCargoNotice(""), 4000);
      await loadAll({ quiet: true });
    } catch (err) {
      setEditError(
        err?.data?.message || err?.message || "Could not update shipment",
      );
    } finally {
      setEditBusy(false);
    }
  }

  async function handlePayCargoChapa(c) {
    const amt = parseCargoFeeForChapa(c.fee);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Cargo fee is missing; contact support.");
      return;
    }
    if (isCargoFeePaid(c.payment_status)) {
      setCargoNotice("This shipment is already paid.");
      setTimeout(() => setCargoNotice(""), 4000);
      return;
    }
    setPayingCargoId(c.id);
    setError("");
    try {
      const returnUrl = `${window.location.origin}${ROUTES.PASSENGER_CARGO_TRACK}`;
      const data = await paymentService.chapaInitialize({
        cargo_id: c.id,
        amount: amt,
        return_url: returnUrl,
      });
      const checkoutUrl = data?.checkout_url;
      const txRef = data?.tx_ref;
      if (!checkoutUrl || !txRef) {
        setError("Invalid payment response from server");
        return;
      }
      sessionStorage.setItem(STORAGE_KEYS.CHAPA_PENDING_CARGO_TX_REF, txRef);
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Could not start payment");
    } finally {
      setPayingCargoId(null);
    }
  }

  async function confirmDelete() {
    if (deleteTarget == null) return;
    setDeleteBusy(true);
    try {
      await cargoService.remove(deleteTarget);
      setDeleteTarget(null);
      setCargoNotice("Shipment removed.");
      setTimeout(() => setCargoNotice(""), 4000);
      await loadAll({ quiet: true });
    } catch (err) {
      setError(err?.data?.message || err?.message || "Could not delete shipment");
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading && !tickets.length && !cargo.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <div className="min-w-0">
        {/* animate the text add animate color change     */}
        <div className="animate-pulse"> 
          <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl"><span className="animate-pulse">Passenger Manegements Dashboard</span></h1>
        </div>
      
        <p className="text-p-muted mt-1 text-sm sm:text-base">
          Welcome back,
          <span className="text-p-body font-medium break-words">{displayName}</span>.
         
        </p>
        {lastSync ? (
          <p className="text-p-subtle mt-2 break-words text-xs leading-relaxed">
          {/* in this section disply the time data and daya autmaticaly */}
          Last updated {lastSync.toLocaleString()} · every {POLL_MS / 1000}s 
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {cargoNotice ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
          {cargoNotice}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Card className="!p-4 sm:!p-5">
          <p className="text-p-subtle text-xs uppercase tracking-wide">
            Account
          </p>
            <p className="text-p-heading mt-1 text-lg font-semibold capitalize">
            {accountStatus}
          </p>
          <p className="text-p-subtle text-xs">Profile status in the system</p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="text-p-subtle text-xs uppercase tracking-wide">
            Active tickets
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {stats.activeTickets}
          </p>
          <p className="text-p-subtle text-xs">confirmed / reserved / pending</p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="text-p-subtle text-xs uppercase tracking-wide">
            Payment pending
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {stats.payPending}
          </p>
          <p className="text-p-subtle text-xs">tickets awaiting payment</p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="text-p-subtle text-xs uppercase tracking-wide">
            Cargo
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-400">
            {stats.totalCargo}
          </p>
          <p className="text-p-subtle text-xs">
            {stats.cargoPending} pending shipment
            {stats.cargoPending === 1 ? "" : "s"}
          </p>
        </Card>
      </div>

      <Card
        className="!p-4 sm:!p-6"
        title="Status mix"
        subtitle="Interactive distribution across tickets, cargo, and payment states"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "tickets", label: "Tickets" },
            { key: "cargo", label: "Cargo" },
            { key: "payments", label: "Payments" },
          ].map((opt) => (
            <Button
              key={opt.key}
              type="button"
              variant={mixView === opt.key ? "primary" : "ghost"}
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => setMixView(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {mixRows.length === 0 || mixTotal <= 0 ? (
          <p className="text-sm text-slate-500">
            No status data yet for this section.
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-12 lg:items-center">
            <AnimatedDonut
              rows={mixChartRows}
              size={136}
              stroke={15}
              className="lg:col-span-4"
            />
            <div className="min-w-0 lg:col-span-4">
              <AnimatedHorizontalBars rows={mixChartRows} barHeightClass="h-2" />
            </div>
            <InteractiveHistogram rows={mixChartRows} className="lg:col-span-4" />
          </div>
        )}
      </Card>


      <PassengerCargoGpsMap cargo={cargo} />



      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cargo-edit-title"
          onClick={() => !editBusy && setEditing(null)}
        >
          <div
            className="w-full min-w-0 max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="max-h-[min(90vh,100dvh)] overflow-y-auto !p-4 shadow-2xl sm:!p-6">
            <h2
              id="cargo-edit-title"
              className="text-p-heading text-lg font-semibold"
            >
              Edit shipment #{editing.id}
            </h2>
            <p className="text-p-muted mt-1 text-sm">
              Only pending requests can be changed. Fee will be recalculated from
              weight.
            </p>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="text-p-muted mb-1.5 block text-sm font-medium">
                  Trip
                </label>
                <select
                  className="ui-field w-full"
                  value={editing.trip_id}
                  onChange={(e) =>
                    setEditing((x) => ({ ...x, trip_id: e.target.value }))
                  }
                  required
                >
                  {tripChoicesForEdit.map((t) => (
                    <option key={t.id} value={t.id}>
                      {tripOptionLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Weight (kg)"
                type="number"
                min="0.01"
                step="0.01"
                value={editing.weight}
                onChange={(e) =>
                  setEditing((x) => ({ ...x, weight: e.target.value }))
                }
                required
              />
              <div>
                <label className="text-p-muted mb-1.5 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  className="ui-field min-h-[80px] w-full resize-y"
                  value={editing.content}
                  onChange={(e) =>
                    setEditing((x) => ({ ...x, content: e.target.value }))
                  }
                  rows={3}
                />
              </div>
              {editError ? (
                <p className="text-sm text-red-400">{editError}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={editBusy}>
                  {editBusy ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={editBusy}
                  onClick={() => setEditing(null)}
                >
                  Close
                </Button>
              </div>
            </form>
            </Card>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Cancel this shipment?"
        message="This removes your cargo booking. You can create a new one anytime."
        confirmText={deleteBusy ? "Removing…" : "Remove booking"}
        loading={deleteBusy}
        type="danger"
      />
    </div>
  );
}
