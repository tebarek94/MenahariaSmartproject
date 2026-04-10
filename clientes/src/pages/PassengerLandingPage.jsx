import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tripsService } from "@/services/trips.service.js";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { ROUTES } from "@/utils/constants.js";
import { formatDate, formatMoney } from "@/utils/format.js";

function normalizeTrips(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

const IMG = {
  hero: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80&auto=format&fit=crop",
  seats: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80&auto=format&fit=crop",
  cargo: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&auto=format&fit=crop",
  pay: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&auto=format&fit=crop",
};

export function PassengerLandingPage() {
  const [publicTrips, setPublicTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");
  const [lastFetch, setLastFetch] = useState(null);

  const loadTrips = useCallback(async () => {
    setTripsError("");
    try {
      const raw = await tripsService.browsePublic();
      setPublicTrips(normalizeTrips(raw));
      setLastFetch(new Date());
    } catch (e) {
      setTripsError(
        e?.data?.message || e?.message || "Could not load trips right now."
      );
      setPublicTrips([]);
    } finally {
      setTripsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    const t = setInterval(() => loadTrips(), 45_000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadTrips();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadTrips]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={IMG.hero}
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/70" />
        </div>
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center space-y-6">
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">
              Smart transport · Ethiopia
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Book seats. Track status. Travel with confidence.
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Menahariya Smart connects passengers with scheduled routes, live
              ticket status, digital QR boarding, and cargo on the same trips
              your driver already runs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={ROUTES.PASSENGER_REGISTER}>
                <Button>Create passenger account</Button>
              </Link>
              <Link to={ROUTES.LOGIN}>
                <Button variant="secondary">Sign in to book</Button>
              </Link>
            </div>
            {lastFetch ? (
              <p className="text-xs text-slate-500">
                Trip list refreshed {lastFetch.toLocaleTimeString()} · updates
                every 45s
              </p>
            ) : null}
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-sm">
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">One profile</strong> for
                    tickets, payments, and cargo bookings.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Real-time dashboard</strong>{" "}
                    after login — status updates without refreshing the page.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">QR-ready tickets</strong> for
                    quick verification at the gate.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
          Built for passengers and operators
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-400">
          Everything you need in one system: scheduling, inventory, payments,
          and reporting — you see the slice that matters for your journey.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
            <img
              src={IMG.seats}
              alt="Comfortable travel"
              className="h-44 w-full object-cover"
            />
            <div className="p-5">
              <h3 className="text-lg font-semibold text-white">Seat booking</h3>
              <p className="mt-2 text-sm text-slate-400">
                Pick a trip, choose an available seat on the right vehicle, and
                get instant confirmation with payment status on your dashboard.
              </p>
            </div>
          </article>
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
            <img
              src={IMG.cargo}
              alt="Cargo"
              className="h-44 w-full object-cover"
            />
            <div className="p-5">
              <h3 className="text-lg font-semibold text-white">
                Cargo on your route
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Send parcels on scheduled departures. Track weight, fees, and
                delivery state from your passenger dashboard.
              </p>
            </div>
          </article>
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
            <img
              src={IMG.pay}
              alt="Secure payment"
              className="h-44 w-full object-cover"
            />
            <div className="p-5">
              <h3 className="text-lg font-semibold text-white">
                Payments & receipts
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Clear ticket and payment states, download tickets when ready,
                and keep a history under your account.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="trips" className="border-t border-white/10 bg-slate-900/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold text-white md:text-3xl">
                Upcoming departures
              </h2>
              <p className="mt-1 text-slate-400">
                Live list from the system (no login). Sign in to reserve a seat
                or add cargo.
              </p>
            </div>
            <Button variant="ghost" className="!text-xs shrink-0" type="button" onClick={() => loadTrips()}>
              Refresh now
            </Button>
          </div>

          {tripsError ? (
            <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              {tripsError}
            </p>
          ) : null}

          <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
            {tripsLoading ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Departure</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {publicTrips.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No scheduled trips right now. Check back soon.
                      </td>
                    </tr>
                  ) : (
                    publicTrips.map((t) => (
                      <tr
                        key={t.id}
                        className="bg-slate-950/40 hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3 text-white">
                          {t.origin ?? "—"} → {t.destination ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                          {formatDate(t.departure_time)}
                        </td>
                        <td className="px-4 py-3 text-emerald-300/90">
                          {formatMoney(t.price)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {t.plate_number ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                            {t.status ?? "scheduled"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={ROUTES.LOGIN}>
              <Button>Sign in to book</Button>
            </Link>
            <Link to={ROUTES.PASSENGER_REGISTER}>
              <Button variant="secondary">Create account</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
