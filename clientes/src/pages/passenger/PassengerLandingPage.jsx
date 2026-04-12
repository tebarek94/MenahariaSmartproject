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
      <section className="relative min-h-[min(100svh,44rem)] overflow-hidden md:min-h-0">
        <div className="absolute inset-0 z-0">
          <img
            src={IMG.hero}
            alt=""
            className="h-full min-h-[20rem] w-full object-cover opacity-40 md:min-h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-slate-950/90 to-slate-950 md:bg-gradient-to-r md:from-slate-950 md:via-slate-950/90 md:to-slate-950/70" />
        </div>
        <div className="relative z-10 mx-auto grid max-w-6xl gap-8 px-3 py-12 sm:gap-10 sm:px-4 sm:py-16 md:grid-cols-2 md:gap-10 md:py-20 lg:px-6 lg:py-24">
          <div className="flex flex-col justify-center space-y-5 sm:space-y-6">
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/90 sm:text-sm">
              Smart transport · Ethiopia
            </p>
            <h1 className="text-[1.65rem] font-bold leading-[1.15] text-white sm:text-4xl md:text-5xl lg:text-6xl">
              Book seats. Track status. Travel with confidence.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Menahariya Smart connects passengers with scheduled routes, live
              ticket status, digital QR boarding, and cargo on the same trips
              your driver already runs — with email-verified signup, optional
              two-step sign-in, and live shipment maps when your driver shares
              location.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to={ROUTES.PASSENGER_REGISTER} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">Create passenger account</Button>
              </Link>
              <Link to={ROUTES.LOGIN} className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Sign in to book
                </Button>
              </Link>
            </div>
            {lastFetch ? (
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Trip list refreshed {lastFetch.toLocaleTimeString()} · updates
                every 45s
              </p>
            ) : null}
          </div>
          <div className="flex items-stretch justify-center md:items-center">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
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
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Email-verified signup</strong>{" "}
                    — confirm your address with a one-time code before your account
                    is activated.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Live cargo map</strong> on your
                    dashboard when your driver shares GPS — free OpenStreetMap
                    tiles, no extra map subscription.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        id="whats-new"
        className="border-t border-white/10 bg-slate-950/40 py-12 sm:py-16"
      >
        <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
          <h2 className="text-center text-xl font-bold text-white sm:text-2xl md:text-3xl">
            New on the platform
          </h2>
          <p className="mx-auto mt-2 max-w-2xl px-1 text-center text-sm leading-relaxed text-slate-400 sm:text-base">
            Recent upgrades focused on trust, security, and visibility — so you
            always know where your booking stands.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                Signup
              </p>
              <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
                Email OTP registration
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                When you create a passenger account, we send a code to your
                inbox. Enter it to finish registration — reduces mistakes and
                fake signups.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                Security
              </p>
              <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
                Email sign-in protection
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Turn on optional two-step verification in your profile. Sign-in
                and sensitive changes can require a code sent to your email — no
                extra apps required.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                Cargo
              </p>
              <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
                Live GPS on your dashboard
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                For paid, confirmed shipments with an assigned driver, your
                dashboard and Track cargo page can show a live map when the
                driver shares location with operations.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                Maps
              </p>
              <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
                OpenStreetMap everywhere
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Live views use free, community-built map tiles — no paid map API
                keys for passengers. Operators use the same stack for fleet
                visibility.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-3 py-12 sm:px-4 sm:py-16 lg:px-6">
        <h2 className="text-center text-xl font-bold text-white sm:text-2xl md:text-3xl">
          Built for passengers and operators
        </h2>
        <p className="mx-auto mt-2 max-w-2xl px-1 text-center text-sm leading-relaxed text-slate-400 sm:text-base">
          Everything you need in one system: scheduling, inventory, payments,
          and reporting — you see the slice that matters for your journey.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 sm:gap-8 md:grid-cols-3">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
            <img
              src={IMG.seats}
              alt="Comfortable travel"
              className="h-40 w-full object-cover sm:h-44"
            />
            <div className="p-4 sm:p-5">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Seat booking
              </h3>
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
              className="h-40 w-full object-cover sm:h-44"
            />
            <div className="p-4 sm:p-5">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Cargo on your route
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Send parcels on scheduled departures. Track weight, fees, and
                status from your dashboard — and see live map updates for active
                shipments when your driver is sharing GPS.
              </p>
            </div>
          </article>
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
            <img
              src={IMG.pay}
              alt="Secure payment"
              className="h-40 w-full object-cover sm:h-44"
            />
            <div className="p-4 sm:p-5">
              <h3 className="text-base font-semibold text-white sm:text-lg">
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

      <section id="trips" className="border-t border-white/10 bg-slate-900/30 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">
                Upcoming departures
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400 sm:text-base">
                Live list from the system (no login). Sign in to reserve a seat
                or add cargo.
              </p>
            </div>
            <Button
              variant="ghost"
              className="!text-xs shrink-0 self-start sm:self-auto"
              type="button"
              onClick={() => loadTrips()}
            >
              Refresh now
            </Button>
          </div>

          {tripsError ? (
            <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-3 text-sm text-amber-200 sm:px-4">
              {tripsError}
            </p>
          ) : null}

          {tripsLoading ? (
            <div className="mt-8 flex justify-center rounded-xl border border-white/10 py-16">
              <Spinner />
            </div>
          ) : (
            <>
              {/* Mobile / small tablet: stacked cards */}
              <div className="mt-8 space-y-3 md:hidden">
                {publicTrips.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-500">
                    No scheduled trips right now. Check back soon.
                  </p>
                ) : (
                  publicTrips.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-white/10 bg-slate-950/50 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 font-medium leading-snug text-white">
                          {t.origin ?? "—"} → {t.destination ?? "—"}
                        </p>
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                          {t.status ?? "scheduled"}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs uppercase text-slate-500">
                            Departure
                          </dt>
                          <dd className="text-slate-200">
                            {formatDate(t.departure_time)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-slate-500">
                            Price
                          </dt>
                          <dd className="text-emerald-300/90">
                            {formatMoney(t.price)}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase text-slate-500">
                            Vehicle
                          </dt>
                          <dd className="font-mono text-xs text-slate-400">
                            {t.plate_number ?? "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))
                )}
              </div>

              {/* md+: table */}
              <div className="mt-8 hidden overflow-x-auto rounded-xl border border-white/10 md:block">
                <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3 lg:px-4">Route</th>
                      <th className="px-3 py-3 lg:px-4">Departure</th>
                      <th className="px-3 py-3 lg:px-4">Price</th>
                      <th className="px-3 py-3 lg:px-4">Vehicle</th>
                      <th className="px-3 py-3 lg:px-4">Status</th>
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
                          <td className="px-3 py-3 text-white lg:px-4">
                            {t.origin ?? "—"} → {t.destination ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-300 lg:px-4">
                            {formatDate(t.departure_time)}
                          </td>
                          <td className="px-3 py-3 text-emerald-300/90 lg:px-4">
                            {formatMoney(t.price)}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-400 lg:px-4">
                            {t.plate_number ?? "—"}
                          </td>
                          <td className="px-3 py-3 lg:px-4">
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                              {t.status ?? "scheduled"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
            <Link to={ROUTES.LOGIN} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Sign in to book</Button>
            </Link>
            <Link to={ROUTES.PASSENGER_REGISTER} className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
