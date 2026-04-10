import { Link, Outlet } from "react-router-dom";
import { Button } from "@/ui/Button.jsx";
import { ROUTES } from "@/utils/constants.js";

export function LandingLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-white"
          >
            Menahariya <span className="text-emerald-400">Smart</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <a
              href="#trips"
              className="hidden text-sm text-slate-400 hover:text-white sm:inline"
            >
              Trips
            </a>
            <a
              href="#features"
              className="hidden text-sm text-slate-400 hover:text-white md:inline"
            >
              Features
            </a>
            <Link to={ROUTES.PASSENGER_REGISTER}>
              <Button variant="ghost" className="!py-1.5 !text-xs">
                Register
              </Button>
            </Link>
            <Link to={ROUTES.LOGIN}>
              <Button className="!py-1.5 !text-xs">Sign in</Button>
            </Link>
          </nav>
        </div>
      </header>
      {children ?? <Outlet />}
      <footer className="mt-auto border-t border-white/10 py-8 text-center text-xs text-slate-500">
        <p>
          Menahariya Smart · Book bus seats, track tickets, and ship cargo in
          one place.
        </p>
        <p className="mt-1">
          <Link to={ROUTES.DRIVER_LOGIN} className="text-slate-400 hover:text-white">
            Driver portal
          </Link>
        </p>
      </footer>
    </div>
  );
}
