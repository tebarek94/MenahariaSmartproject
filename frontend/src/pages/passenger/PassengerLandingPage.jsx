import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { tripsService } from "@/services/trips.service.js";
import { Button } from "@/ui/Button.jsx";
import { Spinner } from "@/ui/Spinner.jsx";
import { ROUTES } from "@/utils/constants.js";
import { formatDate, formatMoney } from "@/utils/format.js";
import { motion, useScroll, useTransform } from "framer-motion";

function normalizeTrips(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

function tripStatusTone(status) {
  const v = String(status ?? "")
    .toLowerCase()
    .trim();
  if (v === "ongoing")
    return "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40";
  if (v === "scheduled")
    return "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/40";
  if (v === "completed")
    return "bg-slate-500/20 text-slate-200 ring-1 ring-slate-500/40";
  if (v === "cancelled")
    return "bg-red-500/20 text-red-200 ring-1 ring-red-500/40";
  return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/35";
}

const IMG = {
  hero: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80&auto=format&fit=crop",
  seats:
    "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80&auto=format&fit=crop",
  cargo:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&auto=format&fit=crop",
  pay: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80&auto=format&fit=crop",
};

export function PassengerLandingPage() {
  const [publicTrips, setPublicTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");
  const [lastFetch, setLastFetch] = useState(null);
  const ref = useRef(null);
  const [activeCard, setActiveCard] = useState(null);
  const featureRef = useRef(null);
  const tripsRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  /* PARALLAX CONTROLS */
  const yBg = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const scaleBg = useTransform(scrollYProgress, [0, 1], [1.1, 1.25]);
  const opacityBeam = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 0.8, 0.8, 0],
  );
  const sectionOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0.4, 1, 1, 0.4],
  );

  const spotlightStrength = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.05, 0.15, 0.05],
  );
  const { scrollYProgress: featureProgress } = useScroll({
    target: featureRef,
    offset: ["0.2 1", "1 0.2"],
  });
  const features = [
    {
      title: "Seat Booking System",
      desc: "Pick a trip, choose an available seat, and get instant confirmation with live availability updates.",
      img: IMG.seats,
      tag: "Passenger",
    },
    {
      title: "Cargo Management",
      desc: "Schedule parcels with trips, track weight, pricing, and live route updates via GPS-enabled drivers.",
      img: IMG.cargo,
      tag: "Logistics",
    },
    {
      title: "Payments & Tickets",
      desc: "Digital tickets, payment tracking, receipts, and full travel history under one account.",
      img: IMG.pay,
      tag: "Finance",
    },
  ];
  const { scrollYProgress: tripsProgress } = useScroll({
    target: tripsRef,
    offset: ["0.2 1", "1 0.2"],
  });
  const tripContainer = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const tripCard = {
    hidden: {
      opacity: 0,
      y: -80,
      scale: 0.96,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 90,
        damping: 14,
      },
    },
  };
  const defaultCardAnimation = {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, amount: 0.2 },
  };
  function getNearestTrips(trips, limit = 3) {
    const now = new Date();

    return [...trips]
      .filter((t) => new Date(t.departure_time) >= now)
      .sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time))
      .slice(0, limit);
  }

  const loadTrips = useCallback(async () => {
    setTripsError("");
    try {
      const raw = await tripsService.browsePublic();
      setPublicTrips(normalizeTrips(raw));
      setLastFetch(new Date());
    } catch (e) {
      setTripsError(
        e?.data?.message || e?.message || "Could not load trips right now.",
      );
      setPublicTrips([]);
    } finally {
      setTripsLoading(false);
    }
  }, []);
  const now = new Date();

  const upcomingTrips = [...publicTrips]
    .filter((t) => new Date(t.departure_time) > now)
    .sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time))
    .slice(0, 10);

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
    <div className="font-poppins">
      <section className="relative min-h-[100svh] overflow-hidden flex items-center">
        {/* ================= BACKGROUND LAYER ================= */}
        <div className="absolute inset-0 z-0">
          {/* BASE IMAGE */}
          <img
            src={IMG.hero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover scale-105 opacity-50"
          />

          {/* PRIMARY DEPTH OVERLAY (keeps image visible but controlled) */}
          <div className="absolute inset-0 bg-slate-950/60" />

          {/* BRAND GRADIENT FIELD (matches other sections exactly) */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(56,189,248,0.14),transparent_60%)]" />

          {/* SOFT VIGNETTE (subtle, no overkill) */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(2,6,23,0.88))]" />

          {/* CONTROLLED GLOW ORBS (reduced intensity for premium feel) */}
          <div className="absolute -top-40 -left-40 w-[480px] h-[480px] bg-emerald-500/15 blur-[140px]" />
          <div className="absolute bottom-[-140px] right-[-140px] w-[480px] h-[480px] bg-sky-500/15 blur-[140px]" />
        </div>

        {/* ================= CONTENT ================= */}
        <div className="relative z-10 mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-14 items-center py-24">
          {/* LEFT: TEXT */}
          <div className="space-y-6">
            {/* SMALL LABEL */}
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs tracking-[0.25em] uppercase text-emerald-300/90">
                Smart transport platform · Ethiopia
              </p>
            </div>

            {/* MAIN HEADLINE */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] text-white">
              Travel Smarter Across{" "}
              <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
                Ethiopia
              </span>
            </h1>

            {/* SUBHEAD */}
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              Book seats, track buses in real time, and manage cargo in one
              unified transport system built for speed, safety, and visibility.
            </p>

            {/* CTA GROUP */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {/* PRIMARY CTA */}
              <Link to={ROUTES.LOGIN} className="w-full sm:w-auto">
                <button
                  className="
            w-full sm:w-auto px-6 py-3 rounded-xl
            text-white text-sm font-medium
            bg-white/5 backdrop-blur-xl
            border border-white/10
            shadow-[0_10px_40px_rgba(16,185,129,0.15)]
            transition-all duration-300
            hover:scale-[1.04]
            hover:border-emerald-400/40
            hover:shadow-[0_25px_80px_rgba(16,185,129,0.25)]
            relative overflow-hidden
          "
                >
                  <span className="relative z-10">Book a Trip</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-transparent opacity-0 hover:opacity-100 transition" />
                </button>
              </Link>

              {/* SECONDARY CTA */}
              <Link to={ROUTES.PASSENGER_REGISTER} className="w-full sm:w-auto">
                <button
                  className="
            w-full sm:w-auto px-6 py-3 rounded-xl
            text-slate-200 text-sm font-medium
            bg-slate-950/30 backdrop-blur-xl
            border border-white/10
            transition-all duration-300
            hover:scale-[1.04]
            hover:text-white
            hover:border-sky-400/40
            hover:shadow-[0_25px_80px_rgba(56,189,248,0.20)]
            relative overflow-hidden
          "
                >
                  <span className="relative z-10">Create account</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-500/15 via-transparent to-emerald-500/10 opacity-0 hover:opacity-100 transition" />
                </button>
              </Link>
            </div>

            {/* SMALL META */}
            <p className="text-xs text-slate-500 pt-2">
              Real-time booking · Live tracking · Secure payments
            </p>
          </div>

          {/* RIGHT: SYSTEM PREVIEW CARD */}
          <div className="flex justify-center md:justify-end">
            <div
              className="
        w-full max-w-md rounded-2xl
        border border-white/10
        bg-white/5 backdrop-blur-xl
        p-6
        shadow-[0_20px_80px_rgba(0,0,0,0.6)]
      "
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-slate-400">Live system preview</p>
                <span className="text-[10px] text-emerald-300 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20">
                  LIVE
                </span>
              </div>

              {getNearestTrips(publicTrips, 3).map((t) => (
                <div
                  key={t.id}
                  className="
      mb-4 p-3 rounded-lg
      bg-white/5 border border-white/5
      relative overflow-hidden group
      transition-all duration-300
      hover:scale-[1.03]
      hover:border-emerald-400/30
      hover:bg-white/10
    "
                >
                  {/* 🔥 GLOW BACKGROUND (on hover) */}
                  <div
                    className="
      absolute inset-0 opacity-0 group-hover:opacity-100
      bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.25),transparent_60%)]
      transition duration-500
    "
                  />

                  {/* 🔥 LIGHT SWEEP EFFECT */}
                  <div
                    className="
      absolute -left-20 top-0 h-full w-20
      bg-gradient-to-r from-transparent via-white/10 to-transparent
      rotate-12
      opacity-0 group-hover:opacity-100
      group-hover:translate-x-[260%]
      transition-all duration-700
    "
                  />

                  {/* CONTENT */}
                  <div className="relative z-10">
                    <div className="flex justify-between text-sm text-white">
                      <span className="truncate">
                        {t.origin} → {t.destination}
                      </span>
                      <span className="text-emerald-400 text-xs">
                        {t.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(t.departure_time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        ref={ref}
        id="whats-new"
        className="relative isolate border-t border-white/10 bg-slate-950 py-24 overflow-hidden"
      >
        {/* BACKGROUND */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.15),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(16,185,129,0.15),transparent_40%)]" />
          <div className="absolute -top-40 -left-40 w-[400px] h-[400px] bg-sky-500/20 blur-[120px]" />
          <div className="absolute bottom-[-120px] right-[-120px] w-[400px] h-[400px] bg-emerald-500/20 blur-[120px]" />
        </div>

        {/* CONTENT */}
        <motion.div
          style={{
            y: useTransform(scrollYProgress, [0, 1], ["0%", "-5%"]),
          }}
          className="relative z-10 mx-auto max-w-7xl xl:max-w-[1400px] px-6 lg:px-10"
        >
          {/* HEADER */}
          <div className="text-center mb-20 relative">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.1]">
              <span className="bg-gradient-to-r from-white via-emerald-50 to-emerald-400 bg-clip-text text-transparent font-semibold">
                What’s New in the System
              </span>
            </h2>

            <p className="mt-5 text-sm sm:text-base text-slate-400/90 max-w-2xl mx-auto leading-relaxed tracking-[0.02em] font-light">
              Modern upgrades designed for trust, safety, and real-time
              passenger visibility.
            </p>

            <div className="mt-6 h-[1px] w-100 mx-auto bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-10 xl:gap-12">
            {[
              {
                title: "Email OTP registration",
                tag: "Signup",
                desc: "Secure verification ensures every passenger account is real and verified.",
              },
              {
                title: "Email sign-in protection",
                tag: "Security",
                desc: "Optional verification adds protection during login and sensitive actions.",
              },
              {
                title: "Live GPS tracking",
                tag: "Cargo",
                desc: "Real-time tracking for shipments when drivers share live location.",
              },
              {
                title: "OpenStreetMap integration",
                tag: "Maps",
                desc: "Free global mapping infrastructure for full system visibility.",
              },
            ].map((item, i) => {
              const start = i * 0.15;
              const end = start + 0.25;

              const opacity = useTransform(
                scrollYProgress,
                [start, end],
                [0, 1],
              );

              const y = useTransform(scrollYProgress, [start, end], [60, 0]);

              const scale = useTransform(
                scrollYProgress,
                [start, end],
                [0.95, 1],
              );

              return (
                <motion.article
                  key={i}
                  onMouseEnter={() => setActiveCard(i)}
                  onMouseLeave={() => setActiveCard(null)}
                  style={{ opacity, y, scale }}
                  className="group relative rounded-3xl p-[1px] overflow-hidden will-change-transform"
                >
                  {/* glowing border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-sky-500/20 opacity-0 group-hover:opacity-100 transition duration-500 blur-xl" />

                  {/* card */}
                  <div className="relative rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 p-8 lg:p-10 transition duration-500 group-hover:-translate-y-5 group-hover:scale-[1.035] group-hover:rotate-[0.3deg] group-hover:bg-white/10 group-hover:border-white/20 group-hover:shadow-[0_30px_120px_rgba(16,185,129,0.25)]">
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-400/20 rounded-full blur-3xl opacity-50 group-hover:scale-[1.8] transition duration-700" />

                    <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/90 font-medium">
                      {item.tag}
                    </p>

                    <h3 className="mt-3 text-[1.2rem] font-semibold text-white tracking-[-0.01em] leading-snug">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-[13.5px] text-slate-300/90 leading-relaxed tracking-[0.01em]">
                      {item.desc}
                    </p>

                    <div className="mt-5 h-[1px] w-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30 group-hover:opacity-100 transition" />
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.div>
      </section>
      <section
        ref={featureRef}
        id="features"
        className="relative isolate border-t border-white/10 bg-slate-950 py-24 overflow-hidden"
      >
        {/* BACKGROUND */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.15),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(16,185,129,0.15),transparent_40%)]" />
          <div className="absolute -top-40 -left-40 w-[400px] h-[400px] bg-sky-500/20 blur-[120px]" />
          <div className="absolute bottom-[-120px] right-[-120px] w-[400px] h-[400px] bg-emerald-500/20 blur-[120px]" />
        </div>

        {/* CONTENT */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
          {/* HEADER */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-white">
              Built for passengers and operators
            </h2>
            <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Everything you need in one system: scheduling, inventory,
              payments, and reporting.
            </p>
            <div className="mt-6 h-[1px] w-200 mx-auto bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((f, i) => {
              const start = i * 0.2;
              const end = start + 0.3;

              const opacity = useTransform(
                featureProgress,
                [start, end],
                [0, 1],
              );
              const y = useTransform(featureProgress, [start, end], [80, 0]);
              const scale = useTransform(
                featureProgress,
                [start, end],
                [0.9, 1],
              );

              return (
                <motion.article
                  key={i}
                  style={{ opacity, y, scale }}
                  className="group relative rounded-3xl overflow-hidden p-[1px]"
                >
                  {/* glow border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 via-transparent to-emerald-500/20 opacity-0 group-hover:opacity-100 blur-xl transition duration-500" />

                  {/* card */}
                  <div
                    className="
              relative bg-white/5 backdrop-blur-2xl border border-white/10
              rounded-3xl overflow-hidden
              transition duration-500
              group-hover:-translate-y-3
              group-hover:scale-[1.03]
              group-hover:bg-white/10
              group-hover:border-white/20
              group-hover:shadow-[0_25px_100px_rgba(56,189,248,0.15)]
            "
                  >
                    {/* IMAGE */}
                    <img
                      src={f.img}
                      alt={f.title}
                      className="h-44 w-full object-cover"
                    />

                    {/* TEXT */}
                    <div className="p-6">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-sky-300">
                        {f.tag}
                      </p>

                      <h3 className="mt-2 text-lg font-semibold text-white">
                        {f.title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        ref={tripsRef}
        id="trips"
        className="relative isolate border-t border-white/10 bg-slate-950 py-24 overflow-hidden"
      >
        {/* BACKGROUND */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.15),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(16,185,129,0.15),transparent_40%)]" />

          <div className="absolute -top-40 -left-40 w-[400px] h-[400px] bg-sky-500/20 blur-[120px]" />
          <div className="absolute bottom-[-120px] right-[-120px] w-[400px] h-[400px] bg-emerald-500/20 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
          {/* HEADER */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-white">
              Upcoming departures
            </h2>

            <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Live list from the system — updated in real time.
            </p>

            <div className="mt-6 h-[2px] w-200 mx-auto bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
          </div>

          {/* ACTION BAR */}
          <div className="flex justify-between items-center mb-10">
            <p className="text-xs text-slate-500">
              Auto-updating every 45 seconds
            </p>

            <button
              onClick={loadTrips}
              className="
          relative px-4 py-2 text-xs font-medium text-white
          rounded-xl border border-white/10
          bg-white/5 backdrop-blur-xl
          shadow-[0_10px_30px_rgba(16,185,129,0.15)]
          
          hover:border-emerald-400/40
          hover:shadow-[0_20px_60px_rgba(16,185,129,0.25)]
          overflow-hidden
        "
            >
              <span className="relative z-10">Refresh now</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent opacity-0 hover:opacity-100 transition" />
            </button>
          </div>

          {/* ERROR */}
          {tripsError && (
            <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              {tripsError}
            </p>
          )}

          {/* LOADING */}
          {tripsLoading ? (
            <div className="flex justify-center py-20 border border-white/10 rounded-2xl bg-white/5">
              <Spinner />
            </div>
          ) : upcomingTrips.length === 0 ? (
            <div className="text-center py-20 border border-white/10 rounded-2xl bg-white/5 text-slate-500">
              No scheduled trips right now. Check back soon.
            </div>
          ) : (
            /* NETFLIX DROP GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {upcomingTrips.map((t, i) => (
                <motion.article
                  initial={defaultCardAnimation.initial}
                  whileInView={defaultCardAnimation.whileInView}
                  viewport={defaultCardAnimation.viewport}
                  transition={{
                    duration: 0.45,
                    delay: i * 0.09,
                    ease: "easeOut",
                  }}
                  whileHover={{
                    y: -12,
                    scale: 1.06,
                    transition: { duration: 0.25 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="
              group relative overflow-hidden rounded-3xl
              border border-white/10 bg-white/5 backdrop-blur-xl
              transition-all duration-500
              hover:scale-[1.05]
              hover:-translate-y-2
              hover:border-emerald-400/40
              hover:shadow-[0_35px_120px_rgba(16,185,129,0.25)]
            "
                >
                  {/* NETFLIX EDGE LINE */}
                  <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-emerald-400 via-sky-400 to-transparent opacity-70" />

                  {/* GLOW LAYER */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10 opacity-80" />

                  <div className="relative p-6">
                    {/* TITLE */}
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="text-white font-semibold text-lg leading-snug group-hover:text-emerald-100 transition">
                        {t.origin ?? "—"} → {t.destination ?? "—"}
                      </h3>

                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 capitalize">
                        {t.status ?? "scheduled"}
                      </span>
                    </div>

                    {/* META */}
                    <div className="mt-5 space-y-3 text-sm text-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs uppercase">
                          Departure
                        </span>
                        <span className="text-white">
                          {formatDate(t.departure_time)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-emerald-300 text-xs uppercase">
                          Price
                        </span>
                        <span className="font-semibold text-emerald-300">
                          {formatMoney(t.price)}
                        </span>
                      </div>

                      <div className="font-mono text-xs text-slate-400 bg-white/5 px-3 py-2 rounded-lg">
                        {t.plate_number ?? "—"}
                      </div>
                    </div>

                    {/* BUTTON */}
                    <Link
                      to={`${ROUTES.TRIP_DETAILS}/${t.id}`}
                      state={{ trip: t }}
                    >
                      <button
                        className="
                    mt-5 w-full relative overflow-hidden
                    px-4 py-2 rounded-xl
                    border border-white/10
                    bg-white/5 backdrop-blur-xl
                    text-white text-sm font-medium
                    transition-all duration-300
                    hover:scale-[1.03]
                    hover:border-emerald-400/40
                    hover:shadow-[0_15px_50px_rgba(16,185,129,0.25)]
                  "
                      >
                        <span className="relative z-10">View Details</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent opacity-0 hover:opacity-100 transition" />
                      </button>
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
            <Link to={ROUTES.LOGIN} className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-6 py-3 rounded-xl text-white text-sm font-medium border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_40px_rgba(16,185,129,0.15)] transition-all duration-300 hover:scale-[1.05] hover:border-emerald-400/40 hover:shadow-[0_20px_70px_rgba(16,185,129,0.25)] relative overflow-hidden">
                <span className="relative z-10">Sign in to book</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent opacity-0 hover:opacity-100 transition" />
              </button>
            </Link>

            <Link to={ROUTES.PASSENGER_REGISTER} className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-6 py-3 rounded-xl text-slate-200 text-sm font-medium border border-white/10 bg-slate-950/30 backdrop-blur-xl transition-all duration-300 hover:scale-[1.05] hover:text-white hover:border-sky-400/40 hover:shadow-[0_20px_70px_rgba(56,189,248,0.20)] relative overflow-hidden">
                <span className="relative z-10">Create account</span>
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-transparent to-emerald-500/10 opacity-0 hover:opacity-100 transition" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
