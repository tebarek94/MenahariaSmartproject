import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/ui/Button.jsx";
import { ROUTES } from "@/utils/constants.js";

export function LandingLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden bg-slate-950 text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:h-16 sm:gap-4 sm:px-4 sm:py-0">
          <Link
            to="/"
            className="min-w-0 pr-2 text-sm font-semibold leading-snug tracking-tight text-white sm:text-lg"
            onClick={closeMobileMenu}
          >
            Menahariya <span className="text-emerald-400">Smart</span>
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-slate-900/70 text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? (
              <span className="text-lg leading-none">×</span>
            ) : (
              <span className="text-lg leading-none">☰</span>
            )}
          </button>

          <nav className="hidden shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:flex md:gap-3">
            <a
              href="#trips"
              className="whitespace-nowrap text-xs text-slate-400 hover:text-emerald-300 transition sm:text-sm"
            >
              Trips
            </a>
            <a
              href="#whats-new"
              className="whitespace-nowrap text-xs text-slate-400 hover:text-emerald-300 transition sm:text-sm"
            >
              What&apos;s new
            </a>
            <a
              href="#features"
              className="whitespace-nowrap text-xs text-slate-400 hover:text-emerald-300 transition sm:text-sm"
            >
              Features
            </a>
            <Link to={ROUTES.PASSENGER_REGISTER}>
              <Button
                variant="ghost"
                className="
    !px-2.5 !py-1.5 !text-[11px] sm:!px-3 sm:!text-xs
    bg-white/5 backdrop-blur-xl
    border border-white/10
    text-slate-200
    hover:text-white
    hover:border-sky-400/40
    hover:shadow-[0_10px_40px_rgba(56,189,248,0.25)]
    hover:scale-[1.04]
    transition-all duration-300
  "
              >
                Register
              </Button>
            </Link>
            <Link to={ROUTES.LOGIN}>
              <Button
                className="
    !px-2.5 !py-1.5 !text-[11px] sm:!px-3 sm:!text-xs
    bg-white/5 backdrop-blur-xl
    border border-white/10
    text-white
    hover:border-emerald-400/40
    hover:shadow-[0_10px_40px_rgba(16,185,129,0.25)]
    hover:scale-[1.04]
    transition-all duration-300
  "
              >
                Sign in
              </Button>
            </Link>
          </nav>
        </div>

        <div
          id="landing-mobile-menu"
          className={`mx-auto w-full max-w-6xl px-3 pb-3 transition-all duration-200 sm:px-4 md:hidden ${
            mobileMenuOpen
              ? "max-h-[28rem] opacity-100"
              : "pointer-events-none max-h-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="rounded-xl border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <a
                href="#trips"
                onClick={closeMobileMenu}
                className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-emerald-300"
              >
                Trips
              </a>
              <a
                href="#whats-new"
                onClick={closeMobileMenu}
                className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-emerald-300"
              >
                What&apos;s new
              </a>
              <a
                href="#features"
                onClick={closeMobileMenu}
                className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-emerald-300"
              >
                Features
              </a>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Link to={ROUTES.PASSENGER_REGISTER} onClick={closeMobileMenu}>
                <Button
                  variant="ghost"
                  className="w-full
    bg-white/5 backdrop-blur-xl
    border border-white/10
    text-slate-200
    hover:text-white
    hover:border-sky-400/40
    transition"
                >
                  Register
                </Button>
              </Link>
              <Link to={ROUTES.LOGIN} onClick={closeMobileMenu}>
                <Button
                  className="w-full
    bg-white/5 backdrop-blur-xl
    border border-white/10
    text-white
    hover:border-emerald-400/40
    hover:shadow-[0_10px_40px_rgba(16,185,129,0.25)]
    transition"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 pt-14 sm:pt-16">{children ?? <Outlet />}</main>
      <footer className="mt-auto border-t border-white/10 bg-slate-950/60 backdrop-blur-xl relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-3 py-10 sm:px-4 sm:py-12 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 lg:gap-8">
            <div className="text-center sm:col-span-2 sm:text-left lg:col-span-1">
              <Link
                to="/"
                className="text-lg font-semibold tracking-tight text-white"
              >
                Menahariya <span className="text-emerald-400">Smart</span>
              </Link>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-400 sm:mx-0">
                Book bus seats, pay online, use QR boarding, and track cargo on
                scheduled routes across Ethiopia.
              </p>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Passengers
              </h3>
              <ul className="mx-auto mt-4 inline-block space-y-3 text-left text-sm sm:mx-0">
                <li>
                  <Link
                    to={ROUTES.PASSENGER_REGISTER}
                    className="text-slate-300 transition hover:text-emerald-400"
                  >
                    Create account
                  </Link>
                </li>
                <li>
                  <Link
                    to={ROUTES.LOGIN}
                    className="text-slate-300 transition hover:text-emerald-400"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <a
                    href="#trips"
                    className="text-slate-300 transition hover:text-emerald-400"
                  >
                    Upcoming trips
                  </a>
                </li>
                <li>
                  <a
                    href="#whats-new"
                    className="text-slate-300 transition hover:text-emerald-400"
                  >
                    What&apos;s new
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="text-slate-300 transition hover:text-emerald-400"
                  >
                    Features
                  </a>
                </li>
              </ul>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Product
              </h3>
              <ul className="mx-auto mt-4 inline-block space-y-3 text-left text-sm text-slate-400 sm:mx-0">
                <li>Seat booking &amp; pricing</li>
                <li>Chapa payments</li>
                <li>Digital tickets &amp; QR</li>
                <li>Cargo on trips &amp; live map</li>
                <li>Email OTP signup &amp; optional 2FA</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} Menahariya Smart Transport System.
              All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
