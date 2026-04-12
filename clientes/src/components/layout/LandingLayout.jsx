import { Link, Outlet } from "react-router-dom";
import { Button } from "@/ui/Button.jsx";
import { ROUTES } from "@/utils/constants.js";

export function LandingLayout({ children }) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:h-16 sm:gap-4 sm:px-4 sm:py-0">
          <Link
            to="/"
            className="min-w-0 pr-2 text-sm font-semibold leading-snug tracking-tight text-white sm:text-lg"
          >
            Menahariya <span className="text-emerald-400">Smart</span>
          </Link>
          <nav className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
            <a
              href="#trips"
              className="whitespace-nowrap text-xs text-slate-400 hover:text-white sm:text-sm"
            >
              Trips
            </a>
            <a
              href="#whats-new"
              className="whitespace-nowrap text-xs text-slate-400 hover:text-white sm:text-sm"
            >
              What&apos;s new
            </a>
            <a
              href="#features"
              className="whitespace-nowrap text-xs text-slate-400 hover:text-white sm:text-sm"
            >
              Features
            </a>
            <Link to={ROUTES.PASSENGER_REGISTER}>
              <Button variant="ghost" className="!px-2.5 !py-1.5 !text-[11px] sm:!px-3 sm:!text-xs">
                Register
              </Button>
            </Link>
            <Link to={ROUTES.LOGIN}>
              <Button className="!px-2.5 !py-1.5 !text-[11px] sm:!px-3 sm:!text-xs">
                Sign in
              </Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children ?? <Outlet />}</main>
      <footer className="mt-auto border-t border-white/10 bg-slate-900/40">
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
              © {new Date().getFullYear()} Menahariya Smart Transport System. All
              rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
