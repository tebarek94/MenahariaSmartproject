import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { cargoService } from "@/services/cargo.service.js";
import { cargoReceiptsService } from "@/services/cargoReceipts.service.js";
import { paymentService } from "@/services/payment.service.js";
import { ticketsService } from "@/services/tickets.service.js";
import { profileService } from "@/services/profile.service.js";
import { tripsService } from "@/services/trips.service.js";
import { Card } from "@/ui/Card.jsx";
import { Button } from "@/ui/Button.jsx";
import { Input } from "@/ui/Input.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
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
  return `#${t.id} · ${o} → ${d} · ${when}`;
}

export function PassengerDashboardPage() {
  const auth = useAuth();
  const [tickets, setTickets] = useState([]);
  const [cargo, setCargo] = useState([]);
  const [cargoReceipts, setCargoReceipts] = useState([]);
  const [trips, setTrips] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);

  const [newTripId, setNewTripId] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newContent, setNewContent] = useState("");
  const [cargoFormBusy, setCargoFormBusy] = useState(false);
  const [cargoFormError, setCargoFormError] = useState("");
  const [cargoNotice, setCargoNotice] = useState("");

  const [editing, setEditing] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [payingCargoId, setPayingCargoId] = useState(null);

  const loadAll = useCallback(async (opts = { quiet: false }) => {
    setError("");
    try {
      const [tRaw, cRaw, rRaw, p, trRaw] = await Promise.all([
        ticketsService.list(),
        cargoService.list(),
        cargoReceiptsService.listMine().catch(() => []),
        profileService.getProfile().catch(() => null),
        tripsService.list().catch(() => []),
      ]);
      setTickets(normalizeList(tRaw));
      setCargo(normalizeList(cRaw));
      setCargoReceipts(normalizeList(rRaw));
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
      receiptCount: cargoReceipts.length,
    };
  }, [tickets, cargo, cargoReceipts]);

  const recentTickets = useMemo(
    () => [...tickets].slice(0, 5),
    [tickets]
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

  async function handleCreateCargo(e) {
    e.preventDefault();
    setCargoFormError("");
    setCargoNotice("");
    const tid = Number(newTripId);
    const w = Number(newWeight);
    if (!Number.isFinite(tid) || tid <= 0) {
      setCargoFormError("Choose a trip.");
      return;
    }
    if (!Number.isFinite(w) || w <= 0) {
      setCargoFormError("Enter a valid weight in kg.");
      return;
    }
    setCargoFormBusy(true);
    try {
      const res = await cargoService.create({
        trip_id: tid,
        weight: w,
        content: newContent.trim() || undefined,
      });
      const fee = res?.fee;
      setCargoNotice(
        fee != null
          ? `Shipment request #${res?.id ?? ""} created. Estimated fee ${formatMoney(fee)}.`
          : `Shipment request #${res?.id ?? ""} created.`,
      );
      setNewTripId("");
      setNewWeight("");
      setNewContent("");
      await loadAll({ quiet: true });
    } catch (err) {
      setCargoFormError(
        err?.data?.message || err?.message || "Could not create shipment",
      );
    } finally {
      setCargoFormBusy(false);
    }
  }

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

  if (loading && !tickets.length && !cargo.length && !cargoReceipts.length) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <div className="min-w-0">
        <h1 className="text-p-heading text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
          Passenger dashboard
        </h1>
        <p className="text-p-muted mt-1 text-sm sm:text-base">
          Welcome back,{" "}
          <span className="text-p-body font-medium break-words">{displayName}</span>.
          Status below refreshes automatically.
        </p>
        {lastSync ? (
          <p className="mt-2 break-words text-xs leading-relaxed text-slate-500">
            Last updated {lastSync.toLocaleString()} · every {POLL_MS / 1000}s
            + when you return to this tab
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
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Account
          </p>
            <p className="text-p-heading mt-1 text-lg font-semibold capitalize">
            {accountStatus}
          </p>
          <p className="text-xs text-slate-500">Profile status in the system</p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Active tickets
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {stats.activeTickets}
          </p>
          <p className="text-xs text-slate-500">confirmed / reserved / pending</p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Payment pending
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {stats.payPending}
          </p>
          <p className="text-xs text-slate-500">tickets awaiting payment</p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Cargo
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-400">
            {stats.totalCargo}
          </p>
          <p className="text-xs text-slate-500">
            {stats.cargoPending} pending · {stats.receiptCount} receipt
            {stats.receiptCount === 1 ? "" : "s"}
          </p>
        </Card>
      </div>

      <PassengerCargoGpsMap cargo={cargo} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <Card
          className="!p-4 sm:!p-6"
          title="Recent tickets"
          subtitle="Status at a glance"
        >
          {recentTickets.length === 0 ? (
            <p className="text-sm text-slate-500">No tickets yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentTickets.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-p-heading break-words font-medium leading-snug">
                      #{t.id} · {t.origin} → {t.destination}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(t.departure_time)} · seat {t.seat_id ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(t.status)}`}
                    >
                      {t.status ?? "—"}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(t.payment_status)}`}
                    >
                      pay: {t.payment_status ?? "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          className="!p-4 sm:!p-6"
          title="Book cargo"
          subtitle="Attach shipment to a scheduled trip (fee is calculated from weight)"
        >
          <form onSubmit={handleCreateCargo} className="space-y-4">
            <div className="min-w-0">
              <label className="text-p-muted mb-1.5 block text-sm font-medium">
                Trip
              </label>
              <select
                className="ui-field w-full max-w-full truncate text-sm sm:text-base"
                value={newTripId}
                onChange={(e) => setNewTripId(e.target.value)}
                required
              >
                <option value="">Select trip…</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tripOptionLabel(t)}
                  </option>
                ))}
              </select>
              {trips.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  No open trips right now. Try again later or contact support.
                </p>
              ) : null}
            </div>
            <Input
              label="Weight (kg)"
              name="weight"
              type="number"
              min="0.01"
              step="0.01"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="e.g. 12.5"
              required
            />
            <div>
              <label className="text-p-muted mb-1.5 block text-sm font-medium">
                Description (optional)
              </label>
              <textarea
                name="content"
                className="ui-field min-h-[88px] w-full resize-y"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What are you shipping?"
                rows={3}
              />
            </div>
            {cargoFormError ? (
              <p className="text-sm text-red-400">{cargoFormError}</p>
            ) : null}
            <Button type="submit" disabled={cargoFormBusy || trips.length === 0}>
              {cargoFormBusy ? "Submitting…" : "Request cargo booking"}
            </Button>
          </form>
        </Card>
      </div>

      <Card
        className="!p-4 sm:!p-6"
        title="Your cargo"
        subtitle="Pending shipments can be edited or cancelled. Other statuses are managed by staff."
      >
        {cargo.length === 0 ? (
          <p className="text-sm text-slate-500">
            No cargo yet. Use &quot;Book cargo&quot; above to add one.
          </p>
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {cargo.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/5 pb-2">
                    <span className="font-mono text-xs text-slate-400">#{c.id}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(c.status)}`}
                    >
                      {c.status ?? "—"}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-sm font-medium leading-snug">
                    {(c.route_origin ?? "—")} → {(c.route_destination ?? "—")}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-slate-500">Departure</dt>
                      <dd className="text-p-body">{formatDate(c.trip_departure_time)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Weight</dt>
                      <dd className="text-p-body">
                        {c.weight != null ? `${c.weight} kg` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Fee</dt>
                      <dd className="text-p-body">{formatMoney(c.fee)}</dd>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <dt className="text-slate-500">Tracking</dt>
                      <dd className="break-all font-mono text-p-body">
                        {c.tracking_code || "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(c.payment_status)}`}
                    >
                      Pay: {c.payment_status ?? "pending"}
                    </span>
                    {!isCargoFeePaid(c.payment_status) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 !text-xs"
                        disabled={payingCargoId === c.id}
                        onClick={() => handlePayCargoChapa(c)}
                      >
                        {payingCargoId === c.id ? "Opening…" : "Pay with Chapa"}
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                    {isPendingCargo(c) ? (
                      !isCargoFeePaid(c.payment_status) ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-3 !py-1.5 !text-xs"
                            onClick={() => openEdit(c)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="!px-3 !py-1.5 !text-xs text-red-300 hover:text-red-200"
                            onClick={() => setDeleteTarget(c.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Locked after fee payment
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-primary-200 text-xs uppercase text-slate-500 dark:border-white/10">
                    <th className="pb-2 pr-3 font-medium">ID</th>
                    <th className="pb-2 pr-3 font-medium">Route</th>
                    <th className="pb-2 pr-3 font-medium">Departure</th>
                    <th className="pb-2 pr-3 font-medium">Weight</th>
                    <th className="pb-2 pr-3 font-medium">Fee</th>
                    <th className="pb-2 pr-3 font-medium">Fee pay</th>
                    <th className="pb-2 pr-3 font-medium">Tracking</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cargo.map((c) => (
                    <tr
                      key={c.id}
                      className="text-p-body border-b border-primary-100 last:border-0 dark:border-white/5"
                    >
                      <td className="py-3 pr-3 font-mono text-xs">#{c.id}</td>
                      <td className="max-w-[10rem] break-words py-3 pr-3">
                        {(c.route_origin ?? "—") + " → " + (c.route_destination ?? "—")}
                      </td>
                      <td className="text-p-muted py-3 pr-3 text-xs">
                        {formatDate(c.trip_departure_time)}
                      </td>
                      <td className="py-3 pr-3">
                        {c.weight != null ? `${c.weight} kg` : "—"}
                      </td>
                      <td className="py-3 pr-3">{formatMoney(c.fee)}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(c.payment_status)}`}
                        >
                          {c.payment_status ?? "pending"}
                        </span>
                        {!isCargoFeePaid(c.payment_status) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="mt-1 !block !px-2 !py-1 !text-xs"
                            disabled={payingCargoId === c.id}
                            onClick={() => handlePayCargoChapa(c)}
                          >
                            {payingCargoId === c.id ? "Opening…" : "Pay with Chapa"}
                          </Button>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">
                        {c.tracking_code || "—"}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(c.status)}`}
                        >
                          {c.status ?? "—"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {isPendingCargo(c) ? (
                            !isCargoFeePaid(c.payment_status) ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="!px-2 !py-1 !text-xs"
                                  onClick={() => openEdit(c)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="!px-2 !py-1 !text-xs text-red-300 hover:text-red-200"
                                  onClick={() => setDeleteTarget(c.id)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">
                                Locked after fee payment
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card
        className="!p-4 sm:!p-6"
        title="Cargo receipts"
        subtitle="Issued receipts for your shipments (staff creates these when payment is recorded)."
      >
        {cargoReceipts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No receipts yet. They appear here after staff records payment for your
            cargo.
          </p>
        ) : (
          <>
            <ul className="space-y-3 lg:hidden">
              {cargoReceipts.map((r) => {
                const brief = r.brief_description?.trim() || "";
                const route =
                  (r.route_summary || "").trim() &&
                  (r.route_summary || "").trim() !== "→"
                    ? r.route_summary
                    : "—";
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-200">
                        Receipt #{r.id}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(r.cargo_status)}`}
                      >
                        {r.cargo_status ?? "—"}
                      </span>
                    </div>
                    <p className="text-p-muted mt-1 text-xs">
                      Issued {formatDate(r.issued_at)}
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-slate-500">Amount</dt>
                        <dd className="font-medium">{formatMoney(r.amount)}</dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-slate-500">Cargo</dt>
                        <dd className="font-mono text-xs">#{r.cargo_id ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Route</dt>
                        <dd className="mt-0.5 break-words">{route}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Tracking</dt>
                        <dd className="mt-0.5 break-all font-mono text-xs">
                          {r.tracking_code || "—"}
                        </dd>
                      </div>
                      {brief ? (
                        <div>
                          <dt className="text-slate-500">Summary</dt>
                          <dd className="mt-0.5 break-words text-xs text-slate-400">
                            {brief}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-primary-200 text-xs uppercase text-slate-500 dark:border-white/10">
                    <th className="pb-2 pr-3 font-medium">Receipt</th>
                    <th className="pb-2 pr-3 font-medium">Issued</th>
                    <th className="pb-2 pr-3 font-medium">Amount</th>
                    <th className="pb-2 pr-3 font-medium">Cargo</th>
                    <th className="pb-2 pr-3 font-medium">Route</th>
                    <th className="pb-2 pr-3 font-medium">Tracking</th>
                    <th className="pb-2 pr-3 font-medium">Summary</th>
                    <th className="pb-2 font-medium">Shipment status</th>
                  </tr>
                </thead>
                <tbody>
                  {cargoReceipts.map((r) => {
                    const brief = r.brief_description?.trim() || "";
                    const briefShort =
                      brief.length > 48 ? `${brief.slice(0, 45)}…` : brief;
                    return (
                      <tr
                        key={r.id}
                        className="text-p-body border-b border-primary-100 last:border-0 dark:border-white/5"
                      >
                        <td className="py-3 pr-3 font-mono text-xs">#{r.id}</td>
                        <td className="text-p-muted py-3 pr-3 text-xs">
                          {formatDate(r.issued_at)}
                        </td>
                        <td className="py-3 pr-3">{formatMoney(r.amount)}</td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          #{r.cargo_id ?? "—"}
                        </td>
                        <td className="max-w-[10rem] break-words py-3 pr-3">
                          {(r.route_summary || "").trim() &&
                          (r.route_summary || "").trim() !== "→"
                            ? r.route_summary
                            : "—"}
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          {r.tracking_code || "—"}
                        </td>
                        <td
                          className="text-p-muted max-w-[12rem] truncate py-3 pr-3 text-xs"
                          title={brief || undefined}
                        >
                          {briefShort || "—"}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(r.cargo_status)}`}
                          >
                            {r.cargo_status ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

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
